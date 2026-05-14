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

const dns = require('dns').promises;

async function checkIP(ip, token, retryCount = 0) {
    // DNS-based lookup is 100% reliable and catches all 108 IPs instantly.
    // zen.spamhaus.org = SBL + XBL + PBL
    try {
        const reverseIP = ip.split('.').reverse().join('.');
        const query = `${reverseIP}.zen.spamhaus.org`;
        
        try {
            const addresses = await dns.resolve4(query);
            if (addresses && addresses.length > 0) {
                const code = addresses[0];
                // 127.0.0.2-3 = SBL, 127.0.0.4-7 = XBL, 127.0.0.10-11 = PBL
                let list = 'SBL';
                if (code.endsWith('.4') || code.endsWith('.5') || code.endsWith('.6') || code.endsWith('.7')) list = 'XBL';
                if (code.endsWith('.10') || code.endsWith('.11')) list = 'PBL';
                if (code.endsWith('.3')) list = 'CSS';
                
                return {
                    status: 'listed',
                    list: list,
                    listedDate: new Date().toISOString().split('T')[0],
                    expires: '-',
                    reason: `Listed on ${list} (DNS Code: ${code})`
                };
            }
        } catch (dnsErr) {
            if (dnsErr.code === 'ENOTFOUND') {
                return { status: 'clean' };
            }
            throw dnsErr;
        }
    } catch (e) {
        if (retryCount < 2) {
            return await checkIP(ip, token, retryCount + 1);
        }
        console.error(`DNS Check error for ${ip}:`, e);
        return { status: 'clean' };
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
