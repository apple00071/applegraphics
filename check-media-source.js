
import ipp from 'ipp';

const PRINTER_IP = '192.168.1.123';
const PRINTER_URL = `http://${PRINTER_IP}:631/ipp`;

const printer = ipp.Printer(PRINTER_URL);

console.log('Querying ALL attributes to find media source...');

printer.execute('Get-Printer-Attributes', null, (err, res) => {
    if (err) {
        console.error('Error:', err);
        return;
    }

    const attrs = res['printer-attributes-tag'];
    if (attrs) {
        // print only media related keys
        const keys = Object.keys(attrs);
        const mediaKeys = keys.filter(k => k.includes('media') || k.includes('source') || k.includes('tray'));

        console.log('--- Found Media Attributes ---');
        mediaKeys.forEach(k => {
            console.log(`${k}: ${JSON.stringify(attrs[k])}`);
        });
    } else {
        console.log('No attributes tag found');
    }
});
