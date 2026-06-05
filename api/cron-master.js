const dns = require('dns').promises;
const https = require('https');

const DB_URL = "https://gestion-team-d-default-rtdb.firebaseio.com";

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
        const resp = await fetch(`${DB_URL}/${path}.json`, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await resp.text();
        if (!resp.ok) {
            console.error(`Firebase PUT Error (${resp.status}) for ${path}:`, result);
        }
    } catch (e) {
        console.error('Firebase REST Error (setFirebaseData):', e);
    }
}

async function updateFirebaseData(path, data) {
    try {
        const resp = await fetch(`${DB_URL}/${path}.json`, {
            method: 'PATCH',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await resp.text();
        if (!resp.ok) {
            console.error(`Firebase PATCH Error (${resp.status}) for ${path}:`, result);
        }
    } catch (e) {
        console.error('Firebase REST Error (updateFirebaseData):', e);
    }
}

async function sendTelegram(message, topicId = 6) {
    const token = "8888454016:AAH04qHHycwZTnXoRFlvRBwQ2yEwPaYVdwQ";
    const chatId = "-1003735130681";
    
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); 

        const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_thread_id: topicId,
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
    // Only allow authorized triggers
    const isCronJobOrg = req.headers['authorization'] === 'Bearer internal-cron-secret';
    if (!req.headers['x-vercel-cron'] && !isCronJobOrg && process.env.NODE_ENV === 'production') {
        return res.status(405).send('Method Not Allowed');
    }

    const task = req.query.task;
    const now = new Date();
    const hour = now.getUTCHours(); // UTC time
    
    console.log(`Cron Master started at ${now.toISOString()} (Hour: ${hour}, Override Task: ${task || 'none'})`);

    const results = {
        spamhausTriggered: false,
        vmtaTriggered: false,
        spfTriggered: false,
        ptrSpfTriggered: false
    };

    const runSpamhaus = task === 'all' || task === 'spamhaus' || (!task && [0, 8, 16].includes(hour));
    const runVmta = task === 'all' || task === 'vmta' || task === 'rdns' || (!task && hour % 3 === 0);
    const runGmail = task === 'all' || task === 'gmail' || (!task && [12, 18].includes(hour));
    const runSpf = task === 'all' || task === 'spf' || (!task && hour === 9);
    const runGmailStatus = task === 'all' || task === 'gmail-status' || (!task && hour === 9);
    const runPtrSpf = task === 'all' || task === 'ptr-spf' || !task;

    // 1. Trigger Spamhaus Check
    if (runSpamhaus) {
        console.log('Triggering Spamhaus Check...');
        try {
            // We call our own API endpoint. 
            // Note: We use a full URL here. In Vercel, we can use the VERCEL_URL env var.
            const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
            const triggerResp = await fetch(`${baseUrl}/api/check-spamhaus`, {
                method: 'POST',
                headers: { 'x-vercel-cron': 'true' }
            });
            const triggerData = await triggerResp.json().catch(() => ({}));
            console.log('Spamhaus Trigger Response:', triggerData);
            results.spamhausTriggered = true;
            results.spamhausTriggerData = triggerData;
        } catch (e) {
            console.error('Spamhaus Trigger Error:', e);
        }
    }

    // 2. Trigger VMTA Check (Twice a day: 09:00, 21:00 UTC)
    if (runVmta) {
        console.log('Running VMTA Check...');
        try {
            const servers = await getFirebaseData('state/servers') || [];
            let allIps = [];
            servers.forEach(s => { if (s && s.allIps) allIps = allIps.concat(s.allIps); });
            const uniqueIps = [...new Set(allIps)];

            if (uniqueIps.length > 0) {
                const vmtaResults = {};
                const chunkSize = 10;

                const rdnsMatches = (resolvedPtr, expectedHost) => {
                    if (!resolvedPtr || !expectedHost) return false;
                    let r = resolvedPtr.trim().toLowerCase().replace(/\.$/, '');
                    let e = expectedHost.trim().toLowerCase().replace(/\.$/, '');
                    if (r === e) return true;
                    if (r.endsWith('.' + e) || e.endsWith('.' + r)) return true;
                    return false;
                };
                
                for (let i = 0; i < uniqueIps.length; i += chunkSize) {
                    const chunk = uniqueIps.slice(i, i + chunkSize);
                    await Promise.all(chunk.map(async (ip) => {
                        const safeIp = ip.replace(/\./g, '_');
                        const server = servers.find(s => s.allIps && s.allIps.includes(ip));
                        const expectedHost = server && server.vmtaMap && server.vmtaMap[safeIp];
                        try {
                            const ptrs = await dns.reverse(ip);
                            const resolved = ptrs[0];
                            let isOk = false;
                            if (resolved) {
                                if (expectedHost && expectedHost !== '---') {
                                    isOk = rdnsMatches(resolved, expectedHost);
                                } else {
                                    isOk = true;
                                }
                            }
                            vmtaResults[safeIp] = {
                                ptr: resolved || 'No PTR record',
                                status: isOk ? 'OK' : 'ERROR',
                                timestamp: new Date().toLocaleString()
                            };
                        } catch (err) {
                            vmtaResults[safeIp] = {
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
                        const expectedHost = server && server.vmtaMap && server.vmtaMap[safeIp];
                        const ptr = data ? data.ptr : 'Lookup Failed';
                        let detail = ptr;
                        if (expectedHost && expectedHost !== '---' && ptr !== 'NXDOMAIN / No PTR' && ptr !== 'No PTR record') {
                            detail = `${ptr} [expected: ${expectedHost}]`;
                        }
                        errorLines.push(`• <b>${server ? server.name : 'Unknown'}</b>: ${ip} (${detail})`);
                    }
                }

                let report = `<b>🔍 Automated PTR/RDNS Check</b>\n`;
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

                await sendTelegram(report, 4);

                results.vmtaTriggered = true;
                results.vmtaCount = uniqueIps.length;
            }
        } catch (e) {
            console.error('VMTA Check Error:', e);
        }
    }

    // 3. Automated Gmail VMTA Sync (New schedule: 12:00, 18:00 UTC)
    if (runGmail) {
        console.log('Running Automated Gmail Sync...');
        try {
            const gmail = await getFirebaseData('state/gmail');
            const servers = await getFirebaseData('state/servers') || [];
            
            if (gmail && gmail.email && gmail.password && servers.length > 0) {
                const imap = require('imap-simple');
                const config = {
                    imap: {
                        user: gmail.email,
                        password: gmail.password,
                        host: 'imap.gmail.com', port: 993, tls: true,
                        authTimeout: 15000, tlsOptions: { rejectUnauthorized: false }
                    }
                };

                const connection = await imap.connect(config);
                const boxes = ['INBOX', '[Gmail]/Spam'];
                const discoveredMappings = {};
                const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

                let targetIps = [];
                servers.forEach(s => { if (s && s.allIps) targetIps = targetIps.concat(s.allIps); });

                for (const boxName of boxes) {
                    try {
                        await connection.openBox(boxName);
                        const messages = await connection.search([['SINCE', new Date()]], { bodies: ['HEADER'], markSeen: false });
                        const sorted = messages.sort((a, b) => b.attributes.uid - a.attributes.uid).slice(0, 500);

                        for (const msg of sorted) {
                            if (new Date(msg.attributes.date) < twoHoursAgo) continue;
                            const rh = msg.parts.find(p => p.which === 'HEADER').body.received || [];
                            const rList = Array.isArray(rh) ? rh : [rh];
                            for (const line of rList) {
                                if (line.includes('by mx.google.com')) {
                                    const m = line.match(/from\s+([^\s\(\)]+)\s+\([^\)]*?\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]\)/i);
                                    if (m && targetIps.includes(m[2])) discoveredMappings[m[2]] = m[1];
                                }
                            }
                        }
                    } catch (e) {}
                }
                connection.end();

                // Detect Changes
                let changes = [];
                const updatedServers = servers.map(srv => {
                    if (!srv.vmtaMap) srv.vmtaMap = {};
                    (srv.allIps || []).forEach(ip => {
                        const safeIp = ip.replace(/\./g, '_');
                        const oldVmta = srv.vmtaMap[safeIp] || '---';
                        const newVmta = discoveredMappings[ip];
                        
                        if (newVmta && oldVmta !== newVmta) {
                            changes.push(`• <b>${ip}</b>: <code>${oldVmta}</code> → <b>${newVmta}</b>`);
                            srv.vmtaMap[safeIp] = newVmta;
                        }
                    });
                    return srv;
                });

                if (changes.length > 0) {
                    await setFirebaseData('state/servers', updatedServers);
                    let report = `<b>🔄 VMTA Changes Detected</b>\n`;
                    report += `The following mappings were updated from Gmail:\n\n`;
                    report += changes.join('\n');
                    report += `\n\n⏰ Time: ${new Date().toLocaleString()}\n⚙️ Automated Scheduled Sync`;
                    await sendTelegram(report, 6);
                }
                
                results.gmailSyncTriggered = true;
                results.gmailChangesFound = changes.length;
            }
        } catch (e) { console.error('Automated Gmail Sync Error:', e); }
    }

    // 4. Trigger SPF Check
    if (runSpf) {
        console.log('Triggering SPF Check...');
        try {
            const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
            const triggerResp = await fetch(`${baseUrl}/api/check-rp-spf`, {
                method: 'POST',
                headers: { 'x-vercel-cron': 'true' }
            });
            const triggerData = await triggerResp.json().catch(() => ({}));
            console.log('SPF Trigger Response:', triggerData);
            
            if (triggerData && triggerData.success) {
                results.spfTriggered = true;
                results.spfSummary = triggerData.summary;
            }
        } catch (e) {
            console.error('SPF Trigger Error:', e);
        }
    }

    // 5. Automated Gmail IP Placement Status Sync (Daily at 10:30 AM Morocco Time / 09:30 UTC)
    if (runGmailStatus) {
        console.log('Running Automated Gmail IP Placement Status Sync...');
        try {
            const gmail = await getFirebaseData('state/gmail');
            const servers = await getFirebaseData('state/servers') || [];
            
            if (gmail && gmail.email && gmail.password && servers.length > 0) {
                const imap = require('imap-simple');
                const config = {
                    imap: {
                        user: gmail.email,
                        password: gmail.password,
                        host: 'imap.gmail.com', port: 993, tls: true,
                        authTimeout: 15000, tlsOptions: { rejectUnauthorized: false }
                    }
                };

                let targetIps = [];
                servers.forEach(s => { if (s && s.allIps) targetIps = targetIps.concat(s.allIps); });

                const resultsObj = {}; // { [ip]: { folder: 'INBOX'|'SPAM', returnPath: '...', headerRdns: '...', status: '...' } }
                
                if (targetIps.length > 0) {
                    const vmtaResults = await getFirebaseData('state/vmtaResults') || {};
                    const rdnsMap = {};
                    Object.entries(vmtaResults).forEach(([safeIp, data]) => {
                        rdnsMap[safeIp] = (data.ptr || '').toLowerCase().trim();
                    });

                    const connection = await imap.connect(config);
                    const boxes = ['INBOX', '[Gmail]/Spam'];
                    const timeWindow = new Date(Date.now() - 90 * 60 * 1000);

                    for (const boxName of boxes) {
                        try {
                            await connection.openBox(boxName);
                            const searchCriteria = [['SINCE', new Date()]];
                            const messages = await connection.search(searchCriteria, { bodies: ['HEADER'], markSeen: false });
                            const sorted = messages.sort((a, b) => b.attributes.uid - a.attributes.uid);

                            for (const msg of sorted) {
                                if (new Date(msg.attributes.date) < timeWindow) break;
                                
                                const headers = msg.parts.find(p => p.which === 'HEADER').body;
                                const headerKeys = Object.keys(headers);
                                const getHeader = (name) => {
                                    const key = headerKeys.find(k => k.toLowerCase() === name.toLowerCase());
                                    return (headers[key] || [])[0] || '';
                                };

                                const returnPath = getHeader('return-path').replace(/[<>]/g, '').trim();
                                const receivedHeaders = headers.received || [];
                                const receivedList = Array.isArray(receivedHeaders) ? receivedHeaders : [receivedHeaders];

                                for (const rh of receivedList) {
                                    if (rh.includes('by mx.google.com')) {
                                        const match = rh.match(/from\s+([^\s\(\)]+)\s+\([^\)]*?\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]\)/i);
                                        if (match) {
                                            const headerRdns = match[1].toLowerCase().trim();
                                            const ip = match[2];
                                            if (targetIps.includes(ip)) {
                                                const folder = boxName.toLowerCase().includes('spam') ? 'SPAM' : 'INBOX';
                                                
                                                const safeIp = ip.replace(/\./g, '_');
                                                const stateRdns = (rdnsMap[safeIp] || '').toLowerCase().trim();
                                                const targetRdns = stateRdns || headerRdns;
                                                const rpFull = returnPath.toLowerCase().trim();
                                                const rpDomain = rpFull.includes('@') ? rpFull.split('@')[1] : rpFull;

                                                let statusVal = 'none';
                                                if (folder === 'INBOX') {
                                                    const isMatch = (targetRdns && rpDomain && (rpFull.includes(targetRdns) || targetRdns.includes(rpDomain)));
                                                    statusVal = isMatch ? 'rdns' : 'rp_test';
                                                } else if (folder === 'SPAM') {
                                                    statusVal = 'spam';
                                                }

                                                const priority = { 'rdns': 3, 'rp_test': 2, 'spam': 1, 'none': 0 };
                                                const existing = resultsObj[ip];
                                                let replace = false;
                                                if (!existing) {
                                                    replace = true;
                                                } else {
                                                    const existingStatus = existing.status || 'none';
                                                    if (priority[statusVal] > priority[existingStatus]) {
                                                        replace = true;
                                                    }
                                                }

                                                if (replace) {
                                                    resultsObj[ip] = { folder, returnPath, headerRdns, status: statusVal };
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            console.error(`Error scanning box ${boxName}:`, e);
                        }
                    }
                    connection.end();
                }

                const foundIpsCount = Object.keys(resultsObj).length;
                const formattedDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

                if (foundIpsCount === 0) {
                    // Update database to fill all as DOWN using per-IP PATCH
                    const statuses = await getFirebaseData('state/statuses') || {};
                    const today = new Date().toISOString().split('T')[0];
                    const statusUpdates = {};
                    targetIps.forEach(ip => {
                        const safeIp = ip.replace(/\./g, '_');
                        const current = (statuses[safeIp] && statuses[safeIp][today]) || 'none';
                        if (current === 'none' || current === 'down') {
                            statusUpdates[`${safeIp}/${today}`] = 'down';
                        }
                    });
                    if (Object.keys(statusUpdates).length > 0) {
                        await updateFirebaseData('state/statuses', statusUpdates);
                    }

                    // Send Telegram Warning
                    const telegramMessage = `⚠️ <b>Daily Gmail IP Delivery Sync: IPs Not Found</b>\n` +
                                            `📅 <b>Date:</b> ${formattedDate}\n` +
                                            `⏰ <b>Time:</b> 10:30 AM (Morocco Time)\n\n` +
                                            `🔴 <b>No IPs Found:</b> No delivery data or IP headers were matched in your recent emails (last 90 mins).\n` +
                                            `<i>All target IPs have been marked as DOWN in the dashboard. Please verify test email delivery.</i>`;
                    await sendTelegram(telegramMessage, 6);

                    results.gmailStatusSyncTriggered = true;
                    results.gmailStatusStats = { totalChecked: targetIps.length, rdnsCount: 0, rpTestCount: 0, spamCount: 0, downCount: targetIps.length };
                } else {
                    // Resolve PTR domains from vmtaResults
                    const vmtaResults = await getFirebaseData('state/vmtaResults') || {};
                    const rdnsMap = {};
                    Object.entries(vmtaResults).forEach(([safeIp, data]) => {
                        rdnsMap[safeIp] = (data.ptr || '').toLowerCase().trim();
                    });

                    // Update statuses in Firebase
                    const statuses = await getFirebaseData('state/statuses') || {};
                    const today = new Date().toISOString().split('T')[0];

                    let rdnsCount = 0;
                    let rpTestCount = 0;
                    let spamCount = 0;
                    let downCount = 0;

                    targetIps.forEach(ip => {
                        const safeIp = ip.replace(/\./g, '_');
                        if (!statuses[safeIp]) statuses[safeIp] = {};

                        const info = resultsObj[ip];
                        if (info) {
                            const stateRdns = (rdnsMap[safeIp] || '').toLowerCase().trim();
                            const headerRdns = (info.headerRdns || '').toLowerCase().trim();
                            const targetRdns = stateRdns || headerRdns;

                            const rpFull = (info.returnPath || '').toLowerCase().trim();
                            const rpDomain = rpFull.includes('@') ? rpFull.split('@')[1] : rpFull;

                            const folder = info.folder;
                            let newStatusId = 'none';

                            if (folder === 'INBOX') {
                                const isMatch = (targetRdns && rpDomain && (rpFull.includes(targetRdns) || targetRdns.includes(rpDomain)));
                                newStatusId = isMatch ? 'rdns' : 'rp_test';
                            } else if (folder === 'SPAM') {
                                newStatusId = 'spam';
                            }

                            // Priority override rules: RDNS > RP TEST > SPAM
                            const currentStatusId = statuses[safeIp][today] || 'none';
                            let shouldApply = false;
                            if (newStatusId === 'rdns') {
                                shouldApply = true;
                            } else if (newStatusId === 'rp_test') {
                                if (currentStatusId !== 'rdns') shouldApply = true;
                            } else if (newStatusId === 'spam') {
                                if (currentStatusId === 'none' || currentStatusId === 'spam' || currentStatusId === 'down') shouldApply = true;
                            }

                            if (shouldApply) {
                                statuses[safeIp][today] = newStatusId;
                            }
                        } else {
                            // Only overwrite to 'down' if there is no active success/spam delivery status today
                            const current = statuses[safeIp][today] || 'none';
                            if (current === 'none' || current === 'down') {
                                statuses[safeIp][today] = 'down';
                            }
                        }

                        // Final counts
                        const finalStatus = statuses[safeIp][today];
                        if (finalStatus === 'rdns') rdnsCount++;
                        else if (finalStatus === 'rp_test') rpTestCount++;
                        else if (finalStatus === 'spam') spamCount++;
                        else if (finalStatus === 'down') downCount++;
                    });

                    // Write each IP's status for today using PATCH (prevents race conditions with client saveState)
                    const statusUpdates = {};
                    targetIps.forEach(ip => {
                        const safeIp = ip.replace(/\./g, '_');
                        if (statuses[safeIp] && statuses[safeIp][today]) {
                            statusUpdates[`${safeIp}/${today}`] = statuses[safeIp][today];
                        }
                    });
                    if (Object.keys(statusUpdates).length > 0) {
                        await updateFirebaseData('state/statuses', statusUpdates);
                    }

                    // Send Telegram Success Report
                    const telegramMessage = `📥 <b>Daily Gmail IP Delivery Sync</b>\n` +
                                            `📅 <b>Date:</b> ${formattedDate}\n` +
                                            `⏰ <b>Time:</b> 10:30 AM (Morocco Time)\n\n` +
                                            `📊 <b>STATUS SUMMARY:</b>\n` +
                                            `• <b>Total Checked:</b> <code>${targetIps.length}</code> IPs\n` +
                                            `• 🟢 <b>RDNS (Inbox Match):</b> <code>${rdnsCount}</code> IPs\n` +
                                            `• 🟢 <b>RP TEST (Inbox Unmatched):</b> <code>${rpTestCount}</code> IPs\n` +
                                            `• 🔴 <b>SPAM:</b> <code>${spamCount}</code> IPs\n` +
                                            `• 🟠 <b>Not Received (DOWN):</b> <code>${downCount}</code> IPs\n\n` +
                                            `⚙️ <i>All IP statuses successfully updated and filled in the dashboard.</i>`;
                    await sendTelegram(telegramMessage, 6);

                    results.gmailStatusSyncTriggered = true;
                    results.gmailStatusStats = { totalChecked: targetIps.length, rdnsCount, rpTestCount, spamCount, downCount };
                }
            }
        } catch (e) {
            console.error('Automated Gmail IP Status Sync Error:', e);
        }
    }

    // 6. Trigger PTR SPF Check (Hourly)
    if (runPtrSpf) {
        console.log('Triggering PTR SPF Check...');
        try {
            const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
            const triggerResp = await fetch(`${baseUrl}/api/check-ptr-spf`, {
                method: 'POST',
                headers: { 'x-vercel-cron': 'true' }
            });
            const triggerData = await triggerResp.json().catch(() => ({}));
            console.log('PTR SPF Trigger Response:', triggerData);
            results.ptrSpfTriggered = true;
            results.ptrSpfTriggerData = triggerData;
        } catch (e) {
            console.error('PTR SPF Trigger Error:', e);
        }
    }

    // 7. Trigger Telegram Warmup Sync
    console.log('Triggering Telegram Warmup Sync...');
    try {
        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
        const triggerResp = await fetch(`${baseUrl}/api/sync-telegram-warmup`);
        const triggerData = await triggerResp.json().catch(() => ({}));
        console.log('Telegram Warmup Sync Response:', triggerData);
        results.telegramWarmupTriggered = true;
        results.telegramWarmupTriggerData = triggerData;
    } catch (e) {
        console.error('Telegram Warmup Sync Error:', e);
    }

    return res.status(200).json(results);
}
