// Spamhaus REST API - ported from working spamhaus-checker project
// Uses api.spamhaus.org with token auth - pure HTTPS

const DB_URL = "https://gestion-team-c-default-rtdb.firebaseio.com";

// Credentials from working project
const SPAMHAUS_USERNAME = "ypihcpsh@98907859";
const SPAMHAUS_PASSWORD = "E1l0&su7d,zVEiP6";

let authToken = null;

async function updateFirebaseData(path, data) {
    try {
        await fetch(`${DB_URL}/${path}.json`, {
            method: 'PATCH',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.error('Firebase REST Error:', e);
    }
}

async function setFirebaseData(path, data) {
    try {
        await fetch(`${DB_URL}/${path}.json`, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.error('Firebase REST Error:', e);
    }
}

async function getFirebaseData(path) {
    try {
        const resp = await fetch(`${DB_URL}/${path}.json`);
        return await resp.json();
    } catch (e) {
        console.error('Firebase REST Error:', e);
        return null;
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
    // Switch to 'live' endpoint for real-time status as per official Spamhaus docs
    // Lists to check: XBL (Exploits), SBL (Spam), CSS (Reputation), PBL (Policy)
    const listsToCheck = ['XBL', 'SBL', 'CSS', 'PBL'];
    
    for (const listName of listsToCheck) {
        // Use 'live' for current status. Path is 'ip' for individual IP lookups.
        const endpoint = `https://api.spamhaus.org/api/intel/v1/byobject/ip/${listName}/listed/live/${ip}`;
        
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
                // 'live' endpoint returns results in data.results or the object itself
                const results = data.results || (data.id ? [data] : []);
                const records = Array.isArray(results) ? results : [];
                
                if (records.length > 0) {
                    const record = records[0];
                    
                    // Map lists to UI display names
                    let displayList = 'SBL'; // Default
                    if (listName === 'CSS') displayList = 'CSS';
                    if (listName === 'XBL') displayList = 'XBL';
                    if (listName === 'PBL') displayList = 'PBL';
                    
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
            console.error(`Check error for ${ip} on ${listName}:`, e);
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

        // 4. Get all IPs to check
        const servers = await getFirebaseData('state/servers') || [];
        let allIps = [];
        servers.forEach(s => {
            if (s && s.allIps) allIps = allIps.concat(s.allIps);
        });
        
        const uniqueIps = [...new Set(allIps)];
        const timestamp = new Date().toISOString();
        
        // --- CHUNKED SCAN LOGIC ---
        const CHUNK_SIZE = 30;
        const body = req.body || {};
        const startIndex = body.startIndex || 0;
        const endIndex = Math.min(startIndex + CHUNK_SIZE, uniqueIps.length);
        const ipsToProcess = uniqueIps.slice(startIndex, endIndex);
        
        console.log(`Processing chunk: ${startIndex} to ${endIndex} (${ipsToProcess.length} IPs)`);

        if (startIndex === 0) {
            await setFirebaseData('state/spamhausProgress', {
                total: uniqueIps.length,
                current: 0,
                status: 'running',
                lastUpdate: Date.now()
            });
        }

        const batchSize = 10;
        let chunkResults = {};
        
        for (let i = 0; i < ipsToProcess.length; i += batchSize) {
            const batch = ipsToProcess.slice(i, i + batchSize);
            await Promise.all(batch.map(async (ip) => {
                const result = await checkIP(ip, token);
                const safeIp = ip.replace(/\./g, '_');
                chunkResults[safeIp] = { ...result, timestamp: timestamp };
            }));
            
            if (i + batchSize < ipsToProcess.length) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        const currentProgress = await getFirebaseData('state/spamhausProgress');
        const newCurrent = (currentProgress?.current || 0) + ipsToProcess.length;
        
        await updateFirebaseData('state/spamhausProgress', { 
            current: newCurrent,
            lastUpdate: Date.now()
        });

        await updateFirebaseData('state/spamhaus', chunkResults);

        if (newCurrent >= uniqueIps.length) {
            await setFirebaseData('state/spamhausLastUpdate', new Date().toLocaleString());
            await updateFirebaseData('state/spamhausProgress', { status: 'idle' });
            
            const dateKey = new Date().toISOString().split('T')[0];
            const finalResults = await getFirebaseData('state/spamhaus');
            await setFirebaseData(`state/spamhausHistory/${dateKey}`, {
                timestamp: timestamp,
                results: finalResults
            });
        }

        return res.status(200).json({ 
            success: true, 
            processed: ipsToProcess.length,
            nextIndex: endIndex < uniqueIps.length ? endIndex : null
        });
    } catch (error) {
        console.error('Critical Handler Error:', error);
        await updateFirebaseData('state/spamhausProgress', { 
            status: 'error',
            lastError: error.message
        });
        res.status(500).send('Critical Error: ' + error.message);
    }
}
