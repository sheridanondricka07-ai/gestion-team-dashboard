const https = require('https');

https.get('https://gestion-team-c-01-default-rtdb.firebaseio.com/warmupData.json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const json = JSON.parse(data || '{}');
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        
        const servers = {};

        Object.values(json).forEach(r => {
            if (!r.server || r.timestamp < cutoff) return;
            
            if (!servers[r.server]) {
                servers[r.server] = new Set();
            }
            
            // Handle RDNS where domain might be missing or [RDNS]
            const cleanDomain = (!r.domain || r.domain === '[RDNS]' || r.domain === '---') ? r.ip : r.domain;
            if (cleanDomain) {
                servers[r.server].add(cleanDomain);
            }
        });

        console.log("--- PROPOSED WAIT TIMES (Target Total: 4800s) ---");
        for (const server in servers) {
            const domainCount = servers[server].size;
            if (domainCount > 0) {
                const waitTime = Math.round(4800 / domainCount);
                console.log(`Server: ${server.padEnd(15)} | Active Domains: ${domainCount.toString().padEnd(3)} | Proposed wait_time: ${waitTime}s`);
            }
        }
    });
});
