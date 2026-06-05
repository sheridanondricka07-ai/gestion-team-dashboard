const dns = require('dns').promises;

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
        await resp.text();
    } catch (e) {
        console.error('Firebase REST Error:', e);
    }
}

async function sendTelegram(message) {
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
                message_thread_id: 8,
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
        const dnsPromise = dns.resolveTxt(domain);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('DNS Timeout')), 2000)
        );
        const records = await Promise.race([dnsPromise, timeoutPromise]);

        const spfRecords = records
            .map(chunks => chunks.join(''))
            .filter(record => record.toLowerCase().startsWith('v=spf1'));
        if (spfRecords.length === 0) return null;
        if (spfRecords.length === 1) return spfRecords[0];
        return spfRecords;
    } catch (err) {
        return null;
    }
}

async function checkIpInSpf(ip, domain, depth = 0) {
    if (depth > 3) return false; 
    
    const spfRecord = await getSpfRecord(domain);
    if (!spfRecord) return false;
    
    if (Array.isArray(spfRecord)) {
        for (const record of spfRecord) {
            if (await verifySpfRaw(ip, record, domain, depth)) {
                return true;
            }
        }
        return false;
    }
    
    return await verifySpfRaw(ip, spfRecord, domain, depth);
}

async function verifySpfRaw(ip, spfRecord, domain, depth) {
    const terms = spfRecord.toLowerCase().split(/\s+/);
    let redirectDomain = null;
    
    for (let term of terms) {
        if (['+', '-', '~', '?'].includes(term[0])) {
            term = term.slice(1);
        }
        
        if (term.startsWith('ip4:')) {
            const cidr = term.substring('ip4:'.length);
            if (ipInCidr(ip, cidr)) return true;
        } else if (term.startsWith('a:') || term === 'a' || term.startsWith('a/')) {
            let targetDomain = domain;
            if (term.startsWith('a:')) {
                targetDomain = term.substring('a:'.length).split('/')[0];
            }
            try {
                const ips = await dns.resolve4(targetDomain).catch(() => []);
                if (ips.includes(ip)) return true;
            } catch (e) {}
        } else if (term.startsWith('mx:') || term === 'mx' || term.startsWith('mx/')) {
            let targetDomain = domain;
            if (term.startsWith('mx:')) {
                targetDomain = term.substring('mx:'.length).split('/')[0];
            }
            try {
                const mxRecords = await dns.resolveMx(targetDomain).catch(() => []);
                const mxHosts = mxRecords.map(r => r.exchange);
                for (const host of mxHosts) {
                    const ips = await dns.resolve4(host).catch(() => []);
                    if (ips.includes(ip)) return true;
                }
            } catch (e) {}
        } else if (term.startsWith('include:')) {
            const incDomain = term.substring('include:'.length);
            const matched = await checkIpInSpf(ip, incDomain, depth + 1);
            if (matched) return true;
        } else if (term.startsWith('redirect=')) {
            redirectDomain = term.substring('redirect='.length);
        }
    }
    
    if (redirectDomain) {
        return await checkIpInSpf(ip, redirectDomain, depth + 1);
    }
    
    return false;
}

export default async function handler(req, res) {
    try {
        const servers = await getFirebaseData('state/servers') || [];
        const ipToServerMap = {};

        servers.forEach(s => {
            if (!s) return;
            const ips = [];
            if (s.allIps && Array.isArray(s.allIps)) {
                s.allIps.forEach(ip => { if (ip) ips.push(ip); });
            }
            if (s.mainIp) ips.push(s.mainIp);
            if (s.ip) ips.push(s.ip);
            
            const uniqueServerIps = [...new Set(ips)];
            uniqueServerIps.forEach(ip => {
                if (!ipToServerMap[ip]) {
                    ipToServerMap[ip] = [];
                }
                ipToServerMap[ip].push(s.name || 'Unknown Server');
            });
        });

        const uniqueIps = Object.keys(ipToServerMap);
        
        if (uniqueIps.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No server IPs to check.',
                results: []
            });
        }

        const results = [];
        const chunkSize = 100;
        
        for (let i = 0; i < uniqueIps.length; i += chunkSize) {
            const chunk = uniqueIps.slice(i, i + chunkSize);
            await Promise.all(chunk.map(async (ip) => {
                const serverNames = ipToServerMap[ip].join(', ');
                let ptr = 'No PTR record';
                let status = 'FAIL';
                let reason = 'Lookup Failed';
                
                try {
                    const ptrs = await dns.reverse(ip);
                    if (ptrs && ptrs.length > 0) {
                        ptr = ptrs[0];
                        const ok = await checkIpInSpf(ip, ptr);
                        if (ok) {
                            status = 'OK';
                            reason = 'IP exists in SPF';
                        } else {
                            status = 'FAIL';
                            reason = 'IP not found in SPF';
                        }
                    } else {
                        reason = 'No PTR record found';
                    }
                } catch (err) {
                    reason = `PTR resolution failed: ${err.message}`;
                }
                
                results.push({
                    ip,
                    servers: serverNames,
                    ptr,
                    status,
                    reason,
                    timestamp: new Date().toISOString()
                });
            }));
        }

        // Save results to Firebase
        await setFirebaseData('state/ptrSpfResults', {
            checkedAt: new Date().toISOString(),
            results
        });

        const failures = results.filter(r => r.status === 'FAIL');
        
        if (failures.length > 0) {
            let message = `<b>🔍 Hourly PTR SPF Check Failures</b>\n`;
            message += `Status: ⚠️ ISSUES DETECTED\n\n`;
            message += `The following IPs do not have their corresponding server IP included in their PTR domain's SPF record:\n\n`;
            
            failures.forEach(f => {
                message += `• <b>${f.servers}</b>\n  IP: <code>${f.ip}</code>\n  PTR: <code>${f.ptr}</code>\n  Reason: <i>${f.reason}</i>\n\n`;
            });
            
            message += `⏰ Check Time: ${new Date().toLocaleString()}`;
            await sendTelegram(message);
        }

        return res.status(200).json({
            success: true,
            totalChecked: uniqueIps.length,
            failuresCount: failures.length,
            results
        });

    } catch (err) {
        console.error('check-ptr-spf error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
