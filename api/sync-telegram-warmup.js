const DB_URL = "https://gestion-team-e-default-rtdb.firebaseio.com";
const BOT_TOKEN = "8827415405:AAH-sAnTE7rz_i4XSTFG6tjBX0g0BYPyn6E";

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
                const isTargetGroup = chatId === "-1002633168986" || chatId === "-1003727758817";
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
        }
        
        // Fetch all warmupData from Firebase to return to client
        const allData = await getFirebaseData('warmupData') || {};
        
        if (addedCount > 0) {
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
