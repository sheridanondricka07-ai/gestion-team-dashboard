const dns = require('dns').promises;

// Use REST API for more reliable writes without service accounts
const DB_URL = "https://gestion-team-c-default-rtdb.firebaseio.com";

async function updateFirebase(path, data) {
    try {
        await fetch(`${DB_URL}/state/${path}.json`, {
            method: 'PATCH',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.error('Firebase REST Error:', e);
    }
}

async function setFirebase(path, data) {
    try {
        await fetch(`${DB_URL}/state/${path}.json`, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.error('Firebase REST Error:', e);
    }
}

async function checkIP(ip) {
    const reversedIP = ip.split('.').reverse().join('.');
    const query = `${reversedIP}.zen.spamhaus.org`;
    
    // Add a 2s timeout to DNS lookups
    const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('DNS Timeout')), 2000)
    );

    try {
        await Promise.race([dns.resolve4(query), timeout]);
        return { status: 'listed', list: 'ZEN' };
    } catch (error) {
        if (error.code === 'ENOTFOUND' || error.message === 'DNS Timeout') return { status: 'clean' };
        throw error;
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        // Fetch state via REST
        const stateRes = await fetch(`${DB_URL}/state.json`);
        const state = await stateRes.json();
        
        if (!state || !state.servers) {
            return res.status(400).send('No servers found in state');
        }

        const allIps = [];
        state.servers.forEach(s => {
            if (s.allIps) allIps.push(...s.allIps);
        });
        const uniqueIps = [...new Set(allIps)];
        
        if (uniqueIps.length === 0) {
            return res.status(200).json({ success: true, message: 'No IPs to check' });
        }

        const results = {};
        const timestamp = new Date().toISOString();
        const dateKey = timestamp.split('T')[0];

        // Start progress
        await setFirebase('spamhausProgress', {
            total: uniqueIps.length,
            current: 0,
            status: 'running'
        });

        const batchSize = 5;
        let currentCount = 0;
        
        for (let i = 0; i < uniqueIps.length; i += batchSize) {
            const batch = uniqueIps.slice(i, i + batchSize);
            await Promise.all(batch.map(async (ip) => {
                try {
                    const result = await checkIP(ip);
                    const safeIp = ip.replace(/\./g, '_');
                    results[safeIp] = {
                        ...result,
                        timestamp: timestamp
                    };
                } catch (err) {
                    console.error(`Failed to check ${ip}:`, err.message);
                }
            }));
            
            currentCount += batch.length;
            await updateFirebase('spamhausProgress', { current: currentCount });
        }

        // Final updates
        await updateFirebase('spamhaus', results);
        await setFirebase('spamhausLastUpdate', new Date().toLocaleString());
        await setFirebase(`spamhausHistory/${dateKey}`, {
            timestamp: timestamp,
            summary: {
                total: uniqueIps.length,
                listed: Object.values(results).filter(r => r.status === 'listed').length
            },
            results: results
        });
        await updateFirebase('spamhausProgress', { status: 'idle' });

        res.status(200).json({ success: true, checked: uniqueIps.length });
    } catch (error) {
        console.error('Critical Handler Error:', error);
        res.status(500).send('Critical Error: ' + error.message);
    }
}
