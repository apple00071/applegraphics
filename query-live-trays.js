
import ipp from 'ipp';
import fs from 'fs';

const PRINTER_URL = 'http://192.168.1.123:631/ipp';

console.log(`Querying ${PRINTER_URL} ...`);

const printer = ipp.Printer(PRINTER_URL);

const msg = {
    'operation-attributes-tag': {
        'requesting-user-name': 'Admin',
        'attributes-charset': 'utf-8',
        'attributes-natural-language': 'en'
    },
    'requested-attributes': ['media-ready']
};

printer.execute("Get-Printer-Attributes", msg, (err, res) => {
    if (err) {
        console.error('Error:', err);
    } else {
        const data = JSON.stringify(res, null, 2);
        console.log('Success. Writing to tray-dump.json');
        fs.writeFileSync('tray-dump.json', data);
        console.log(data.slice(0, 500)); // Print snippet
    }
});
