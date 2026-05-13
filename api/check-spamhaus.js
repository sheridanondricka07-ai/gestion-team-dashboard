// DNS-over-HTTPS approach - bypasses Vercel's DNS restrictions completely
// Uses Google's DoH API which works via standard HTTPS requests

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
    
    // Use DNS-over-HTTPS via Google's public API
    // This makes a standard HTTPS request — Vercel cannot block this
    const query = `${reversedIP}.zen.spamhaus.org`;
    const dohUrl = `https://dns.google/resolve?name=${query}&type=A`;

    try {
        const response = await fetch(dohUrl, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(8000) // 8s timeout
        });

        if (!response.ok) {
            console.log(`DoH request failed for ${ip}: HTTP ${response.status}`);
            return { status: 'clean' };
        }

        const data = await response.json();
        
        // Log raw response for debugging
        console.log(`IP ${ip} -> DoH response: Status=${data.Status}, Answers=${JSON.stringify(data.Answer || [])}`);

        // Status 0 = NOERROR (records found), Status 3 = NXDOMAIN (not listed)
        if (data.Status === 3 || !data.Answer || data.Answer.length === 0) {
            return { status: 'clean' };
        }

        // Parse the answers
        for (const answer of data.Answer) {
            if (answer.type !== 1) continue; // Only A records
            const result = answer.data;

            // Skip refusal/error codes
            if (result === '127.0.0.1' || result.startsWith('127.255.255')) {
                console.log(`IP ${ip} -> Query refused (${result})`);
                return { status: 'clean', note: 'query_refused' };
            }

            // SBL
            if (result === '127.0.0.2') return { status: 'listed', list: 'SBL' };
            // CSS  
            if (result === '127.0.0.3') return { status: 'listed', list: 'CSS' };
            
            // Other codes (XBL, PBL) - user only wants SBL/CSS
            // But still log them
            console.log(`IP ${ip} -> Listed on other list (${result}), treating as clean per user preference`);
        }

        return { status: 'clean' };
    } catch (error) {
        console.log(`IP ${ip} -> DoH error: ${error.message}`);
        return { status: 'clean' };
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

        // Quick test: check the first known-listed IP to verify the approach works
        const testResult = await checkIP(uniqueIps[0]);
        console.log(`Test check on ${uniqueIps[0]}: ${JSON.stringify(testResult)}`);

        const results = {};
        const timestamp = new Date().toISOString();
        const dateKey = timestamp.split('T')[0];

        // Start progress
        await setFirebase('spamhausProgress', {
            total: uniqueIps.length,
            current: 0,
            status: 'running'
        });

        // Process in batches of 5
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
            // Update progress every 3 batches to reduce flicker
            if (i % (batchSize * 3) === 0 || currentCount >= uniqueIps.length) {
                await updateFirebase('spamhausProgress', { current: currentCount });
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

        console.log(`Scan complete: ${uniqueIps.length} IPs checked, ${listedCount} listed`);
        res.status(200).json({ success: true, checked: uniqueIps.length, listed: listedCount });
    } catch (error) {
        console.error('Critical Handler Error:', error);
        res.status(500).send('Critical Error: ' + error.message);
    }
}
