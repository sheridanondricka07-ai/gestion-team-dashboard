const dns = require('dns').promises;
const https = require('https');

const DB_URL = "https://gestion-team-c-default-rtdb.firebaseio.com";

async function getFirebaseData(path) {
    try {
        const resp = await fetch(`${DB_URL}/${path}.json`);
        return await resp.json();
    } catch (e) {
        console.error('Firebase REST Error:', e);
        return null;
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

async function sendTelegram(message) {
    const token = "8737550836:AAFK68Ig7xyW3KIvBhI5gpO1bGaPTwUimr0";
    const chatId = "-5252005797";
    
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

export default async function handler(req, res) {
    // Only allow Vercel Cron to trigger this
    if (!req.headers['x-vercel-cron'] && process.env.NODE_ENV === 'production') {
        return res.status(405).send('Method Not Allowed');
    }

    const now = new Date();
    const hour = now.getUTCHours(); // UTC time
    
    console.log(`Cron Master started at ${now.toISOString()} (Hour: ${hour})`);

    const results = {
        spamhausTriggered: false,
        vmtaTriggered: false
    };

    // 1. Trigger Spamhaus Check (Once a day at 09:00 UTC)
    if (hour === 9) {
        console.log('Triggering Spamhaus Check...');
        try {
            // We call our own API endpoint. 
            // Note: We use a full URL here. In Vercel, we can use the VERCEL_URL env var.
            const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
            fetch(`${baseUrl}/api/check-spamhaus`, {
                headers: { 'x-vercel-cron': 'true' }
            }).catch(e => console.error('Spamhaus Async Trigger Error:', e));
            results.spamhausTriggered = true;
        } catch (e) {
            console.error('Spamhaus Trigger Error:', e);
        }
    }

    // 2. Trigger VMTA Check (3 times a day: 09:00, 15:00, 21:00 UTC)
    if ([9, 15, 21].includes(hour)) {
        console.log('Running VMTA Check...');
        try {
            const servers = await getFirebaseData('state/servers') || [];
            let allIps = [];
            servers.forEach(s => { if (s && s.allIps) allIps = allIps.concat(s.allIps); });
            const uniqueIps = [...new Set(allIps)];

            if (uniqueIps.length > 0) {
                const vmtaResults = {};
                const chunkSize = 10;
                
                for (let i = 0; i < uniqueIps.length; i += chunkSize) {
                    const chunk = uniqueIps.slice(i, i + chunkSize);
                    await Promise.all(chunk.map(async (ip) => {
                        try {
                            const ptrs = await dns.reverse(ip);
                            vmtaResults[ip.replace(/\./g, '_')] = {
                                ptr: ptrs[0] || 'No PTR record',
                                status: ptrs[0] ? 'OK' : 'ERROR',
                                timestamp: new Date().toLocaleString()
                            };
                        } catch (err) {
                            vmtaResults[ip.replace(/\./g, '_')] = {
                                ptr: 'NXDOMAIN / No PTR',
                                status: 'ERROR',
                                timestamp: new Date().toLocaleString()
                            };
                        }
                    }));
                }

                await updateFirebaseData('state/vmtaResults', vmtaResults);
                
                // Build Telegram Report
                let okCount = 0;
                let errorCount = 0;
                let errorLines = [];

                for (const ip of uniqueIps) {
                    const safeIp = ip.replace(/\./g, '_');
                    const data = vmtaResults[safeIp];
                    
                    if (data && data.status === 'OK') {
                        okCount++;
                    } else {
                        errorCount++;
                        // Find server name for this IP
                        const server = servers.find(s => s.allIps && s.allIps.includes(ip));
                        const ptr = data ? data.ptr : 'Lookup Failed';
                        errorLines.push(`• <b>${server ? server.name : 'Unknown'}</b>: ${ip} (${ptr})`);
                    }
                }

                let report = `<b>🔍 VMTA/PTR Check Report</b>\n`;
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
                report += `⚙️ Automated Scheduled Check`;

                await sendTelegram(report);

                results.vmtaTriggered = true;
                results.vmtaCount = uniqueIps.length;
            }
        } catch (e) {
            console.error('VMTA Check Error:', e);
        }
    }

    return res.status(200).json(results);
}
