// Spamhaus REST API - ported from working spamhaus-checker project
// Uses api.spamhaus.org with token auth - pure HTTPS

const DB_URL = "https://gestion-team-c-default-rtdb.firebaseio.com";

// Credentials from working project
const SPAMHAUS_USERNAME = "ypihcpsh@98907859";
const SPAMHAUS_PASSWORD = "E1l0&su7d,zVEiP6";

let authToken = null;

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

async function getAuthToken() {
    if (authToken) return authToken;

    const payload = JSON.stringify({
        username: SPAMHAUS_USERNAME,
        password: SPAMHAUS_PASSWORD,
        realm: "intel"
    });

    try {
        const response = await fetch("https://api.spamhaus.org/api/v1/login", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload
        });

        if (response.ok) {
            const data = await response.json();
            if (data.token) {
                authToken = data.token;
                console.log('Auth token obtained');
                return authToken;
            }
        } else {
            console.error('Login failed:', response.status);
        }
    } catch (e) {
        console.error('Login error:', e.message);
    }

    return null;
}

async function checkIP(ip, token, retryCount = 0) {
    // The working project (server.py) primarily checks XBL
    // The user also requested CSS and SBL. 
    // We will check XBL, SBL, and CSS to be 100% sure.
    const listsToCheck = ['XBL', 'SBL', 'CSS'];
    
    for (const listName of listsToCheck) {
        // Use the exact v1 history endpoint from the working project
        const pathType = (listName === 'SBL') ? 'ip' : 'cidr';
        const endpoint = `https://api.spamhaus.org/api/intel/v1/byobject/${pathType}/${listName}/listed/history/${ip}?limit=1`;
        
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 429) {
                if (retryCount < 3) {
                    await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
                    return await checkIP(ip, token, retryCount + 1);
                }
                return { status: 'clean' };
            }

            if (response.ok) {
                const data = await response.json();
                const results = data.results || data;
                const records = Array.isArray(results) ? results : [];
                
                if (records.length > 0) {
                    const record = records[0];
                    
                    // The working project (server.py) does NOT check valid_until.
                    // It simply marks as listed if a record is found.
                    // Map XBL/SBL to 'SBL' and CSS to 'CSS' as per user UI request.
                    const displayList = (listName === 'CSS') ? 'CSS' : 'SBL';
                    
                    return {
                        status: 'listed',
                        list: displayList,
                        listedDate: record.listed ? new Date(record.listed * 1000).toISOString().split('T')[0] : '-',
                        expires: record.valid_until ? new Date(record.valid_until * 1000).toISOString().split('T')[0] : '-',
                        reason: record.rule || record.heuristic || '-'
                    };
                }
            }
        } catch (e) {
            continue;
        }
    }

    return { status: 'clean' };
}

export default async function handler(req, res) {
    if (req.method !== 'POST' && !req.headers['x-vercel-cron']) {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        // Step 1: Authenticate
        const token = await getAuthToken();
        if (!token) {
            return res.status(500).json({ error: 'Failed to authenticate with Spamhaus API' });
        }

        // Step 2: Fetch state
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

        await setFirebase('spamhausProgress', {
            total: uniqueIps.length,
            current: 0,
            status: 'running'
        });

        // Process in batches of 10 to fit within Vercel's 60s timeout
        const batchSize = 10;
        let currentCount = 0;
        let listedSoFar = 0;
        
        for (let i = 0; i < uniqueIps.length; i += batchSize) {
            const batch = uniqueIps.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (ip) => {
                try {
                    const result = await checkIP(ip, token);
                    const safeIp = ip.replace(/\./g, '_');
                    results[safeIp] = {
                        ...result,
                        timestamp: timestamp
                    };
                    
                    if (result.status === 'listed') listedSoFar++;
                } catch (err) {
                    console.error(`Failed to check ${ip}:`, err.message);
                }
            }));
            
            currentCount += batch.length;
            
            // Update progress in Firebase
            await updateFirebase('spamhausProgress', { current: currentCount });
            console.log(`Progress: ${currentCount}/${uniqueIps.length} (${listedSoFar} listed)`);
            
            // Safety delay between batches to stay under rate limits
            if (i + batchSize < uniqueIps.length) {
                await new Promise(r => setTimeout(r, 1500));
            }
        }

        // Final updates
        const listedCount = Object.values(results).filter(r => r.status === 'listed').length;
        
        await updateFirebase('spamhaus', results);
        await setFirebase('spamhausLastUpdate', new Date().toLocaleString());
        await setFirebase(`spamhausHistory/${dateKey}`, {
            timestamp: timestamp,
            summary: {
                total: uniqueIps.length,
                listed: listedCount
            },
            results: results
        });
        await updateFirebase('spamhausProgress', { status: 'idle' });

        console.log(`Scan complete: ${uniqueIps.length} checked, ${listedCount} listed`);
        res.status(200).json({ success: true, checked: uniqueIps.length, listed: listedCount });
    } catch (error) {
        console.error('Critical Handler Error:', error);
        await updateFirebase('spamhausProgress', { status: 'error' });
        res.status(500).send('Critical Error: ' + error.message);
    }
}
