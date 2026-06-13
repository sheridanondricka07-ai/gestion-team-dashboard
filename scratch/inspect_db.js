async function run() {
    const DB_URL = "https://gestion-team-e-default-rtdb.firebaseio.com";
    try {
        const resp = await fetch(`${DB_URL}/state/statuses.json`);
        const data = await resp.json();
        console.log("Firebase statuses keys count:", Object.keys(data || {}).length);
        console.log("Sample of statuses:", Object.entries(data || {}).slice(0, 5));
    } catch(e) {
        console.error("Error fetching:", e);
    }
}
run();
