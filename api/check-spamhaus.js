// DNS-over-HTTPS with DQS key to avoid rate limiting
// Uses Cloudflare DoH as primary, Google DoH as fallback

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

// Small delay helper to avoid rate limits
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkIP(ip) {
    const reversedIP = ip.split('.').reverse().join('.');
    
    // Use DQS key with the professional zone to avoid rate limiting
    const dqsKey = 'vizecvum';
    const query = `${reversedIP}.${dqsKey}.zen.dq.spamhaus.net`;
    
    // Try Cloudflare DoH first, then Google DoH as fallback
    const dohProviders = [
        `https://cloudflare-dns.com/dns-query?name=${query}&type=A`,
        `https://dns.google/resolve?name=${query}&type=A`
    ];

    for (const dohUrl of dohProviders) {
        try {
            const response = await fetch(dohUrl, {
                headers: { 'Accept': 'application/dns-json' },
                signal: AbortSignal.timeout(8000)
            });

            if (!response.ok) continue;

            const data = await response.json();
            
            // NXDOMAIN or no answers = clean
            if (data.Status === 3 || !data.Answer || data.Answer.length === 0) {
                return { status: 'clean' };
            }

            // Parse all A record answers
            for (const answer of data.Answer) {
                if (answer.type !== 1) continue; // Only A records
                const result = answer.data;

                // Refusal codes
                if (result === '127.0.0.1' || result.startsWith('127.255.255')) {
                    console.log(`IP ${ip} -> Refused (${result}), trying next provider...`);
                    break; // Try next DoH provider
                }

                // SBL
                if (result === '127.0.0.2') return { status: 'listed', list: 'SBL' };
                // CSS  
                if (result === '127.0.0.3') return { status: 'listed', list: 'CSS' };
                
                // Other Spamhaus lists - user only wants SBL/CSS
                console.log(`IP ${ip} -> Other list code: ${result}`);
                return { status: 'clean' };
            }
        } catch (error) {
            console.log(`IP ${ip} -> DoH error with provider: ${error.message}`);
            continue; // Try next provider
        }
    }

    return { status: 'clean' };
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
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

        // Smaller batches (3) with delays to avoid rate limiting
        const batchSize = 3;
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
            
            // Update progress every 3 batches
            if (i % (batchSize * 3) === 0 || currentCount >= uniqueIps.length) {
                await updateFirebase('spamhausProgress', { current: currentCount });
            }
            
            // Small delay between batches to prevent rate limiting
            await delay(200);
        }

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
