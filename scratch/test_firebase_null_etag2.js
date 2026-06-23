const fetch = require('node-fetch');

const DB_URL = "https://gestion-team-c-01-default-rtdb.firebaseio.com";
const testKey = "test_etag_lock_" + Date.now();

async function run() {
    try {
        // 1. Try with null_etag
        const putResp = await fetch(`${DB_URL}/state/autoWarmupNotified/${testKey}.json`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'if-match': 'null_etag'
            },
            body: JSON.stringify(true)
        });
        console.log(`Conditional PUT status with null_etag: ${putResp.status}`);
        const putVal = await putResp.json();
        console.log(`Response body:`, putVal);

        // 2. Clean up if succeeded
        if (putResp.status === 200) {
            await fetch(`${DB_URL}/state/autoWarmupNotified/${testKey}.json`, { method: 'DELETE' });
        }

        // 3. Try with "null_etag" (wrapped in quotes)
        const putResp2 = await fetch(`${DB_URL}/state/autoWarmupNotified/${testKey}.json`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'if-match': '"null_etag"'
            },
            body: JSON.stringify(true)
        });
        console.log(`Conditional PUT status with "null_etag": ${putResp2.status}`);
        const putVal2 = await putResp2.json();
        console.log(`Response body:`, putVal2);

        // Clean up if succeeded
        if (putResp2.status === 200) {
            await fetch(`${DB_URL}/state/autoWarmupNotified/${testKey}.json`, { method: 'DELETE' });
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
