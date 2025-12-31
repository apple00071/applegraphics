
import ipp from 'ipp';

const host = '192.168.1.123';
const port = 631;

const paths = [
    '/ipp/print',
    '/ipp/printer',
    '/ipp',
    '/print',
    '/printers/print',
    '/printers/lp',
    '/servlet/ipp/print' // Legacy Konica
];

console.log(`🔍 Scanning IPP Paths on ${host}:${port}...`);

async function checkPath(path) {
    const url = `http://${host}:${port}${path}`;
    const printer = ipp.Printer(url);

    return new Promise(resolve => {
        printer.execute("Get-Printer-Attributes", null, (err, res) => {
            if (err) {
                // If 404, it's definitely wrong path. If connection refused, host is wrong.
                // We are looking for a valid IPP response.
                resolve({ path, success: false, status: err.statusCode || err.code || err.message });
            } else {
                if (res.statusCode === 'successful-ok' || res.statusCode === 'successful-ok-ignored-or-substituted-attributes') {
                    resolve({ path, success: true, status: res.statusCode });
                } else {
                    resolve({ path, success: false, status: res.statusCode });
                }
            }
        });
    });
}

(async () => {
    for (const path of paths) {
        process.stdout.write(`Testing ${path} ... `);
        const result = await checkPath(path);
        console.log(result.success ? `✅ SUCCESS (${result.status})` : `❌ (${result.status})`);
        if (result.success) {
            console.log(`\n🎉 Found valid endpoint: http://${host}:${port}${path}`);
            process.exit(0);
        }
    }
    console.log('\n❌ No valid endpoint found.');
})();
