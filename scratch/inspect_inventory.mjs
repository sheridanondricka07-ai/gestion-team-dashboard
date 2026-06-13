async function run() {
    const DB_URL = "https://gestion-team-e-default-rtdb.firebaseio.com";
    try {
        const resp = await fetch(`${DB_URL}/state/rpInventory.json`);
        const rpInventory = await resp.json() || [];
        
        const availableRps = rpInventory.filter(item => 
            !item.srv || item.srv === 'Unassigned' || item.srv === '---' || item.srv === ''
        );
        console.log("Total Available RPs:", availableRps.length);
        console.log("Sample of 10 Available RPs:");
        console.log(JSON.stringify(availableRps.slice(0, 10), null, 2));
    } catch(e) {
        console.error("Error:", e);
    }
}
run();
