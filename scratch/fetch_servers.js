const DB_URL = "https://gestion-team-c-01-default-rtdb.firebaseio.com";
async function run() {
    const resp = await fetch(`${DB_URL}/state/servers.json`);
    const servers = await resp.json();
    
    const warmupTypes = {};
    servers.forEach(s => {
        if (s) {
            const wt = s.warmupType || "default/missing";
            if (!warmupTypes[wt]) warmupTypes[wt] = [];
            warmupTypes[wt].push(s.name);
        }
    });
    console.log(JSON.stringify(warmupTypes, null, 2));
}
run().catch(console.error);
