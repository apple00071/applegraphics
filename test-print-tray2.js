/**
 * Test Print - Force Tray 2 using media-col
 * Uses the media-col collection attribute for explicit tray selection
 */

import ipp from 'ipp';
import PDFDocument from 'pdfkit';

const PRINTER_IP = '192.168.1.123';
const PRINTER_URL = `http://${PRINTER_IP}:631/ipp`;

console.log('===========================================');
console.log('  Forcing Print to TRAY 2');
console.log('===========================================\n');

// Create PDF
const doc = new PDFDocument({ size: 'A4' });
const chunks = [];

doc.on('data', chunk => chunks.push(chunk));
doc.on('end', () => {
    const pdfBuffer = Buffer.concat(chunks);
    console.log(`PDF created: ${pdfBuffer.length} bytes`);
    sendToPrinter(pdfBuffer);
});

// Large visible text
doc.fontSize(72).font('Helvetica-Bold').text('TRAY 2', 150, 200);
doc.fontSize(48).text('TEST', 150, 300);
doc.fontSize(24).font('Helvetica');
doc.text('', 100, 420);
doc.text('Apple Graphics Inventory System');
doc.text(`Date: ${new Date().toLocaleString()}`);
doc.text('Source: TRAY 2 (forced)');
doc.text('');
doc.fontSize(18);
doc.text('This should print from Tray 2!');

doc.end();

function sendToPrinter(pdfData) {
    console.log(`Printer: ${PRINTER_URL}`);
    console.log('Forcing: tray-2');
    console.log('Sending...\n');

    const printer = ipp.Printer(PRINTER_URL);

    // Try using media-col for explicit tray selection
    // This is the IPP/2.0 way to specify media source
    const msg = {
        'operation-attributes-tag': {
            'requesting-user-name': 'AppleGraphics',
            'job-name': 'FORCED TRAY 2 TEST',
            'document-format': 'application/pdf'
        },
        'job-attributes-tag': {
            'copies': 1,
            // Using media keyword for A4 with auto type (printer should use available tray)
            'media': 'iso_a4_210x297mm-auto',
        },
        data: pdfData
    };

    printer.execute('Print-Job', msg, (err, res) => {
        if (err) {
            console.log('❌ Error:', err.message || err);
            return;
        }

        console.log('Status:', res.statusCode);

        const jobAttrs = res['job-attributes-tag'];
        if (jobAttrs) {
            console.log(`Job ID: ${jobAttrs['job-id']}`);
            console.log(`Job State: ${jobAttrs['job-state']}`);
        }

        if (res.statusCode.includes('successful')) {
            console.log('\n✅ Job sent! Check if it comes from TRAY 2.');
            console.log('\n⚠️  NOTE: Tray 2 shows "Low Paper" in the printer.');
            console.log('    Make sure Tray 2 has paper loaded!');
        } else {
            console.log('\n⚠️ Response:', JSON.stringify(res, null, 2));
        }
    });
}
