// Spamhaus REST API - ported from working spamhaus-checker project
// Uses api.spamhaus.org with token auth - pure HTTPS

const DB_URL = "https://gestion-team-c-default-rtdb.firebaseio.com";

// Credentials from working project (config.json)
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
            console.log(`Attempting login at ${url}...`);
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload
            });

            console.log(`Login response: ${response.status}`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.token) {
                    authToken = data.token;
                    console.log('Auth token obtained successfully');
                    return authToken;
                }
            } else {
                const errorText = await response.text();
                console.log(`Login failed: ${errorText}`);
            }
        } catch (e) {
            console.log(`Login error at ${url}: ${e.message}`);
            continue;
        }
    }

    return null;
}

async function checkIP(ip, token) {
    // Check CSS and SBL lists using the exact same endpoint as the working project
    const listsToCheck = ['CSS', 'SBL'];
    
    for (const listName of listsToCheck) {
        const endpoint = `https://api.spamhaus.org/api/intel/v1/byobject/cidr/${listName}/listed/history/${ip}?limit=1`;
        
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                
                if (Array.isArray(data) && data.length > 0) {
                    const record = data[0];
                    console.log(`IP ${ip} LISTED on ${listName}: ${JSON.stringify(record)}`);
                    return {
                        status: 'listed',
                        list: listName,
                        listedDate: record.listed || '-',
                        expires: record.expires || '-',
                        reason: record.rule || '-'
                    };
                }
            } else if (response.status === 401) {
                authToken = null;
                console.log(`Auth expired checking ${ip}`);
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
    if (req.method !== 'POST' && !req.headers['x-vercel-cron']) {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        // Step 1: Authenticate
        console.log('Starting Spamhaus scan...');
        const token = await getAuthToken();
        if (!token) {
            console.error('AUTH FAILED - no token obtained');
            return res.status(500).json({ error: 'Failed to authenticate with Spamhaus API' });
        }
        console.log('Auth successful, fetching state...');

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
        console.log(`Found ${uniqueIps.length} unique IPs to check`);
        
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

        // Process in batches of 5
        const batchSize = 5;
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
            
            // Update progress every 3 batches
            if (i % (batchSize * 3) === 0 || currentCount >= uniqueIps.length) {
                await updateFirebase('spamhausProgress', { current: currentCount });
                console.log(`Progress: ${currentCount}/${uniqueIps.length} (${listedSoFar} listed)`);
            }
        }

        // Final updates
        const listedCount = Object.values(results).filter(r => r.status === 'listed').length;
        console.log(`FINAL: ${uniqueIps.length} checked, ${listedCount} listed`);
        
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

        res.status(200).json({ success: true, checked: uniqueIps.length, listed: listedCount });
    } catch (error) {
        console.error('Critical Handler Error:', error);
        await updateFirebase('spamhausProgress', { status: 'error' });
        res.status(500).send('Critical Error: ' + error.message);
    }
}
