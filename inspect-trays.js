
import ipp from 'ipp';
import fs from 'fs';

const PRINTER_URL = 'http://192.168.1.123:631/ipp';
const DUMP_FILE = 'tray-debug.json';

console.log(`🔍 Inspecting Printer Attributes at ${PRINTER_URL}...`);

const printer = ipp.Printer(PRINTER_URL);

const msg = {
    'operation-attributes-tag': {
        'requesting-user-name': 'Admin',
        'attributes-charset': 'utf-8',
        'attributes-natural-language': 'en'
    },
    'requested-attributes': [
        'printer-input-tray',
        'media-ready',
        'media-col-ready',
        'media-supported',
        'media-col-database'
    ]
};

printer.execute("Get-Printer-Attributes", msg, (err, res) => {
    if (err) {
        console.error('❌ IPP Error:', err);
        fs.writeFileSync(DUMP_FILE, JSON.stringify({ error: err }, null, 2));
    } else {
        console.log('✅ Response received. Writing to file...');
        const attrs = res['printer-attributes-tag'] || {};

        // Filter out huge binary blobs if any (though these attributes usually text/json)
        const cleanData = {
            'printer-input-tray': attrs['printer-input-tray'] || 'NOT_FOUND',
            'media-ready': attrs['media-ready'] || 'NOT_FOUND',
            'media-col-ready': attrs['media-col-ready'] || 'NOT_FOUND',
            'media-supported': attrs['media-supported'] ? '(Array of ' + attrs['media-supported'].length + ' items)' : 'NOT_FOUND'
        };

        fs.writeFileSync(DUMP_FILE, JSON.stringify(cleanData, null, 2));
        console.log('📄 Data saved to', DUMP_FILE);
        console.log('Preview:', JSON.stringify(cleanData, null, 2));
    }
});
