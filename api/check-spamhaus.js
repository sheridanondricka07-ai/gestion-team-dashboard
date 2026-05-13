const dns = require('dns');

// Create a custom resolver using Google & Cloudflare DNS
// This bypasses Vercel's system resolver which Spamhaus blocks
const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '1.1.1.1']);

// Promisify the custom resolver's resolve4
function resolve4(hostname) {
    return new Promise((resolve, reject) => {
        resolver.resolve4(hostname, (err, addresses) => {
            if (err) reject(err);
            else resolve(addresses);
        });
    });
}

// Firebase REST helpers
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
    const activeKey = dqsKey || 'vizecvum';
    
    // Use the DQS professional zone
    const query = `${reversedIP}.${activeKey}.zen.dq.spamhaus.net`;
    
    const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));

    try {
        const addresses = await Promise.race([resolve4(query), timeout(5000)]);
        
        if (addresses && addresses.length > 0) {
            // Log for debugging
            console.log(`IP ${ip} -> DNS returned: ${addresses.join(', ')}`);
            
            // Check ALL returned addresses for SBL/CSS
            for (const result of addresses) {
                // Skip refusal/error codes
                if (result === '127.0.0.1' || result.startsWith('127.255.255')) {
                    console.log(`IP ${ip} -> Query refused (${result})`);
                    return { status: 'clean', note: 'query_refused' };
                }
                
                // SBL
                if (result === '127.0.0.2') return { status: 'listed', list: 'SBL' };
                // CSS
                if (result === '127.0.0.3') return { status: 'listed', list: 'CSS' };
            }
            
            // Got a result but not SBL/CSS (e.g. PBL, XBL) - treat as clean per user request
            return { status: 'clean' };
        }
    } catch (error) {
        // ENOTFOUND = not listed, Timeout = could not check
        if (error.code !== 'ENOTFOUND') {
            console.log(`IP ${ip} -> Error: ${error.message}`);
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
            // Only update progress every 3 batches to reduce flicker
            if (i % (batchSize * 3) === 0 || currentCount >= uniqueIps.length) {
                await updateFirebase('spamhausProgress', { current: currentCount });
            }
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

        const listedCount = Object.values(results).filter(r => r.status === 'listed').length;
        console.log(`Scan complete: ${uniqueIps.length} IPs checked, ${listedCount} listed`);

        res.status(200).json({ success: true, checked: uniqueIps.length, listed: listedCount });
    } catch (error) {
        console.error('Critical Handler Error:', error);
        res.status(500).send('Critical Error: ' + error.message);
    }
}
