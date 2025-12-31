
import snmp from 'net-snmp';
import fs from 'fs';

const PRINTER_IP = '192.168.1.123';
const SESSION = snmp.createSession(PRINTER_IP, 'public');

// Standard Printer MIB OIDs
const OIDS = [
    '1.3.6.1.2.1.43.8.2.1.18.1.1', // Tray 1 Name
    '1.3.6.1.2.1.43.8.2.1.18.1.2', // Tray 2 Name
    '1.3.6.1.2.1.43.8.2.1.18.1.3', // Tray 3 Name
    '1.3.6.1.2.1.43.8.2.1.18.1.4', // Tray 4 Name
    '1.3.6.1.2.1.43.8.2.1.18.1.5', // Tray 5 Name
    '1.3.6.1.2.1.43.8.2.1.12.1.1', // Tray 1 Media Name (Paper Size/Type often here)
    '1.3.6.1.2.1.43.8.2.1.12.1.2',
    '1.3.6.1.2.1.43.8.2.1.12.1.3',
    '1.3.6.1.2.1.43.8.2.1.12.1.4',
    '1.3.6.1.2.1.43.8.2.1.12.1.5',
    '1.3.6.1.2.1.43.8.2.1.10.1.1', // Tray 1 Capacity
    '1.3.6.1.2.1.43.8.2.1.10.1.2',
    '1.3.6.1.2.1.43.8.2.1.10.1.3',
    '1.3.6.1.2.1.43.8.2.1.10.1.4',
];

console.log(`🔍 Probing SNMP at ${PRINTER_IP}...`);

SESSION.get(OIDS, (error, varbinds) => {
    if (error) {
        console.error('❌ SNMP Error:', error);
        SESSION.close();
        return;
    }

    const results = {};
    varbinds.forEach((vb) => {
        if (snmp.isVarbindError(vb)) {
            console.error(snmp.varbindError(vb));
        } else {
            console.log(`${vb.oid} = ${vb.value}`);
            results[vb.oid] = vb.value.toString();
        }
    });

    fs.writeFileSync('snmp-results.json', JSON.stringify(results, null, 2));
    console.log('✅ SNMP Dump Saved to snmp-results.json');
    SESSION.close();
});
