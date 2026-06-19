const DB_URL = "https://gestion-team-e-default-rtdb.firebaseio.com";
const BOT_TOKEN = "8827415405:AAH-sAnTE7rz_i4XSTFG6tjBX0g0BYPyn6E";
const UPGRADE_BOT_TOKEN = "8975320309:AAFQmIeTKMbxQMv4c8_UHSczUYYZ9mcJ8FA";
const dns = require('dns').promises;

function ipInCidr(ip, cidr) {
    const [range, bitsStr] = cidr.split('/');
    if (!bitsStr) {
        return ip === range;
    }
    const bits = parseInt(bitsStr, 10);
    if (isNaN(bits)) return ip === range;

    const ipParts = ip.split('.').map(Number);
    const rangeParts = range.split('.').map(Number);

    if (ipParts.length !== 4 || rangeParts.length !== 4) return false;

    const ipNum = ((ipParts[0] * 256 + ipParts[1]) * 256 + ipParts[2]) * 256 + ipParts[3];
    const rangeNum = ((rangeParts[0] * 256 + rangeParts[1]) * 256 + rangeParts[2]) * 256 + rangeParts[3];
    const mask = bits === 0 ? 0 : (0xFFFFFFFF << (32 - bits));

    return (ipNum & mask) === (rangeNum & mask);
}

async function getSpfRecord(domain) {
    try {
        const records = await dns.resolveTxt(domain);
        const spfRecords = records
            .map(chunks => chunks.join(''))
            .filter(record => record.toLowerCase().startsWith('v=spf1'));
        if (spfRecords.length === 0) return null;
        return spfRecords[0];
    } catch (err) {
        return null;
    }
}

async function detectAndAddNewRp(domain, ip, serverName) {
    if (!domain || domain.toLowerCase() === '[rdns]' || domain.toLowerCase() === 'rdns') {
        return;
    }

    try {
        const rpInventory = await getFirebaseData('state/rpInventory') || [];
        const rps = await getFirebaseData('state/rps') || [];
        const servers = await getFirebaseData('state/servers') || [];

        const cleanDom = domain.toLowerCase().trim();
        
        // Check if already exists in rpInventory
        const exists = rpInventory.some(item => (item.rpDomain || '').toLowerCase().trim() === cleanDom);
        if (exists) return;

        // Determine RP Type (intern or extern) by checking SPF
        let rpType = 'extern';
        const spf = await getSpfRecord(cleanDom);
        if (spf) {
            const terms = spf.toLowerCase().split(/\s+/);
            let hasDirectIp = false;
            for (let term of terms) {
                if (['+', '-', '~', '?'].includes(term[0])) term = term.slice(1);
                if (term.startsWith('ip4:')) {
                    const cidr = term.substring(4);
                    if (ipInCidr(ip, cidr)) {
                        hasDirectIp = true;
                        break;
                    }
                }
            }
            if (hasDirectIp) {
                rpType = 'intern';
            }
        }

        // Add to rpInventory
        const nextId = rpInventory.reduce((max, item) => Math.max(max, parseInt(item.id, 10) || 0), 0) + 1;
        const newRpItem = {
            id: nextId,
            rpDomain: cleanDom,
            domainIncluded: cleanDom,
            subdomainIncluded: cleanDom,
            spfType: 'Include',
            srv: serverName,
            rpType: rpType,
            alreadySent: false,
            spfStatus: 'OK',
            spfCheckedAt: new Date().toISOString()
        };
        rpInventory.push(newRpItem);
        await putFirebaseData('state/rpInventory', rpInventory);

        // Add to rps
        const attachedServer = servers.find(s => s.name === serverName);
        const serverId = attachedServer ? attachedServer.id : null;
        const mailerId = attachedServer ? (attachedServer.mailerId || null) : null;
        const nextRpId = rps.reduce((max, r) => Math.max(max, parseInt(r.id, 10) || 0), 0) + 1;
        
        const newRpInRps = {
            id: nextRpId,
            domain: cleanDom,
            serverId: serverId,
            mailerId: mailerId,
            status: 'active'
        };
        rps.push(newRpInRps);
        await putFirebaseData('state/rps', rps);

        console.log(`Automatically added new RP domain ${cleanDom} (${rpType}) for server ${serverName}`);
    } catch (e) {
        console.error("Error in detectAndAddNewRp:", e);
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

async function saveFirebaseData(path, data) {
    try {
        await fetch(`${DB_URL}/${path}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return true;
    } catch (e) {
        console.error("Firebase write error:", e);
        return false;
    }
}

async function putFirebaseData(path, data) {
    try {
        await fetch(`${DB_URL}/${path}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return true;
    } catch (e) {
        console.error("Firebase put error:", e);
        return false;
    }
}

async function processAutoWarmup(allData, newRecords) {
    try {
        const autoNotifiedState = await getFirebaseData('state/autoWarmupNotified') || {};
        const queueState = await getFirebaseData('state/autoWarmupQueue') || {};
        
        const updatedKeys = new Set();
        if (newRecords) {
            Object.values(newRecords).forEach(r => {
                if (!r.domain && !r.ip && !r.server) return;
                const key = `${r.domain || ''}_${r.server || ''}_${r.ip || ''}`;
                updatedKeys.add(key);
            });
        }

        let newNotified = false;
        let newQueue = false;

        // 1. Prune warmupData older than 30 days to optimize Firebase storage space
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        let pruneCount = 0;
        const prunedData = {};
        let dataChanged = false;
        
        Object.entries(allData).forEach(([key, val]) => {
            if (val && val.timestamp && val.timestamp < thirtyDaysAgo) {
                dataChanged = true;
                pruneCount++;
            } else {
                prunedData[key] = val;
            }
        });
        
        if (dataChanged) {
            console.log(`Pruned ${pruneCount} old warmup records.`);
            await putFirebaseData('warmupData', prunedData);
            allData = prunedData;
        }

        const grouped = {};
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        
        Object.values(allData).forEach(r => {
            if (!r.domain && !r.ip && !r.server) return;
            // Pre-filter: Only check drops from the last 24 hours
            if (r.timestamp && r.timestamp < cutoff) return;

            const key = `${r.domain || ''}_${r.server || ''}_${r.ip || ''}`;
            if (!grouped[key]) grouped[key] = { ...r, records: [] };
            grouped[key].records.push(r);
        });

        // Find the maximum sendAt currently in the queue to schedule after it
        let maxSendAt = Date.now() - 5000;
        Object.values(queueState).forEach(item => {
            if (item && item.sendAt > maxSendAt) {
                maxSendAt = item.sendAt;
            }
        });

        for (const key in grouped) {
            if (newRecords && !updatedKeys.has(key)) continue;
            
            const g = grouped[key];
            

            g.records.sort((a, b) => b.timestamp - a.timestamp);
            if (g.records.length < 3) continue;

            // Check if 3 last drops succeeded (OUT >= 0.95 * IN)
            let success = true;
            for (let i = 0; i < 3; i++) {
                const r = g.records[i];
                if (!r.timestamp || r.timestamp < cutoff) {
                    success = false;
                    break;
                }
                const inVal = parseInt(r.inVal, 10) || 0;
                const outVal = parseInt(r.outVal, 10) || 0;
                if (inVal <= 0 || outVal < inVal * 0.95) {
                    success = false;
                    break;
                }
            }

            if (success) {
                const latestVal = parseInt(g.records[0].inVal, 10) || 0;
                const LEVELS = [50, 100, 200, 300, 500, 760, 1000, 1500, 2000, 3000, 5000, 7000, 8000, 10000, 15000, 19000, 21000, 26000, 30000];
                const nextTarget = LEVELS.find(l => l > latestVal) || latestVal;
                
                const isRdns = !g.domain || g.domain.toLowerCase().trim() === '[rdns]' || g.domain.toLowerCase().trim() === 'rdns';
                const cleanDomain = isRdns ? (g.ip || 'unknown') : (g.domain || g.ip || 'unknown');
                const safeDomain = cleanDomain.replace(/[\.\#\$\[\]]/g, '_');
                const safeKey = `${safeDomain}_${g.server}_${nextTarget}`;

                // Auto-detect and register domain in RPs inventory if it's a new custom domain
                if (!isRdns && g.domain) {
                    await detectAndAddNewRp(g.domain, g.ip, g.server);
                }

                if (!autoNotifiedState[safeKey]) {
                    // Queue first message (send_size)
                    const msg1 = `update ${g.server} send_size for ${cleanDomain} to ${nextTarget}`;
                    const queueId1 = "q_" + safeKey + "_send_size";
                    
                    maxSendAt = Math.max(Date.now(), maxSendAt + 5000);
                    queueState[queueId1] = {
                        chat_id: "-5317343683",
                        text: msg1,
                        sendAt: maxSendAt
                    };

                    // Queue second message (test_after)
                    const testAfterVal = Math.round((nextTarget / 2) + 3);
                    const msg2 = `update ${g.server} test_after for ${cleanDomain} to ${testAfterVal}`;
                    const queueId2 = "q_" + safeKey + "_test_after";
                    
                    maxSendAt = maxSendAt + 5000;
                    queueState[queueId2] = {
                        chat_id: "-5317343683",
                        text: msg2,
                        sendAt: maxSendAt
                    };

                    autoNotifiedState[safeKey] = true;
                    newNotified = true;
                    newQueue = true;
                }
            }
        }

        if (newNotified) {
            await putFirebaseData('state/autoWarmupNotified', autoNotifiedState);
        }

        if (newQueue) {
            await putFirebaseData('state/autoWarmupQueue', queueState);
        }
    } catch (e) {
        console.error("Error in processAutoWarmup:", e);
    }
}

async function processAutoWarmupQueue() {
    try {
        const queueState = await getFirebaseData('state/autoWarmupQueue') || {};
        const now = Date.now();
        let changed = false;

        // Sort items by scheduled time ascending
        const items = Object.entries(queueState)
            .map(([id, val]) => ({ id, ...val }))
            .sort((a, b) => a.sendAt - b.sendAt);

        const dueItems = items.filter(item => item.sendAt <= now);

        if (dueItems.length > 0) {
            const itemToSend = dueItems[0];
            
            // Send the oldest due message
            await fetch(`https://api.telegram.org/bot${UPGRADE_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: itemToSend.chat_id,
                    text: itemToSend.text
                })
            });

            delete queueState[itemToSend.id];
            changed = true;

            // Shift any other due/soon-due items forward so they are spaced by at least 5 seconds
            let nextSendAt = now + 5000;
            for (let i = 1; i < items.length; i++) {
                const item = items[i];
                if (item.id === itemToSend.id) continue;
                
                if (queueState[item.id] && queueState[item.id].sendAt < nextSendAt) {
                    queueState[item.id].sendAt = nextSendAt;
                    changed = true;
                }
                nextSendAt += 5000;
            }
        }

        if (changed) {
            await putFirebaseData('state/autoWarmupQueue', queueState);
        }
    } catch (e) {
        console.error("Error in processAutoWarmupQueue:", e);
    }
}

function parseMessage(text, timestamp) {
    if (!text || !text.includes('Server Deployment Summary')) return null;
    
    const lines = text.split('\n').map(l => l.trim());
    
    // 1. User
    let user = 'Unknown';
    const userLine = lines.find(l => l.includes('User:'));
    if (userLine) {
        user = userLine.split('User:')[1].trim();
    }
    
    // 2. IP Address
    let ip = '';
    const ipLine = lines.find(l => l.includes('【IP】:'));
    if (ipLine) {
        ip = ipLine.split('【IP】:')[1].trim();
    }
    
    // 3. Server name, IN, OUT, Domain
    let server = '';
    let inVal = 0;
    let outVal = 0;
    let domain = '';
    
    const summaryIdx = lines.findIndex(l => l.includes('Server Deployment Summary'));
    const ipIdx = lines.findIndex(l => l.includes('【IP】:'));
    
    if (summaryIdx !== -1 && ipIdx !== -1) {
        const sublines = lines.slice(summaryIdx + 1, ipIdx).map(l => l.trim()).filter(l => l !== '' && !l.startsWith('---'));
        
        if (sublines.length >= 2) {
            const serverLine = sublines[1];  // e.g. "s_wmn3_2233 1510 1510" or "sh_wmn3_6 7013 7012"
            
            const serverParts = serverLine.split(/\s+/);
            if (serverParts.length >= 3) {
                server = serverParts[0];
                inVal = parseInt(serverParts[1], 10) || 0;
                outVal = parseInt(serverParts[2], 10) || 0;
            } else if (serverParts.length >= 1) {
                server = serverParts[0];
                // Try parsing values from the previous line if it has numbers
                const volumesLine = sublines[0]; // e.g. "1510 (IN) 1510 (OUT)"
                const matches = volumesLine.match(/(\d+)\s*\(IN\)\s*(\d+)\s*\(OUT\)/i);
                if (matches) {
                    inVal = parseInt(matches[1], 10) || 0;
                    outVal = parseInt(matches[2], 10) || 0;
                }
            }
            
            if (sublines.length >= 3) {
                domain = sublines[2]; // e.g. "lodoguide.com"
            }
        }
    }
    
    if (!server && !ip) return null;
    
    return {
        user,
        server,
        inVal,
        outVal,
        domain,
        ip,
        timestamp
    };
}

async function parseRequestBody(req) {
    if (req.body) return req.body;
    const buffers = [];
    for await (const chunk of req) {
        buffers.push(chunk);
    }
    const rawBody = Buffer.concat(buffers).toString('utf8');
    if (!rawBody) return null;
    try {
        return JSON.parse(rawBody);
    } catch (e) {
        return null;
    }
}

export default async function handler(req, res) {
    try {
        let results = [];
        let isTelegramWebhook = false;
        
        if (req.method === 'POST') {
            // Webhook mode: a single update object is sent in the body
            const update = await parseRequestBody(req);
            if (update && update.update_id) {
                results = [update];
                isTelegramWebhook = true;
                
                // Write debug log of raw payload (Disabled to prevent massive Firebase storage/bandwidth usage)
                /*
                try {
                    const msg = update.message || update.edited_message || update.channel_post;
                    const logEntry = {
                        timestamp: Date.now(),
                        update_id: update.update_id,
                        chat_id: msg && msg.chat ? msg.chat.id : null,
                        chat_title: msg && msg.chat ? msg.chat.title : null,
                        from: msg && msg.from ? (msg.from.username || msg.from.first_name) : null,
                        text: msg ? msg.text : null,
                        raw: JSON.stringify(update)
                    };
                    await fetch(`${DB_URL}/warmupRawLogs/${update.update_id}.json`, {
                        method: 'PUT',
                        body: JSON.stringify(logEntry),
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch (e) {
                    console.error("Failed to write raw debug log:", e);
                }
                */
            } else if (update && update.text) {
                // Direct POST of message text from external script
                const fakeMessageId = "ext_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
                results = [{
                    update_id: Date.now(),
                    message: {
                        message_id: fakeMessageId,
                        date: Math.floor(Date.now() / 1000),
                        chat: { id: "-1002633168986", type: "supergroup" },
                        text: update.text
                    }
                }];
            }
        } else {
            // Polling mode: Fetch updates from Telegram Bot API
            const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`;
            const tgResp = await fetch(tgUrl);
            const tgData = await tgResp.json();
            
            if (tgData.ok) {
                results = tgData.result || [];
            } else {
                console.warn('Telegram API getUpdates returned error:', tgData.description);
                // Return empty results instead of crashing if getUpdates is disabled by webhook
                results = [];
            }
        }
        
        const newRecords = {};
        let addedCount = 0;
        
        results.forEach(update => {
            const msg = update.message || update.edited_message || update.channel_post;
            if (msg && msg.text) {
                const chatId = msg.chat ? String(msg.chat.id) : "";
                const isTargetGroup = chatId === "-1002633168986" || chatId === "-1003727758817" || chatId === "-5317343683";
                const isPrivate = msg.chat && msg.chat.type === "private";
                
                if (!isTargetGroup && !isPrivate) {
                    return;
                }

                const messageId = msg.message_id;
                const timestamp = msg.date * 1000; // Telegram date is in Unix seconds
                const parsed = parseMessage(msg.text, timestamp);
                if (parsed) {
                    parsed.messageId = messageId;
                    newRecords[messageId] = parsed;
                    addedCount++;
                }
            }
        });
        
        if (addedCount > 0) {
            await saveFirebaseData('warmupData', newRecords);
        }        // Fetch all warmupData from Firebase if needed (when new records are added or not in webhook mode)
        let allData = {};
        if (addedCount > 0 || !isTelegramWebhook) {
            allData = await getFirebaseData('warmupData') || {};
        }
        
        // Process delayed auto target upgrades
        await processAutoWarmupQueue();

        if (addedCount > 0) {
            // Run the auto target upgrade checks
            await processAutoWarmup(allData, newRecords);

            if (!isTelegramWebhook) {
                try {
                    const notifiedState = await getFirebaseData('state/warmupNotified') || {};
                    let newNotified = false;
                    
                    const grouped = {};
                    Object.values(allData).forEach(r => {
                        if (!r.domain && !r.ip && !r.server) return;
                        const key = `${r.domain || ''}_${r.server || ''}_${r.ip || ''}`;
                        if (!grouped[key]) grouped[key] = { ...r, records: [] };
                        grouped[key].records.push(r);
                    });
                    
                    const getRepOut = (drops) => {
                        const nonZeros = drops.filter(v => v > 0);
                        if (nonZeros.length === 0) return 0;
                        if (nonZeros.length === 1) return nonZeros[0];
                        nonZeros.sort((a, b) => b - a);
                        for (let i = 0; i < nonZeros.length; i++) {
                            for (let j = i + 1; j < nonZeros.length; j++) {
                                const maxVal = Math.max(nonZeros[i], nonZeros[j]);
                                const minVal = Math.min(nonZeros[i], nonZeros[j]);
                                if (maxVal > 0 && (maxVal - minVal) / maxVal <= 0.3) return maxVal;
                            }
                        }
                        return nonZeros[0];
                    };
                    
                    const notifToken = "8888454016:AAH04qHHycwZTnXoRFlvRBwQ2yEwPaYVdwQ";
                    const notifChatId = "-1003735130681";
                    
                    for (const key in grouped) {
                        const g = grouped[key];
                        g.records.sort((a, b) => b.timestamp - a.timestamp);
                        const allOuts = g.records.map(r => r.outVal);
                        const repOut = getRepOut(allOuts);
                        
                        const safeDomain = (g.domain || g.ip || g.server || 'unknown').replace(/[\.\#\$\[\]]/g, '_');
                        
                        if (repOut > 25900 && !notifiedState[safeDomain]) {
                            const text = `🎯 <b>Warmup Target Reached!</b>\n\n` + 
                                         `🌐 Domain: <b>${g.domain || 'N/A'}</b>\n` +
                                         `📌 IP: <code>${g.ip || 'Unknown'}</code>\n` + 
                                         `🖥 Server: ${g.server || 'Unknown'}\n` + 
                                         `📊 Rep Out: <b>${repOut}</b>\n\n` + 
                                         `<i>Target (>25900) achieved.</i>`;
                                         
                            await fetch(`https://api.telegram.org/bot${notifToken}/sendMessage`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    chat_id: notifChatId,
                                    message_thread_id: 91,
                                    text: text,
                                    parse_mode: 'HTML'
                                })
                            });
                            
                            notifiedState[safeDomain] = true;
                            newNotified = true;
                        }
                    }
                    
                    if (newNotified) {
                        await fetch(`${DB_URL}/state/warmupNotified.json`, {
                            method: 'PUT',
                            body: JSON.stringify(notifiedState),
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                } catch (err) {
                    console.error("Error during notification check:", err);
                }
            }
        }
        
        if (isTelegramWebhook) {
            return res.status(200).json({ 
                success: true, 
                addedCount 
            });
        }
        
        return res.status(200).json({ 
            success: true, 
            addedCount, 
            totalCount: Object.keys(allData).length,
            records: Object.values(allData)
        });
    } catch (e) {
        console.error("Error in sync-telegram-warmup:", e);
        return res.status(500).json({ error: e.message });
    }
}

export const config = {
    api: {
        bodyParser: false,
    },
};
