const fetch = require('node-fetch');

const DB_URL = "https://gestion-team-c-01-default-rtdb.firebaseio.com";
const testKey = "test_etag_lock_" + Date.now();

async function run() {
    try {
        // 1. GET the value and ETag
        const getResp = await fetch(`${DB_URL}/state/autoWarmupNotified/${testKey}.json`);
        const val = await getResp.json();
        const etag = getResp.headers.get('etag');
        console.log(`Initial GET -> value: ${val}, ETag: ${etag}`);

        // 2. Perform conditional PUT with if-match header
        const putResp = await fetch(`${DB_URL}/state/autoWarmupNotified/${testKey}.json`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'if-match': etag
            },
            body: JSON.stringify(true)
        });
        console.log(`Conditional PUT status: ${putResp.status}`);
        const putVal = await putResp.json();
        console.log(`Conditional PUT response body:`, putVal);

        // 3. Try to perform conditional PUT with the OLD ETag again (should fail with 412)
        const putResp2 = await fetch(`${DB_URL}/state/autoWarmupNotified/${testKey}.json`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'if-match': etag
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
