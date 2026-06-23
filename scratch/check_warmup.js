const https = require('https');
https.get('https://gestion-team-c-01-default-rtdb.firebaseio.com/warmupData.json?orderBy="$key"&limitToLast=2', res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => console.log(data));
});
