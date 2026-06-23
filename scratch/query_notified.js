const https = require('https');

https.get('https://gestion-team-c-01-default-rtdb.firebaseio.com/state/autoWarmupNotified.json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const json = JSON.parse(data || '{}');
        const keys = Object.entries(json).filter(([k,v]) => k.includes('durmorel_store') || k.includes('oakthorpe_today') || k.includes('elastape_com')).reduce((obj, [k,v]) => { obj[k] = v; return obj; }, {});
        console.log("Notified Keys for affected domains:");
        console.log(keys);
    });
});
