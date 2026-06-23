const https = require('https');

https.get('https://gestion-team-c-01-default-rtdb.firebaseio.com/state/autoWarmupNotified.json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const json = JSON.parse(data);
        const records = Object.keys(json)
            .filter(k => k.includes('durmorel_store') || k.includes('oakthorpe'))
            .sort((a, b) => b.timestamp - a.timestamp)
            ;
            
        console.log("Recent drops for durmorel.store:");
        console.log("Notified Keys:", records);
            const date = new Date(r.timestamp).toLocaleString();
            const percent = ((r.outVal / r.inVal) * 100).toFixed(2);
            console.log(`- Date: ${date}, IN: ${r.inVal}, OUT: ${r.outVal} (${percent}%)`);
        });
    });
});
