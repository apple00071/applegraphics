
import ipp from 'ipp';
import fs from 'fs';

const PRINTER_URL = 'http://192.168.1.123:631/ipp';
const DUMP_FILE = 'all-attrs-debug.json';

console.log(`🔍 Dumping ALL attributes from ${PRINTER_URL}...`);

const printer = ipp.Printer(PRINTER_URL);

const msg = {
    'operation-attributes-tag': {
        'requesting-user-name': 'Admin',
        'attributes-charset': 'utf-8',
        'attributes-natural-language': 'en'
    },
    'requested-attributes': ['all', 'media-col-database'] // explicit 'all'
};

printer.execute("Get-Printer-Attributes", msg, (err, res) => {
    if (err) {
        console.error('❌ IPP Error:', err);
    } else {
        console.log('✅ Response received. Writing to file...');
        fs.writeFileSync(DUMP_FILE, JSON.stringify(res, null, 2));
        console.log('📄 Data saved to', DUMP_FILE);
    }
});
