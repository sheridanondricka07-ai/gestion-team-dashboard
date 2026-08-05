const https = require('https');
https.get('https://gestion-team-c-01-default-rtdb.firebaseio.com/warmupRawLogs.json?shallow=true', res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const keys = Object.keys(JSON.parse(data));
        console.log('Total keys in warmupRawLogs:', keys.length);
        console.log('Sample keys:', keys.slice(0, 10));
    });
});
