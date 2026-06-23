const https = require('https');

const OLD_DB = 'https://gestion-team-c-01-default-rtdb.firebaseio.com';
const NEW_DB = 'https://gestion-team-c-01-default-rtdb.firebaseio.com';

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(`${url}/.json`, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) return reject(new Error(`Fetch failed: ${res.statusCode} ${data}`));
                resolve(JSON.parse(data));
            });
        }).on('error', reject);
    });
}

function putJson(url, payload) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const options = {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        const req = https.request(`${url}/.json`, options, res => {
            let resData = '';
            res.on('data', chunk => resData += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) return reject(new Error(`Put failed: ${res.statusCode} ${resData}`));
                resolve(resData);
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function run() {
    console.log("Downloading data from OLD database...");
    const data = await fetchJson(OLD_DB);
    if (!data) {
        console.log("No data found in old database.");
        return;
    }
    
    console.log(`Downloaded successfully. Total keys at root: ${Object.keys(data).length}`);
    console.log("Uploading to NEW database...");
    
    await putJson(NEW_DB, data);
    console.log("Migration completely successful!");
}

run().catch(console.error);
