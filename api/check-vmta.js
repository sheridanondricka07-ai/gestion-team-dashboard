const dns = require('dns').promises;

const DB_URL = "https://gestion-team-d-default-rtdb.firebaseio.com";

async function sendTelegram(message) {
    const token = "8888454016:AAH04qHHycwZTnXoRFlvRBwQ2yEwPaYVdwQ";
    const chatId = "-1003735130681";
    
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout for Telegram

        const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_thread_id: 4,
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

async function getFirebaseData(path) {
    try {
        const resp = await fetch(`${DB_URL}/${path}.json`);
        return await resp.json();
    } catch (e) {
        return null;
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { ips } = req.body;

    if (!ips || !Array.isArray(ips)) {
        return res.status(400).json({ error: 'Invalid IPs provided' });
    }

    const results = {};
    const servers = await getFirebaseData('state/servers') || [];

    const rdnsMatches = (resolvedPtr, expectedHost) => {
        if (!resolvedPtr || !expectedHost) return false;
        let r = resolvedPtr.trim().toLowerCase().replace(/\.$/, '');
        let e = expectedHost.trim().toLowerCase().replace(/\.$/, '');
        if (r === e) return true;
        if (r.endsWith('.' + e) || e.endsWith('.' + r)) return true;
        return false;
    };
    
    const vmtaUpdates = {}; // Track vmtaMap updates for auto-sync

    const checkIp = async (ip, expectedHost) => {
        try {
            const ptrs = await dns.reverse(ip);
            const resolved = ptrs[0];
            let isOk = false;
            let autoUpdated = false;
            
            if (resolved) {
                const cleanHost = resolved.trim().replace(/\.$/, '');
                let resolvedIps = [];
                try {
                    resolvedIps = await dns.resolve4(cleanHost);
                } catch (e) {
                    // Ignore resolution failure and leave array empty
                }
                
                if (resolvedIps.includes(ip)) {
                    isOk = true;
                    // If the active PTR doesn't match the old vmtaMap expected host, auto-update it
                    if (expectedHost && expectedHost !== '---') {
                        const matchesExpected = rdnsMatches(resolved, expectedHost);
                        if (!matchesExpected) {
                            autoUpdated = true;
                        }
                    } else {
                        autoUpdated = true;
                    }
                }
            }
            
            return {
                ptr: resolved || 'No PTR record',
                status: isOk ? 'OK' : 'ERROR',
                autoUpdated,
                timestamp: new Date().toLocaleString()
            };
        } catch (err) {
            return {
                ptr: 'NXDOMAIN / No PTR',
                status: 'ERROR',
                autoUpdated: false,
                timestamp: new Date().toLocaleString(),
                error: err.code
            };
        }
    };

    // Chunk processing (10 at a time) to be stable
    const chunkSize = 10;
    for (let i = 0; i < ips.length; i += chunkSize) {
        const chunk = ips.slice(i, i + chunkSize);
        const chunkResults = await Promise.all(chunk.map(async (ip) => {
            const safeIp = ip.replace(/\./g, '_');
            const server = servers.find(s => s.allIps && s.allIps.includes(ip));
            const serverIdx = servers.indexOf(server);
            const expectedHost = server && server.vmtaMap && server.vmtaMap[safeIp];
            
            const data = await checkIp(ip, expectedHost);

            // Auto-update vmtaMap if domain changed (valid PTR but didn't match old entry)
            if (data.autoUpdated && server && serverIdx !== -1) {
                const newDomain = data.ptr.replace(/\.$/, '');
                // Track history of old domain
                const historyEntry = {
                    domain: expectedHost,
                    date: new Date().toISOString().split('T')[0]
                };
                if (!data.history) data.history = [];
                // Get existing history from previous results
                const existingResult = await getFirebaseData(`state/vmtaResults/${safeIp}`);
                if (existingResult && existingResult.history) {
                    data.history = existingResult.history;
                }
                // Add old domain to history if not already there
                if (expectedHost && !data.history.some(h => h.domain === expectedHost)) {
                    data.history.push(historyEntry);
                }
                // Queue vmtaMap update
                vmtaUpdates[`state/servers/${serverIdx}/vmtaMap/${safeIp}`] = newDomain;
            }

            return [safeIp, data];
        }));
        
        chunkResults.forEach(([key, val]) => {
            results[key] = val;
        });
    }

    // Apply vmtaMap updates to Firebase so next check uses new domains
    for (const [path, value] of Object.entries(vmtaUpdates)) {
        try {
            await fetch(`${DB_URL}/${path}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(value)
            });
        } catch (e) {
            console.error('Failed to update vmtaMap:', path, e);
        }
    }

    let telegramResponse = null;
    // Send Telegram Notification for Manual Check
    try {
        let okCount = 0;
        let errorCount = 0;
        let errorLines = [];

        for (const ip of ips) {
            const safeIp = ip.replace(/\./g, '_');
            const data = results[safeIp];
            
            if (data && data.status === 'OK') {
                okCount++;
            } else {
                errorCount++;
                const server = servers.find(s => s.allIps && s.allIps.includes(ip));
                const expectedHost = server && server.vmtaMap && server.vmtaMap[safeIp];
                const ptr = data ? data.ptr : 'Lookup Failed';
                let detail = ptr;
                if (expectedHost && expectedHost !== '---' && ptr !== 'NXDOMAIN / No PTR' && ptr !== 'No PTR record') {
                    detail = `${ptr} [expected: ${expectedHost}]`;
                }
                errorLines.push(`• <b>${server ? server.name : 'Unknown'}</b>: ${ip} (${detail})`);
            }
        }

        let report = `<b>👆 Manual PTR/RDNS Check</b>\n`;
        report += `Status: ${errorCount > 0 ? '⚠️ ISSUES DETECTED' : '✅ ALL CLEAR'}\n\n`;
        
        if (errorLines.length > 0) {
            report += `<b>❌ Attention Required:</b>\n`;
            const displayLines = errorLines.slice(0, 50); 
            report += displayLines.join('\n');
            if (errorLines.length > 50) report += `\n...and ${errorLines.length - 50} more.`;
            report += `\n\n`;
        }

        report += `<b>📊 Summary:</b>\n`;
        report += `✅ Total OK: ${okCount}\n`;
        report += `❌ Total ERROR: ${errorCount}\n`;
        report += `⏰ Time: ${new Date().toLocaleString()}\n`;
        report += `👤 Triggered from Dashboard`;

        console.log('Sending Telegram report for manual check...');
        telegramResponse = await sendTelegram(report);
    } catch (e) {
        console.error('Telegram Logic Error:', e);
        telegramResponse = JSON.stringify({ ok: false, error: e.message });
    }

    return res.status(200).json({ results, telegram: telegramResponse });
}
