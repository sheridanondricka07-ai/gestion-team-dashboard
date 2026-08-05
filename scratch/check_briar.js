const https = require('https');

https.get('https://gestion-team-c-01-default-rtdb.firebaseio.com/warmupData.json?orderBy="$key"&limitToLast=500', res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const records = JSON.parse(data);
        const list = Object.values(records)
            .filter(r => (r.domain && r.domain.includes('briarfield.today')) || (r.ip && r.ip.includes('briarfield.today')))
            .sort((a,b) => a.timestamp - b.timestamp);
            
        console.log(`Found ${list.length} records for briarfield.today`);
        list.forEach(r => {
            console.log(`Time: ${new Date(r.timestamp).toISOString()}, IN: ${r.inVal}, OUT: ${r.outVal}, MSGID: ${r.messageId}`);
        });
    });
});
