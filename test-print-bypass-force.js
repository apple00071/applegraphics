
/**
 * Test Print - FORCE BYPASS TRAY
 * Uses explicit media-source attribute
 */

import ipp from 'ipp';
import PDFDocument from 'pdfkit';

const PRINTER_IP = '192.168.1.123';
const PRINTER_URL = `http://${PRINTER_IP}:631/ipp`;

console.log('===========================================');
console.log('  FORCE TEST - BYPASS TRAY');
console.log('===========================================\n');
console.log('Attempting to force "bypass-tray" selection...\n');

// Create PDF 13x19
const doc = new PDFDocument({
    size: [936, 1368]  // 13x19 inches
});
const chunks = [];

doc.on('data', chunk => chunks.push(chunk));
doc.on('end', () => {
    const pdfBuffer = Buffer.concat(chunks);
    console.log(`PDF created: ${pdfBuffer.length} bytes`);
    sendToPrinter(pdfBuffer);
});

doc.fontSize(72).text('FORCE BYPASS', 100, 300);
doc.fontSize(36).text('Media Source: bypass-tray', 100, 450);
doc.text(new Date().toLocaleString(), 100, 500);
doc.end();

function sendToPrinter(pdfData) {
    const printer = ipp.Printer(PRINTER_URL);

    const msg = {
        'operation-attributes-tag': {
            'requesting-user-name': 'AppleGraphics',
            'job-name': 'FORCE BYPASS TEST',
            'document-format': 'application/pdf'
        },
        'job-attributes-tag': {
            'copies': 1,
            'media-col': {
                'media-source': 'bypass-tray'
            }
        },
        data: pdfData
    };

    // Note: Some printers require media-col for this
    /*
    msg['job-attributes-tag']['media-col'] = {
        'media-source': 'bypass-tray'
    };
    */

    printer.execute('Print-Job', msg, (err, res) => {
        if (err) {
            console.log('❌ Error:', err);
            return;
        }
        console.log('Status:', res.statusCode);
        if (res.statusCode === 'successful-ok') {
            console.log('✅ Job sent successfully.');
        } else {
            console.log('Response:', JSON.stringify(res, null, 2));
        }
    });
}
