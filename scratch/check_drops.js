const https = require('https');
https.get('https://gestion-team-c-01-default-rtdb.firebaseio.com/state/drops.json?orderBy="$key"&limitToFirst=3', res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log(data);
    });
});
