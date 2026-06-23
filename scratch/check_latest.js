async function run() {
    const r = await fetch('https://gestion-team-c-01-default-rtdb.firebaseio.com/warmupData.json');
    const data = await r.json();
    if (!data) {
        console.log('No data');
        return;
    }
    const arr = Object.values(data).sort((a,b) => b.timestamp - a.timestamp);
    console.log('Total records:', arr.length);
    console.log('Latest 5 records:');
    arr.slice(0, 5).forEach(x => {
        console.log(`User: ${x.user}, Server: ${x.server}, Domain: ${x.domain}, Date: ${new Date(x.timestamp).toLocaleString()}, Timestamp: ${x.timestamp}`);
    });
}
run();
