/**
 * Query for bypass/manual tray options
 */

import ipp from 'ipp';

const PRINTER_IP = '192.168.1.123';
const PRINTER_URL = `http://${PRINTER_IP}:631/ipp`;

console.log('Searching for bypass/manual tray options...\n');

const printer = ipp.Printer(PRINTER_URL);

printer.execute('Get-Printer-Attributes', null, (err, res) => {
    if (err) {
        console.log('Error:', err.message);
        return;
    }

    const attrs = res['printer-attributes-tag'];

    if (attrs) {
        const mediaSupported = attrs['media-supported'];

        if (Array.isArray(mediaSupported)) {
            console.log('--- Bypass/Manual/Tray Options ---\n');

            // Filter for bypass, manual, multi-purpose, or tray-related entries
            const bypassOptions = mediaSupported.filter(m =>
                m.toLowerCase().includes('bypass') ||
                m.toLowerCase().includes('manual') ||
                m.toLowerCase().includes('multi') ||
                m.toLowerCase().includes('tray') ||
                (m.toLowerCase().includes('a4') && m.toLowerCase().includes('index'))
            );

            bypassOptions.forEach((m, i) => {
                console.log(`${i + 1}. ${m}`);
            });

            console.log('\n--- First 30 media entries ---\n');
            mediaSupported.slice(0, 30).forEach((m, i) => {
                console.log(`${i + 1}. ${m}`);
            });
        }
    }
});
