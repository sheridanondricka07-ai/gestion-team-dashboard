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

async function checkIP(ip, dqsKey) {
    const reversedIP = ip.split('.').reverse().join('.');
    
    // Lists to check
    const lists = [
        // 1. Spamhaus DQS (Professional feed)
        { domain: (dqsKey || 'vizecvum') + '.zen.dq.spamhaus.net', name: 'Spamhaus' },
        // 2. SpamCop (Reliable fallback)
        { domain: 'bl.spamcop.net', name: 'SpamCop' },
        // 3. SORBS
        { domain: 'dnsbl.sorbs.net', name: 'SORBS' }
    ];

    const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));

    for (const list of lists) {
        try {
            const query = `${reversedIP}.${list.domain}`;
            const addresses = await Promise.race([dns.resolve4(query), timeout(2000)]);
            
            if (addresses && addresses.length > 0) {
                const result = addresses[0];
                
                // Skip Spamhaus refusal code
                if (list.name === 'Spamhaus' && (result === '127.0.0.1' || result.startsWith('127.255.255'))) {
                    continue; 
                }

                // If we get any other result, it's listed!
                let listType = list.name;
                if (list.name === 'Spamhaus') {
                    if (result === '127.0.0.2') listType = 'SBL';
                    else if (result === '127.0.0.3') listType = 'CSS';
                    else if (result.startsWith('127.0.0.4')) listType = 'XBL';
                }

                return { status: 'listed', list: listType };
            }
        } catch (error) {
            // ENOTFOUND or Timeout means clean on this specific list, continue to next
            continue;
        }
    }

    return { status: 'clean' };
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
        const dqsKey = state.spamhausDqsKey;

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
                    const result = await checkIP(ip, dqsKey);
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
