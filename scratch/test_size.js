const https = require('https');

https.get('https://gestion-team-c-01-default-rtdb.firebaseio.com/warmupData.json?orderBy="$key"&limitToLast=2000', res => {
    let size = 0;
    res.on('data', chunk => size += chunk.length);
    res.on('end', () => console.log('Size of 2000 drops (bytes):', size));
});
