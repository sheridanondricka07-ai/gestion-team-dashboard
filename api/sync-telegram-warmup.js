const DB_URL = "https://gestion-team-c-default-rtdb.firebaseio.com";
const BOT_TOKEN = "8277348945:AAGd4UVlLqxKiQUF4wdVMTs_VonGoMfEgfk";

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

export default async function handler(req, res) {
    try {
        // Fetch updates from Telegram Bot API
        const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`;
        const tgResp = await fetch(tgUrl);
        const tgData = await tgResp.json();
        
        if (!tgData.ok) {
            return res.status(500).json({ error: 'Telegram API returned error: ' + tgData.description });
        }
        
        const results = tgData.result || [];
        const newRecords = {};
        let addedCount = 0;
        
        results.forEach(update => {
            const msg = update.message || update.edited_message || update.channel_post;
            if (msg && msg.text) {
                const chatId = msg.chat ? String(msg.chat.id) : "";
                const isTargetGroup = chatId === "-1002633168986";
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
            await saveFirebaseData('state/warmupData', newRecords);
        }
        
        // Fetch all warmupData from Firebase to return to client
        const allData = await getFirebaseData('state/warmupData') || {};
        
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
