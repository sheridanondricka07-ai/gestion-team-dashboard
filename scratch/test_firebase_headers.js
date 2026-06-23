const fetch = require('node-fetch');

const DB_URL = "https://gestion-team-c-01-default-rtdb.firebaseio.com";
const testKey = "test_etag_lock_" + Date.now();

async function run() {
    try {
        const getResp = await fetch(`${DB_URL}/state/autoWarmupNotified/${testKey}.json`);
        console.log("Status:", getResp.status);
        console.log("Headers:");
        for (let [key, val] of getResp.headers.entries()) {
            console.log(`  ${key}: ${val}`);
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
