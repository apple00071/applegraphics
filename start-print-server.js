
import { createClient } from '@supabase/supabase-js';
import ipp from 'ipp';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

// Configuration
// Using /ipp as verified by bypass tests.
const PRINTER_URL = 'http://192.168.1.123:631/ipp';
const POLL_INTERVAL_MS = 5000;
const TEMP_DIR = './temp_downloads';

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || 'https://ucgmfqxtwfqbsphmmgrn.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.REACT_APP_SUPABASE_KEY;

if (!supabaseKey) { console.error("❌ Error: SUPABASE_KEY missing"); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

console.log('🚀 Print Server Started (Advanced Media Logic)');
console.log(`   Printer: ${PRINTER_URL}`);
console.log(`   Watching: ${supabaseUrl}`);

async function processQueue() {
    try {
        process.stdout.write('.');

        // Fetch queued job
        const { data: job, error } = await supabase
            .from('print_jobs')
            .select('*')
            .eq('status', 'queued')
            .order('submitted_at', { ascending: true })
            .limit(1)
            .single();

        if (error) {
            if (error.code !== 'PGRST116') console.error('\n   ⚠️ Database Error:', error.message);
            return;
        }
        if (!job) return;

        console.log(`\n\n📄 PROCESSING JOB #${job.id}: ${job.job_name}`);

        // 1. Mark as Printing
        await supabase.from('print_jobs').update({ status: 'printing', started_printing_at: new Date() }).eq('id', job.id);

        // 2. Fetch Tray Details for advanced Media-Col
        let trayWeight = 0;
        let trayType = 'plain';
        if (job.tray_requested) {
            // Try to match tray name in DB to get exact weight/type currently loaded
            const { data: trayData } = await supabase
                .from('printer_trays')
                .select('paper_weight, paper_type')
                .eq('tray_name', job.tray_requested)
                .single();

            if (trayData) {
                // Parse weight string "300 g/m²" -> 300
                const w = parseInt((trayData.paper_weight || '').replace(/[^0-9]/g, ''));
                if (!isNaN(w) && w > 0) trayWeight = w;

                // Normalize type
                trayType = (trayData.paper_type || 'plain').toLowerCase();
            }
        }

        // 3. Download File
        if (!job.file_path) {
            console.error('   ❌ No file path');
            await supabase.from('print_jobs').update({ status: 'error', error_message: 'Missing file path' }).eq('id', job.id);
            return;
        }

        console.log(`   ⬇️ Downloading: ${job.file_path}...`);
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('print-jobs')
            .download(job.file_path);

        if (downloadError) {
            console.error('Download error:', downloadError);
            await supabase.from('print_jobs').update({ status: 'error', error_message: 'Download failed' }).eq('id', job.id);
            return;
        }

        let buffer = Buffer.from(await fileData.arrayBuffer());
        let documentFormat = 'application/pdf';

        // 4. Convert Images OR Count Pages
        const ext = path.extname(job.file_path).toLowerCase();

        if (['.png', '.jpg', '.jpeg'].includes(ext)) {
            console.log(`   🔄 Converting ${ext} to PDF...`);
            try {
                const PDFDocument = (await import('pdfkit')).default;
                const doc = new PDFDocument({ autoFirstPage: true, size: 'A4' });
                const pdfPath = path.join(TEMP_DIR, `${job.id}_converted.pdf`);
                const stream = fs.createWriteStream(pdfPath);
                doc.pipe(stream);
                doc.image(buffer, 0, 0, { fit: [595.28, 841.89], align: 'center', valign: 'center' });
                doc.end();
                await new Promise((resolve, reject) => { stream.on('finish', resolve); stream.on('error', reject); });
                buffer = fs.readFileSync(pdfPath);
                fs.unlinkSync(pdfPath);
            } catch (e) {
                await supabase.from('print_jobs').update({ status: 'error', error_message: 'Conversion failed: ' + e.message }).eq('id', job.id);
                return;
            }
        } else if (ext === '.pdf') {
            try {
                // Count real pages
                const pdfParse = (await import('pdf-parse')).default;
                const data = await pdfParse(buffer);
                const realPageCount = data.numpages;
                if (realPageCount && realPageCount > 0) {
                    console.log(`   📄 Validated PDF Page Count: ${realPageCount}`);
                    // Update DB with REAL count
                    await supabase.from('print_jobs').update({ total_pages: realPageCount }).eq('id', job.id);
                }
            } catch (e) {
                console.error('   ⚠️ Failed to count PDF pages:', e.message);
                // Non-critical, just keep the estimate
            }
        }

        // 5. Construct Advanced Media-Col Attributes
        const trayLower = (job.tray_requested || '').toLowerCase();
        let mediaSource = 'auto'; // Default
        if (trayLower.includes('tray 1')) mediaSource = 'tray-1';
        else if (trayLower.includes('tray 2')) mediaSource = 'tray-2';
        else if (trayLower.includes('tray 3')) mediaSource = 'tray-3';
        else if (trayLower.includes('bypass')) mediaSource = 'bypass-tray';

        console.log(`   🖨️ Configuration: Source=${mediaSource}, Type=${trayType}, Weight=${trayWeight}`);

        // Base attributes
        const attributes = {
            'operation-attributes-tag': {
                'requesting-user-name': job.submitted_by || 'PrintServer',
                'job-name': job.job_name,
                'document-format': documentFormat
            },
            'job-attributes-tag': {
                'copies': job.copies || 1,
                'sides': job.duplex ? 'two-sided-long-edge' : 'one-sided',
                // ADVANCED MEDIA COLLECTION
                'media-col': {
                    'media-source': mediaSource,
                    'media-type': trayType, // e.g., 'coated', 'plain'
                }
            }
        };

        // Add weight if available (Fiery/Konica uses media-weight-metric in g/m2)
        if (trayWeight > 0) {
            attributes['job-attributes-tag']['media-col']['media-weight-metric'] = trayWeight;
        }

        const printer = ipp.Printer(PRINTER_URL);
        const msg = {
            'operation-attributes-tag': attributes['operation-attributes-tag'],
            'job-attributes-tag': attributes['job-attributes-tag'],
            data: buffer
        };

        printer.execute("Print-Job", msg, async (err, res) => {
            if (err) {
                console.error('   ❌ IPP Error:', err);
                await supabase.from('print_jobs').update({ status: 'error', error_message: 'IPP Error: ' + err.message }).eq('id', job.id);
            } else {
                console.log('   ✅ Printer Response:', res.statusCode);
                if (res.statusCode === 'successful-ok' || res.statusCode === 'successful-ok-ignored-or-substituted-attributes') {
                    await supabase.from('print_jobs').update({
                        status: 'completed',
                        completed_at: new Date(),
                        ipp_job_id: res['job-attributes-tag']?.['job-id']
                    }).eq('id', job.id);
                } else {
                    await supabase.from('print_jobs').update({ status: 'error', error_message: `IPP Status: ${res.statusCode}` }).eq('id', job.id);
                }
            }
        });

    } catch (e) {
        console.error('\n   ❌ Critical Error:', e);
    }
}


// ---------------------------------------------------------
// TRAY SYNC LOGIC
// ---------------------------------------------------------

async function syncTrayStatus() {
    try {
        console.log('   🔄 Syncing Tray Status...');
        const printer = ipp.Printer(PRINTER_URL);
        const msg = {
            'operation-attributes-tag': {
                'requesting-user-name': 'PrintServer',
                'attributes-charset': 'utf-8',
                'attributes-natural-language': 'en'
            },
            'requested-attributes': ['printer-input-tray', 'media-col-ready'] // Try both
        };

        printer.execute("Get-Printer-Attributes", msg, async (err, res) => {
            if (err) {
                console.error('   ⚠️ Tray Sync Failed (IPP Error):', err.message);
                return;
            }

            const attrs = res['printer-attributes-tag'];
            if (!attrs) return;

            // Strategy: Access printer-input-tray (standard) or parse media-col-ready
            // Konica Minolta often uses media-col-ready for detailed info.

            // For now, let's look for standard input trays.
            // Example format: "Tray 1: A4 Plain" (This varies wildly by vendor, so we need to be careful)
            // But we can check media-ready for loaded papers.

            // Since parsing vendor strings blindly is dangerous, I will implement a 
            // "Discovery Mode" log first.
            // console.log('   📝 Tray Data Discovered:', JSON.stringify(attrs['printer-input-tray'] || 'No input-tray', null, 2));

            // Implementation Plan:
            // 1. We know the 4 trays: Tray 1, Tray 2, Tray 3, Bypass
            // 2. We try to find "media-col-ready" entries that match these sources.

            const mediaCol = attrs['media-col-ready'];
            if (Array.isArray(mediaCol)) {
                console.log(`   ✅ Found ${mediaCol.length} media definitions.`);

                for (const media of mediaCol) {
                    const source = media['media-source']; // e.g., 'tray-1', 'bypass-tray'
                    const type = media['media-type'];     // e.g., 'plain', 'coated'
                    const weight = media['media-weight-metric']; // e.g., 80
                    // Sizes are complex (media-size: { x-dimension: 21000, y-dimension: 29700 })

                    if (source) {
                        let trayName = '';
                        let trayNum = 0;

                        if (source === 'tray-1') { trayName = 'Tray 1'; trayNum = 1; }
                        else if (source === 'tray-2') { trayName = 'Tray 2'; trayNum = 2; }
                        else if (source === 'tray-3') { trayName = 'Tray 3'; trayNum = 3; }
                        else if (source.includes('bypass')) { trayName = 'Bypass'; trayNum = 4; } // Convention

                        if (trayName) {
                            // Update DB
                            const updates = {
                                paper_type: type || 'Plain',
                                paper_weight: weight ? `${weight}gsm` : undefined,
                                // Simplify size detection if possible, or skip
                                updated_at: new Date()
                            };

                            // console.log(`   Updating ${trayName}:`, updates);

                            const { error } = await supabase
                                .from('printer_trays')
                                .update(updates)
                                .eq('tray_name', trayName); // Match by name (fragile but standard for this app)

                            if (error) console.error(`   Failed to update ${trayName}:`, error.message);
                        }
                    }
                }
                console.log('   ✅ Trays synced with Database.');
            } else {
                // Fallback or just log
                // console.log('   ⚠️ No detailed media-col-ready found.');
            }
        });
    } catch (e) {
        console.error('   ❌ Sync Error:', e);
    }
}

// Start Sync Loop (Every 60s)
setInterval(syncTrayStatus, 60000);
// Run once immediately after a short delay
setTimeout(syncTrayStatus, 5000);

// Polling Loop for Jobs
setInterval(processQueue, POLL_INTERVAL_MS);
processQueue();
