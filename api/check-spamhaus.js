// Spamhaus REST API - ported from working spamhaus-checker project
// Uses api.spamhaus.org with token auth - pure HTTPS

const DB_URL = "https://gestion-team-d-default-rtdb.firebaseio.com";

// Credentials from working project
const SPAMHAUS_USERNAME = "ypihcpsh@98907859";
const SPAMHAUS_PASSWORD = "E1l0&su7d,zVEiP6";

let authToken = null;

async function sendTelegram(message) {
    const token = "8854626437:AAETvyVLsi_NWbiUkeZxqs-r74VoTVGb4KE";
    const chatId = "-5109098387";
    
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); 

        const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            }),
            signal: controller.signal
        });
        clearTimeout(timeout);
        return await resp.json();
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

async function updateFirebaseData(path, data) {
    try {
        const resp = await fetch(`${DB_URL}/${path}.json`, {
            method: 'PATCH',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
        await resp.text();
    } catch (e) {
        console.error('Firebase REST Error:', e);
    }
}

async function setFirebaseData(path, data) {
    try {
        const resp = await fetch(`${DB_URL}/${path}.json`, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
        await resp.text();
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
    // Using the 'cidr/ALL' endpoint for comprehensive checking.
    await new Promise(r => setTimeout(r, 200)); 

    const endpoint = `https://api.spamhaus.org/api/intel/v1/byobject/cidr/ALL/listed/live/${ip}`;
    
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
            const results = data.results || (data.id ? [data] : []);
            const records = Array.isArray(results) ? results : [];
            
            if (records.length > 0) {
                // DEEP SEARCH for SBL or CSS in any field
                let foundRecord = null;
                let foundType = null;

                for (const r of records) {
                    const allData = JSON.stringify(r).toUpperCase();
                    // Prioritize SBL then CSS
                    if (allData.includes('SBL')) {
                        foundRecord = r;
                        foundType = 'SBL';
                        break; 
                    }
                    if (allData.includes('CSS')) {
                        foundRecord = r;
                        foundType = 'CSS';
                    }
                }
                
                if (foundRecord) {
                    return {
                        status: 'listed',
                        list: foundType,
                        listedDate: foundRecord.listed ? new Date(foundRecord.listed * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        expires: foundRecord.valid_until ? new Date(foundRecord.valid_until * 1000).toISOString().split('T')[0] : '-',
                        reason: foundRecord.rule || foundRecord.heuristic || `Listed on ${foundType}`
                    };
                }
            }
        }
    } catch (e) {
        if (retryCount < 2) {
            return await checkIP(ip, token, retryCount + 1);
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
        
        // --- PARALLEL BATCH SCAN LOGIC ---
        await setFirebaseData('state/spamhausProgress', {
            total: uniqueIps.length,
            current: 0,
            status: 'running',
            lastUpdate: Date.now()
        });

        const batchSize = 25;
        let finalResults = {};
        
        for (let i = 0; i < uniqueIps.length; i += batchSize) {
            const batch = uniqueIps.slice(i, i + batchSize);
            await Promise.all(batch.map(async (ip) => {
                const result = await checkIP(ip, token);
                const safeIp = ip.replace(/\./g, '_');
                finalResults[safeIp] = { ...result, timestamp: timestamp };
            }));

            // Update progress state periodically
            await updateFirebaseData('state/spamhausProgress', { 
                current: Math.min(i + batch.length, uniqueIps.length),
                lastUpdate: Date.now()
            });
            
            if (i + batchSize < uniqueIps.length) {
                await new Promise(r => setTimeout(r, 150));
            }
        }

        // Save updated results back to Firebase
        await setFirebaseData('state/spamhaus', finalResults);
        await setFirebaseData('state/spamhausLastUpdate', new Date().toLocaleString());
        await updateFirebaseData('state/spamhausProgress', { status: 'idle' });
        
        let listedCount = 0;
        let cleanCount = 0;
        const newlyListed = [];
        const newlyCleaned = [];

        // Fetch yesterday's history for comparison
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const yesterdayKey = yesterday.toISOString().split('T')[0];
        const yesterdayData = await getFirebaseData(`state/spamhausHistory/${yesterdayKey}`) || {};
        const yesterdayResults = yesterdayData.results || {};

        for (const ip of uniqueIps) {
            const safeIp = ip.replace(/\./g, '_');
            const res = finalResults[safeIp] || {};
            const prev = yesterdayResults[safeIp] || {};
            if (res.status === 'listed') {
                listedCount++;
                if (prev.status !== 'listed') {
                    newlyListed.push(ip);
                }
            } else {
                cleanCount++;
                if (prev.status === 'listed') {
                    newlyCleaned.push(ip);
                }
            }
        }

        const dateKey = new Date().toISOString().split('T')[0];
        await setFirebaseData(`state/spamhausHistory/${dateKey}`, {
            timestamp: Date.now(),
            results: finalResults,
            summary: {
                total: uniqueIps.length,
                listed: listedCount,
                clean: cleanCount,
                timestamp: Date.now()
            }
        });

        // Build and send Telegram report
        try {

            let tg_msg = `🛡️ <b>Spamhaus Report</b>\n`;
            tg_msg += `📅 <i>${new Date().toLocaleString()}</i>\n\n`;
            tg_msg += `📊 <b>Global Stats:</b>\n`;
            tg_msg += `• Total Checked: ${uniqueIps.length}\n`;
            tg_msg += `• 🔴 Listed IPs: <b>${listedCount}</b>\n`;
            tg_msg += `• 🟢 Clean IPs: <b>${cleanCount}</b>\n\n`;

            if (newlyListed.length > 0 || newlyCleaned.length > 0) {
                tg_msg += `🔄 <b>Changes:</b>\n`;
                if (newlyListed.length > 0) {
                    tg_msg += `🔥 <b>Newly Listed (${newlyListed.length}):</b>\n`;
                    tg_msg += newlyListed.slice(0, 10).map(ip => `🔴 ${ip}`).join('\n') + '\n';
                }
                if (newlyCleaned.length > 0) {
                    tg_msg += `✨ <b>Newly Cleaned (${newlyCleaned.length}):</b>\n`;
                    tg_msg += newlyCleaned.slice(0, 10).map(ip => `🟢 ${ip}`).join('\n') + '\n';
                }
                tg_msg += '\n';
            }

            if (listedCount > 0) {
                tg_msg += `⚠️ <b>Status Alert:</b> ${listedCount} listings currently active.`;
            } else {
                tg_msg += `✅ <b>Status Clear:</b> All IPs are clean.`;
            }

            tg_msg += `\n\n🔗 <a href="https://gestion-team-dashboard.vercel.app/">Open Dashboard</a>`;
            
            await sendTelegram(tg_msg);
        } catch (tgErr) {
            console.error('Failed to send Spamhaus Telegram report:', tgErr);
        }

        return res.status(200).json({ 
            success: true, 
            total: uniqueIps.length
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
