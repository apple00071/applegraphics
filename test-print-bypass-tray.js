/**
 * Test Print - Bypass Tray
 * Targets the bypass tray with 13x19 coated paper
 */

import ipp from 'ipp';
import PDFDocument from 'pdfkit';

const PRINTER_IP = '192.168.1.123';
const PRINTER_URL = `http://${PRINTER_IP}:631/ipp`;

console.log('===========================================');
console.log('  Test Print - BYPASS TRAY');
console.log('===========================================\n');
console.log('NOTE: Bypass currently has 13x19 Coated G paper');
console.log('      If you want A4, please load A4 in bypass first!\n');

// Create PDF with 13x19 size (330.2 x 482.6 mm)
// 13x19 inches = 936 x 1368 points
const doc = new PDFDocument({
    size: [936, 1368]  // 13x19 inches in points
});
const chunks = [];

doc.on('data', chunk => chunks.push(chunk));
doc.on('end', () => {
    const pdfBuffer = Buffer.concat(chunks);
    console.log(`PDF created: ${pdfBuffer.length} bytes (13x19 format)`);
    sendToPrinter(pdfBuffer);
});

// Large visible text for 13x19
doc.fontSize(96).font('Helvetica-Bold').text('BYPASS', 200, 300);
doc.fontSize(72).text('TRAY TEST', 200, 450);
doc.fontSize(36).font('Helvetica');
doc.text('', 150, 650);
doc.text('Apple Graphics Inventory System');
doc.text(`Date: ${new Date().toLocaleString()}`);
doc.text('Paper: 13x19 Coated G');
doc.text('Source: Bypass Tray');
doc.text('');
doc.fontSize(24);
doc.text('This should print from the BYPASS TRAY!');

doc.end();

function sendToPrinter(pdfData) {
    console.log(`Printer: ${PRINTER_URL}`);
    console.log('Sending 13x19 job to bypass...\n');

    const printer = ipp.Printer(PRINTER_URL);

    const msg = {
        'operation-attributes-tag': {
            'requesting-user-name': 'AppleGraphics',
            'job-name': 'BYPASS TRAY TEST - 13x19',
            'document-format': 'application/pdf'
        },
        'job-attributes-tag': {
            'copies': 1,
            // Using coated paper type which should match bypass tray
            'media': 'custom_max_330.2x482.6mm-custom-media-type-coated-papergl',
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
            console.log('\n✅ Job sent! Should print from BYPASS TRAY.');
        } else {
            console.log('\n⚠️ Response:', JSON.stringify(res, null, 2));
        }
    });
}
