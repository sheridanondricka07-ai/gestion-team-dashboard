const fetch = require('node-fetch');

const DB_URL = "https://gestion-team-c-01-default-rtdb.firebaseio.com";

async function testHeader(headerValue) {
    const testKey = "test_etag_ne_" + Math.floor(Math.random() * 100000000);
    try {
        const res = await fetch(`${DB_URL}/state/autoWarmupNotified/${testKey}.json`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'if-match': headerValue
            },
            body: JSON.stringify(true)
        });
        console.log(`PUT with if-match: '${headerValue}' on non-existing key. Status: ${res.status}`);
        if (res.status === 200) {
            // Clean up
            await fetch(`${DB_URL}/state/autoWarmupNotified/${testKey}.json`, { method: 'DELETE' });
        }
    } catch (e) {
        console.error(e);
    }
}

async function run() {
    await testHeader('null_etag');
    await testHeader('"null"');
    await testHeader('null');
    await testHeader('some_random_value');
    await testHeader('"some_random_value"');
}

run();
