const fetch = require('node-fetch');

const DB_URL = "https://gestion-team-c-01-default-rtdb.firebaseio.com";
const testKey = "test_etag_get_" + Math.floor(Math.random() * 100000000);

async function run() {
    try {
        const getResp = await fetch(`${DB_URL}/state/autoWarmupNotified/${testKey}.json`, {
            headers: { 'X-Firebase-ETag': 'true' }
        });
        const val = await getResp.json();
        const etag = getResp.headers.get('etag');
        console.log(`GET non-existing -> value: ${val}, ETag: ${JSON.stringify(etag)}`);
    } catch (e) {
        console.error(e);
    }
}

run();
