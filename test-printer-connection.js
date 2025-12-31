/**
 * Konica Minolta IPP Integration Test Script
 * 
 * This script tests multiple common IPP endpoints to find the correct one
 * for your Konica Minolta printer.
 * 
 * Usage: node test-printer-connection.js
 */

import ipp from 'ipp';

// --- CONFIGURATION ---
const PRINTER_IP = '192.168.1.123';

// Common IPP endpoint paths for Konica Minolta printers
const IPP_PATHS = [
    '/ipp/print',
    '/ipp',
    '/ipp/printer',
    '/printers/ipp',
    '/',
    '/print',
];

console.log('===========================================');
console.log('  Konica Minolta IPP Endpoint Discovery');
console.log('===========================================');
console.log(`\nTesting printer at: ${PRINTER_IP}\n`);

async function testEndpoint(path, port) {
    return new Promise((resolve) => {
        const url = `http://${PRINTER_IP}:${port}${path}`;
        const printer = ipp.Printer(url);

        // Set a timeout for each test
        const timeout = setTimeout(() => {
            resolve({ url, success: false, error: 'Timeout' });
        }, 5000);

        printer.execute('Get-Printer-Attributes', null, (err, res) => {
            clearTimeout(timeout);
            if (err) {
                resolve({ url, success: false, error: err.message || err });
            } else if (res.statusCode === 'successful-ok' || res.statusCode === 'successful-ok-ignored-or-substituted-attributes') {
                resolve({ url, success: true, response: res });
            } else {
                resolve({ url, success: false, error: `Status: ${res.statusCode}` });
            }
        });
    });
}

async function discoverEndpoint() {
    const ports = [631, 80, 443];

    for (const port of ports) {
        for (const path of IPP_PATHS) {
            const result = await testEndpoint(path, port);
            console.log(`Testing ${result.url}... ${result.success ? '✅ SUCCESS!' : `❌ ${result.error}`}`);

            if (result.success) {
                console.log('\n========================================');
                console.log('  ✅ WORKING ENDPOINT FOUND!');
                console.log(`  URL: ${result.url}`);
                console.log('========================================\n');

                const attrs = result.response['printer-attributes-tag'];
                if (attrs) {
                    console.log('--- Printer Information ---');
                    console.log(`Printer Name: ${attrs['printer-name'] || 'N/A'}`);
                    console.log(`Make and Model: ${attrs['printer-make-and-model'] || 'N/A'}`);
                    console.log(`State: ${attrs['printer-state'] || 'N/A'}`);
                }
                return result.url;
            }
        }
    }

    console.log('\n❌ No working endpoint found.');
    console.log('Please check if IPP is enabled on your Konica Minolta printer.');
    return null;
}

discoverEndpoint();
