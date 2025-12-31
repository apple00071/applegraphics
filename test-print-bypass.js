/**
 * Test Print - A4 Auto Select (should trigger bypass if loaded)
 */

import ipp from 'ipp';
import PDFDocument from 'pdfkit';

const PRINTER_IP = '192.168.1.123';
const PRINTER_URL = `http://${PRINTER_IP}:631/ipp`;

console.log('===========================================');
console.log('  PDF Test Print - A4 Auto');
console.log('===========================================\n');
console.log('Please load A4 paper in the BYPASS TRAY before proceeding.\n');

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
doc.fontSize(72).font('Helvetica-Bold').text('TEST', 150, 200);
doc.fontSize(48).text('PRINT', 150, 300);
doc.fontSize(24).font('Helvetica');
doc.text('', 100, 420);
doc.text('Apple Graphics Inventory System');
doc.text(`Date: ${new Date().toLocaleString()}`);
doc.text('Media: A4 Auto-Select');
doc.text('');
doc.fontSize(18);
doc.text('If you see this, printing is working!');

doc.end();

function sendToPrinter(pdfData) {
    console.log(`\nPrinter: ${PRINTER_URL}`);
    console.log('Media: iso_a4_210x297mm-auto');
    console.log('Sending...\n');

    const printer = ipp.Printer(PRINTER_URL);

    const msg = {
        'operation-attributes-tag': {
            'requesting-user-name': 'AppleGraphics',
            'job-name': 'A4 Auto Test Print',
            'document-format': 'application/pdf'
        },
        'job-attributes-tag': {
            'media': 'iso_a4_210x297mm-auto',
            'copies': 1
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
            console.log('\n✅ Job sent! Check printer.');
        } else {
            console.log('\n⚠️ Response:', JSON.stringify(res, null, 2));
        }
    });
}
