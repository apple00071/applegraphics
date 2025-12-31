
import snmp from 'net-snmp';
import fs from 'fs';

const PRINTER_IP = '192.168.1.123';
const SESSION = snmp.createSession(PRINTER_IP, 'public');
const START_OID = '1.3.6.1.2.1.43'; // Printer MIB Root

console.log(`🚶 Walking SNMP tree at ${PRINTER_IP} starting from ${START_OID}...`);

const results = {};

function doneCb(error) {
    if (error) {
        console.error('❌ Walk Error:', error);
    } else {
        console.log('✅ Walk complete!');
        fs.writeFileSync('snmp-walk.json', JSON.stringify(results, null, 2));
        console.log('📄 Tree dump saved to snmp-walk.json');
    }
    SESSION.close();
}

function feedCb(varbinds) {
    for (const vb of varbinds) {
        if (snmp.isVarbindError(vb)) {
            console.error(snmp.varbindError(vb));
        } else {
            console.log(`${vb.oid} = ${vb.value}`);
            results[vb.oid] = vb.value.toString();
        }
    }
}

SESSION.walk(START_OID, 20, feedCb, doneCb);
