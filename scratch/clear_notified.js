const https = require('https');

const req = https.request('https://gestion-team-c-01-default-rtdb.firebaseio.com/state/autoWarmupNotified.json', { method: 'DELETE' }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log("Memory successfully cleared! Response:", data || "OK");
    });
});

req.on('error', (e) => {
    console.error("Error clearing memory:", e);
});

req.end();
