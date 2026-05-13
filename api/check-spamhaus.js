// Spamhaus REST API approach - ported from working spamhaus-checker project
// Uses api.spamhaus.org with token auth - pure HTTPS, works perfectly on Vercel

const DB_URL = "https://gestion-team-c-default-rtdb.firebaseio.com";

// Spamhaus credentials
const SPAMHAUS_USERNAME = "vizecvum@86022311";
const SPAMHAUS_PASSWORD = "dEB8sG)rqneYo8t3";

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

    const loginUrls = [
        "https://api.spamhaus.org/api/v1/login",
        "https://api.spamhaus.com/api/v1/login"
    ];

    const payload = JSON.stringify({
        username: SPAMHAUS_USERNAME,
        password: SPAMHAUS_PASSWORD,
        realm: "intel"
    });

    for (const url of loginUrls) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
                signal: AbortSignal.timeout(10000)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.token) {
                    authToken = data.token;
                    console.log('Spamhaus auth token obtained successfully');
                    return authToken;
                }
            }
        } catch (e) {
            console.log(`Login attempt to ${url} failed: ${e.message}`);
            continue;
        }
    }

    console.error('Could not obtain Spamhaus auth token');
    return null;
}

async function checkIP(ip, token) {
    // Check SBL and CSS lists using the API
    const listsToCheck = ['SBL', 'CSS'];
    
    for (const listName of listsToCheck) {
        const endpoint = `https://api.spamhaus.org/api/intel/v1/byobject/cidr/${listName}/listed/history/${ip}?limit=1`;
        
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
                signal: AbortSignal.timeout(8000)
            });

            if (response.ok) {
                const data = await response.json();
                
                // If the API returns a non-empty array, the IP is listed
                if (Array.isArray(data) && data.length > 0) {
                    const record = data[0];
                    return {
                        status: 'listed',
                        list: listName,
                        listedDate: record.listed || '-',
                        expires: record.expires || '-',
                        reason: record.rule || '-'
                    };
                }
            } else if (response.status === 404) {
                // Not found on this list, continue to next
                continue;
            } else if (response.status === 401) {
                // Token expired, force re-auth
                authToken = null;
                return { status: 'clean', note: 'auth_expired' };
            }
        } catch (e) {
            console.log(`Error checking ${ip} on ${listName}: ${e.message}`);
            continue;
        }
    }

    return { status: 'clean' };
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        // Step 1: Get auth token
        const token = await getAuthToken();
        if (!token) {
            return res.status(500).json({ error: 'Failed to authenticate with Spamhaus API' });
        }

        // Step 2: Fetch state from Firebase
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

        // Process in batches of 3 with delays (API rate limiting)
        const batchSize = 3;
        let currentCount = 0;
        
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
                } catch (err) {
                    console.error(`Failed to check ${ip}:`, err.message);
                }
            }));
            
            currentCount += batch.length;
            
            // Update progress every 3 batches to reduce UI flicker
            if (i % (batchSize * 3) === 0 || currentCount >= uniqueIps.length) {
                await updateFirebase('spamhausProgress', { current: currentCount });
            }
            
            // Small delay between batches for API rate limiting
            await new Promise(r => setTimeout(r, 200));
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
        res.status(500).send('Critical Error: ' + error.message);
    }
}
