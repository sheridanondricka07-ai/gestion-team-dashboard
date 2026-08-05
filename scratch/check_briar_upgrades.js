const https = require('https');
https.get('https://gestion-team-c-01-default-rtdb.firebaseio.com/warmupRawLogs.json', res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const logs = JSON.parse(data);
        if (logs) {
            Object.values(logs).forEach(log => {
                if (log.text && (log.text.includes('briarfield.today') || log.text.includes('briarfield')) && (log.text.includes('5000') || log.text.includes('Upgrade') || log.text.includes('Downgrade'))) {
                    console.log('TIMESTAMP:', new Date(log.timestamp).toISOString());
                    console.log(log.text);
                    console.log('-----------------------------------');
                }
            });
        }
    });
});
