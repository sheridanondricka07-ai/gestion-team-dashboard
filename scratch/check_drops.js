const db = require('../api/db.js');

async function main() {
    const snap = await db.ref('warmupData').once('value');
    const data = snap.val() || {};
    const records = Object.values(data).filter(r => r.domain && r.domain.toLowerCase() === 'cuatrotorres.mx');
    records.sort((a,b) => b.timestamp - a.timestamp);
    console.log(records.slice(0, 5));
    process.exit(0);
}
main();
