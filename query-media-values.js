/**
 * Query and print all media-supported values from Konica Minolta
 */

import ipp from 'ipp';

const PRINTER_IP = '192.168.1.123';
const PRINTER_URL = `http://${PRINTER_IP}:631/ipp`;

console.log('Querying media-supported values...\n');

const printer = ipp.Printer(PRINTER_URL);

printer.execute('Get-Printer-Attributes', null, (err, res) => {
    if (err) {
        console.log('Error:', err.message);
        return;
    }

    const attrs = res['printer-attributes-tag'];

    if (attrs) {
        console.log('--- media-default ---');
        console.log(attrs['media-default']);

        console.log('\n--- media-supported (all values) ---');
        const mediaSupported = attrs['media-supported'];
        if (Array.isArray(mediaSupported)) {
            mediaSupported.forEach((m, i) => {
                console.log(`${i + 1}. ${m}`);
            });
        } else {
            console.log(mediaSupported);
        }

        console.log('\n--- output-bin-default ---');
        console.log(attrs['output-bin-default']);
    }
});
