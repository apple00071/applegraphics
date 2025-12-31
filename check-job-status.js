/**
 * Check job status on the printer
 */

import ipp from 'ipp';

const PRINTER_IP = '192.168.1.123';
const PRINTER_URL = `http://${PRINTER_IP}:631/ipp`;
const JOB_ID = 14222;  // The job we just sent

console.log('Checking job status...\n');

const printer = ipp.Printer(PRINTER_URL);

const msg = {
    'operation-attributes-tag': {
        'job-uri': `ipp://${PRINTER_IP}:631/ipp?${JOB_ID}`,
        'requesting-user-name': 'AppleGraphics',
        'requested-attributes': ['job-state', 'job-state-reasons', 'job-name']
    }
};

printer.execute('Get-Job-Attributes', msg, (err, res) => {
    if (err) {
        console.log('Error:', err.message);
        return;
    }

    console.log('Job Status Response:');
    console.log(JSON.stringify(res, null, 2));
});
