/**
 * Test Print with PDF - Tray 2
 * Creates a proper PDF and sends it to the printer
 */

import ipp from 'ipp';
import PDFDocument from 'pdfkit';

const PRINTER_IP = '192.168.1.123';
const PRINTER_URL = `http://${PRINTER_IP}:631/ipp`;

console.log('===========================================');
console.log('  Creating PDF and Sending to Tray 2');
console.log('===========================================\n');

// Create PDF in memory
const doc = new PDFDocument({ size: 'A4' });
const chunks = [];

doc.on('data', chunk => chunks.push(chunk));
doc.on('end', () => {
    const pdfBuffer = Buffer.concat(chunks);
    console.log(`PDF created: ${pdfBuffer.length} bytes\n`);
    sendToPrinter(pdfBuffer);
});

// Add content to PDF
doc.fontSize(48).font('Helvetica-Bold').text('TEST PRINT', 100, 100);
doc.fontSize(24).font('Helvetica');
doc.text('', 100, 200);
doc.text('From: Apple Graphics Inventory System');
doc.text(`Date: ${new Date().toLocaleString()}`);
doc.text('Tray: Tray 2');
doc.text('');
doc.fontSize(18).text('Integration Test Successful!');
doc.text('');
doc.fontSize(14).text('This is a test print from your software.');
doc.text('If you can see this, the Konica Minolta integration is working!');

doc.end();

function sendToPrinter(pdfData) {
    console.log(`Printer URL: ${PRINTER_URL}`);
    console.log('Sending PDF...\n');

    const printer = ipp.Printer(PRINTER_URL);

    const msg = {
        'operation-attributes-tag': {
            'requesting-user-name': 'AppleGraphics',
            'job-name': 'PDF Test Print - Tray 2',
            'document-format': 'application/pdf'
        },
        'job-attributes-tag': {
            'copies': 1
        },
        data: pdfData
    };

    printer.execute('Print-Job', msg, (err, res) => {
        if (err) {
            console.log('❌ Print FAILED!');
            console.log('Error:', err.message || err);
            return;
        }

        console.log('Response Status:', res.statusCode);

        if (res.statusCode === 'successful-ok' || res.statusCode === 'successful-ok-ignored-or-substituted-attributes') {
            console.log('\n✅ PDF Print job sent successfully!');
            const jobAttrs = res['job-attributes-tag'];
            if (jobAttrs) {
                console.log(`Job ID: ${jobAttrs['job-id']}`);
                console.log(`Job State: ${jobAttrs['job-state']}`);
            }
            console.log('\n📄 Check the printer for output!');
        } else {
            console.log('\n⚠️ Status:', res.statusCode);
            console.log(JSON.stringify(res, null, 2));
        }
    });
}
