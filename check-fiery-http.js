
import http from 'http';

const FIERY_IP = '192.168.1.123';
const URL = `http://${FIERY_IP}/live/api/v5/login`;

console.log(`Checking Fiery API (HTTP) at ${URL}...`);

const req = http.request(URL, { method: 'GET', timeout: 5000 }, (res) => {
    console.log(`Response Code: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (e) => {
    console.error(`Error: ${e.message}`);
});

req.end();
