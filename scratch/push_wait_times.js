const https = require('https');

function putFirebaseData(path, data) {
    return new Promise((resolve, reject) => {
        const url = `https://gestion-team-c-01-default-rtdb.firebaseio.com/${path}`;
        const req = https.request(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        }, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', reject);
        req.write(JSON.stringify(data));
        req.end();
    });
}

https.get('https://gestion-team-c-01-default-rtdb.firebaseio.com/warmupData.json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', async () => {
        const json = JSON.parse(data || '{}');
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        
        const servers = {};

        Object.values(json).forEach(r => {
            if (!r.server || r.timestamp < cutoff) return;
            if (!servers[r.server]) servers[r.server] = new Set();
            
            const cleanDomain = (!r.domain || r.domain === '[RDNS]' || r.domain === '---') ? r.ip : r.domain;
            if (cleanDomain) servers[r.server].add(cleanDomain);
        });

        const newQueueItems = {};
        let sendAtMs = Date.now() + 2000;

        for (const server in servers) {
            const domainCount = servers[server].size;
            if (domainCount > 0) {
                const waitTime = Math.round(4800 / domainCount);
                
                // Format: update s_wmn3_2250 wait_time to 600
                const msg = `update ${server} wait_time to ${waitTime}`;
                const queueId = `q_${server}_wait_time_auto`;
                
                newQueueItems[queueId] = {
                    chat_id: "-5317343683",
                    text: msg,
                    sendAt: sendAtMs
                };
                console.log(`Queued: ${msg}`);
                
                sendAtMs += 7000; // Stagger by 7 seconds
            }
        }

        console.log("Pushing commands to Firebase...");
        await putFirebaseData('state/autoWarmupQueue.json', newQueueItems);
        console.log("Commands successfully pushed to Firebase Queue!");
    });
});
