const fetch = require('node-fetch');

const DB_URL = "https://gestion-team-c-01-default-rtdb.firebaseio.com";
const testKey = "test_etag_lock_" + Date.now();

async function run() {
    try {
        console.log(`Testing with key: ${testKey}`);
        
        // 1. Create the key
        const res1 = await fetch(`${DB_URL}/state/autoWarmupNotified/${testKey}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(true)
        });
        console.log(`1. Key created. Status: ${res1.status}`);

        // 2. Try PUT with if-match: 'null_etag' (expecting it to FAIL with 412 because key exists)
        const res2 = await fetch(`${DB_URL}/state/autoWarmupNotified/${testKey}.json`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'if-match': 'null_etag'
            },
            body: JSON.stringify(false)
        });
        console.log(`2. PUT with 'null_etag' on existing key. Status: ${res2.status}`);
        const body2 = await res2.json();
        console.log(`   Response:`, body2);

        // 3. Try PUT with if-match: '"null"' (expecting it to FAIL with 412 because key exists)
        const res3 = await fetch(`${DB_URL}/state/autoWarmupNotified/${testKey}.json`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'if-match': '"null"'
            },
            body: JSON.stringify(false)
        });
        console.log(`3. PUT with '"null"' on existing key. Status: ${res3.status}`);
        const body3 = await res3.json();
        console.log(`   Response:`, body3);

        // 4. Try PUT with if-match: 'null' (no double quotes, just null. expecting it to FAIL with 412 because key exists)
        const res4 = await fetch(`${DB_URL}/state/autoWarmupNotified/${testKey}.json`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'if-match': 'null'
            },
            body: JSON.stringify(false)
        });
        console.log(`4. PUT with 'null' on existing key. Status: ${res4.status}`);
        const body4 = await res4.json();
        console.log(`   Response:`, body4);

        // Clean up
        await fetch(`${DB_URL}/state/autoWarmupNotified/${testKey}.json`, { method: 'DELETE' });

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
