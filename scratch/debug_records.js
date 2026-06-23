async function run() {
    const r = await fetch('https://gestion-team-c-01-default-rtdb.firebaseio.com/warmupData.json');
    const data = await r.json();
    if (!data) {
        console.log('No data');
        return;
    }
    const arr = Object.values(data).filter(x => x.server === 'sh_wmn3_6' || x.ip === '163.172.164.206');
    console.log('Matching records count:', arr.length);
    arr.sort((a,b) => b.timestamp - a.timestamp);
    arr.forEach(x => {
        console.log(`User: ${x.user}, Server: ${x.server}, Domain: ${x.domain}, IP: ${x.ip}, IN: ${x.inVal}, OUT: ${x.outVal}, Date: ${new Date(x.timestamp).toLocaleString()}`);
    });
}
run();
