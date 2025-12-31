/**
 * Query Konica Minolta printer for supported media sources and attributes
 * This will help us find the correct way to select Tray 2
 */

import ipp from 'ipp';

const PRINTER_IP = '192.168.1.123';
const PRINTER_URL = `http://${PRINTER_IP}:631/ipp`;

console.log('===========================================');
console.log('  Querying Printer Media Sources');
console.log('===========================================\n');

const printer = ipp.Printer(PRINTER_URL);

printer.execute('Get-Printer-Attributes', null, (err, res) => {
    if (err) {
        console.log('Error:', err.message);
        return;
    }

    const attrs = res['printer-attributes-tag'];

    if (attrs) {
        console.log('--- Media/Tray Related Attributes ---\n');

        // Look for media-related attributes
        const mediaKeys = Object.keys(attrs).filter(key =>
            key.includes('media') ||
            key.includes('tray') ||
            key.includes('source') ||
            key.includes('input')
        );

        mediaKeys.forEach(key => {
            console.log(`${key}:`);
            console.log(`  ${JSON.stringify(attrs[key])}\n`);
        });

        console.log('\n--- Document Format Supported ---\n');
        console.log(attrs['document-format-supported']);

        console.log('\n--- All Attribute Keys ---\n');
        console.log(Object.keys(attrs).join('\n'));
    }
});
