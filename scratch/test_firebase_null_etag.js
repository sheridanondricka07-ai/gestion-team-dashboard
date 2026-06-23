const fetch = require('node-fetch');

const DB_URL = "https://gestion-team-c-01-default-rtdb.firebaseio.com";
const testKey = "test_etag_lock_" + Date.now();

async function run() {
    try {
        // 1. Write if not exists using ETag '"null"'
        const putResp = await fetch(`${DB_URL}/state/autoWarmupNotified/${testKey}.json`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'if-match': '"null"'
            },
            body: JSON.stringify(true)
        });
        console.log(`Conditional PUT status (expecting 200): ${putResp.status}`);
        const putVal = await putResp.json();
        console.log(`Response body:`, putVal);

        // 2. Try again (should fail with 412 because it now exists)
        const putResp2 = await fetch(`${DB_URL}/state/autoWarmupNotified/${testKey}.json`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'if-match': '"null"'
            },
            body: JSON.stringify(true)
        });
        console.log(`Second Conditional PUT status (expecting 412): ${putResp2.status}`);

        // Clean up
        await fetch(`${DB_URL}/state/autoWarmupNotified/${testKey}.json`, { method: 'DELETE' });

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
