const dns = require('dns').promises;

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
    const chatId = "-4933333573";
    
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

async function getSpfRecord(domain) {
    try {
        const dnsPromise = dns.resolveTxt(domain);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('DNS Timeout')), 1500)
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

function verifySpfRecord(spfRecord, type, domainInc, subdomainInc, rpType, serverIps, rpDomain) {
    const rpDom = (rpDomain || '').toLowerCase().trim();
    const dom = (domainInc || '').toLowerCase().trim();

    if (rpDom && dom && rpDom === dom) {
        return { ok: true, reason: 'OK' };
    }

    if (!spfRecord) return { ok: false, reason: 'No SPF Record' };

    if (Array.isArray(spfRecord)) {
        let passRecord = null;
        let failReasons = [];

        for (const record of spfRecord) {
            const verification = verifySpfRecord(
                record,
                type,
                domainInc,
                subdomainInc,
                rpType,
                serverIps,
                rpDomain
            );
            if (verification.ok === true) {
                passRecord = record;
                break;
            } else {
                failReasons.push(verification.reason);
            }
        }

        if (passRecord) {
            return { ok: 'warning', reason: 'Multiple SPF records found, but target is valid in one of them.' };
        } else {
            return { ok: false, reason: `Multiple SPF records found, and none are valid. Reasons: ${failReasons.join(' | ')}` };
        }
    }

    if (rpType === 'intern') {
        if (!serverIps || serverIps.length === 0) {
            return { ok: false, reason: 'No Server / IPs Attached' };
        }

        const terms = spfRecord.toLowerCase().split(/\s+/);
        const ip4Cidrs = [];

        for (let term of terms) {
            // Strip qualifiers
            if (['+', '-', '~', '?'].includes(term[0])) {
                term = term.slice(1);
            }
            if (term.startsWith('ip4:')) {
                ip4Cidrs.push(term.substring('ip4:'.length));
            }
        }

        const missingIps = [];
        for (const ip of serverIps) {
            let covered = false;
            for (const cidr of ip4Cidrs) {
                if (ipInCidr(ip, cidr)) {
                    covered = true;
                    break;
                }
            }
            if (!covered) {
                missingIps.push(ip);
            }
        }

        if (missingIps.length === 0) {
            return { ok: true, reason: 'OK' };
        } else {
            return { ok: false, reason: `Missing Server IPs: ${missingIps.join(', ')}` };
        }
    }
    const sub = (subdomainInc || '').toLowerCase().trim();

    if (!dom && !sub) {
        return { ok: false, reason: 'No Target Configured' };
    }

    const terms = spfRecord.toLowerCase().split(/\s+/);
    let foundInclude = false;
    let foundArecord = false;

    for (let term of terms) {
        // Strip qualifiers
        if (['+', '-', '~', '?'].includes(term[0])) {
            term = term.slice(1);
        }

        if (term.startsWith('include:')) {
            const target = term.substring('include:'.length);
            if ((dom && (target === dom || target.endsWith('.' + dom))) ||
                (sub && (target === sub || target.endsWith('.' + sub)))) {
                foundInclude = true;
            }
        } else if (term.startsWith('a:') || term === 'a' || term.startsWith('a/')) {
            let target = '';
            if (term.startsWith('a:')) {
                const parts = term.substring('a:'.length).split('/');
                target = parts[0];
            }
            if (target) {
                if ((dom && (target === dom || target.endsWith('.' + dom))) ||
                    (sub && (target === sub || target.endsWith('.' + sub)))) {
                    foundArecord = true;
                }
            }
        }
    }

    if (type === 'Include') {
        if (foundInclude) {
            return { ok: true, reason: 'OK' };
        }
        return { ok: false, reason: `Missing Include: ${dom || sub}` };
    } else if (type === 'Arecod') {
        if (foundArecord) {
            return { ok: true, reason: 'OK' };
        }
        return { ok: false, reason: `Missing Arecord: ${dom || sub}` };
    }

    return { ok: false, reason: `Invalid SPF Type: ${type}` };
}

async function safeDnsResolve(fn, domain) {
    try {
        const dnsPromise = fn(domain);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('DNS Timeout')), 1500)
        );
        return await Promise.race([dnsPromise, timeoutPromise]);
    } catch (e) {
        return null;
    }
}

function parseSpfMechanisms(spfRecord) {
    const terms = spfRecord.toLowerCase().split(/\s+/);
    const result = { includes: [], aRecords: [], ip4s: [], bareA: false };
    for (let term of terms) {
        if (['+', '-', '~', '?'].includes(term[0])) term = term.slice(1);
        if (term.startsWith('include:')) {
            result.includes.push(term.substring(8));
        } else if (term.startsWith('a:')) {
            result.aRecords.push(term.substring(2).split('/')[0]);
        } else if (term === 'a' || term.startsWith('a/')) {
            result.bareA = true;
        } else if (term.startsWith('ip4:')) {
            result.ip4s.push(term.substring(4));
        }
    }
    return result;
}

function matchIpAgainstServers(ipOrCidr, servers) {
    for (const s of servers) {
        for (const sIp of (s.allIps || [s.mainIp || s.ip]).filter(Boolean)) {
            if (ipInCidr(sIp, ipOrCidr)) return s.name;
        }
    }
    return null;
}

function extractRootDomain(domain) {
    const parts = domain.split('.');
    if (parts.length <= 2) return domain;
    return parts.slice(-2).join('.');
}

async function autoDetectRp(item, servers) {
    const domain = (item.rpDomain || '').trim().toLowerCase();
    if (!domain) return null;

    const spfRecord = await getSpfRecord(domain);
    if (!spfRecord) return null;

    const recordStr = Array.isArray(spfRecord) ? spfRecord[0] : spfRecord;
    if (!recordStr) return null;

    const mechs = parseSpfMechanisms(recordStr);

    // 1. Check ip4: mechanisms
    for (const ip4 of mechs.ip4s) {
        const srv = matchIpAgainstServers(ip4, servers);
        if (srv) {
            return {
                domainIncluded: domain, subdomainIncluded: domain,
                server: srv, spfType: 'Include', rpType: 'intern'
            };
        }
    }

    // 2. Check bare 'a' mechanism
    if (mechs.bareA) {
        const aIps = await safeDnsResolve(dns.resolve4, domain);
        if (aIps) {
            for (const aIp of aIps) {
                const srv = matchIpAgainstServers(aIp, servers);
                if (srv) {
                    return {
                        domainIncluded: domain, subdomainIncluded: domain,
                        server: srv, spfType: 'Arecod', rpType: 'intern'
                    };
                }
            }
        }
    }

    // 3. Check include: mechanisms (resolve 2 levels deep)
    for (const incDomain of mechs.includes) {
        const incSpf = await getSpfRecord(incDomain);
        if (!incSpf) continue;
        const incRecordStr = Array.isArray(incSpf) ? incSpf[0] : incSpf;
        if (!incRecordStr) continue;

        const incMechs = parseSpfMechanisms(incRecordStr);

        for (const ip4 of incMechs.ip4s) {
            const srv = matchIpAgainstServers(ip4, servers);
            if (srv) {
                const root = extractRootDomain(incDomain);
                return {
                    domainIncluded: root, subdomainIncluded: incDomain,
                    server: srv, spfType: 'Include', rpType: 'extern'
                };
            }
        }

        // Level 2: nested includes
        for (const nested of incMechs.includes) {
            const nestedSpf = await getSpfRecord(nested);
            if (!nestedSpf) continue;
            const nestedRecordStr = Array.isArray(nestedSpf) ? nestedSpf[0] : nestedSpf;
            if (!nestedRecordStr) continue;

            const nestedMechs = parseSpfMechanisms(nestedRecordStr);
            for (const ip4 of nestedMechs.ip4s) {
                const srv = matchIpAgainstServers(ip4, servers);
                if (srv) {
                    const root = extractRootDomain(incDomain);
                    return {
                        domainIncluded: root, subdomainIncluded: incDomain,
                        server: srv, spfType: 'Include', rpType: 'extern'
                    };
                }
            }
        }
    }

    // 4. Check a: mechanisms
    for (const aDomain of mechs.aRecords) {
        const aIps = await safeDnsResolve(dns.resolve4, aDomain);
        if (!aIps) continue;
        for (const aIp of aIps) {
            const srv = matchIpAgainstServers(aIp, servers);
            if (srv) {
                const root = extractRootDomain(aDomain);
                return {
                    domainIncluded: root, subdomainIncluded: aDomain,
                    server: srv, spfType: 'Arecod', rpType: 'extern'
                };
            }
        }
    }

    return null;
}

export default async function handler(req, res) {
    try {
        const rpInventory = await getFirebaseData('state/rpInventory') || [];
        const servers = await getFirebaseData('state/servers') || [];
        const rps = await getFirebaseData('state/rps') || [];
        
        if (rpInventory.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No RPs in inventory to check.',
                summary: { total: 0, ok: 0, error: 0 },
                results: []
            });
        }

        // Auto-detect missing SPF settings for RPs before checking
        for (const item of rpInventory) {
            if (item.rpDomain && (!item.domainIncluded || item.domainIncluded === '---' || item.domainIncluded === '')) {
                try {
                    const detected = await autoDetectRp(item, servers);
                    if (detected) {
                        item.domainIncluded = detected.domainIncluded || '';
                        item.subdomainIncluded = detected.subdomainIncluded || '';
                        item.srv = detected.server || '';
                        item.spfType = detected.spfType || 'Include';
                        item.rpType = detected.rpType || 'intern';

                        // Sync to rps array if it exists
                        const attachedServer = servers.find(s => s.name === detected.server);
                        if (attachedServer) {
                            const rpInRps = rps.find(r => (r.domain || '').trim().toLowerCase() === item.rpDomain.toLowerCase());
                            if (rpInRps) {
                                rpInRps.serverId = attachedServer.id;
                                rpInRps.mailerId = attachedServer.mailerId || null;
                                rpInRps.status = 'active';
                            }
                        }
                    }
                } catch (e) {
                    console.error(`Auto-detect failed for ${item.rpDomain} in cron:`, e);
                }
            }
        }

        const checkedAt = new Date().toISOString();
        const results = [];
        const chunkSize = 15;

        // Set initial progress
        await setFirebaseData('state/rpSpfProgress', { status: 'running', current: 0, total: rpInventory.length, timestamp: Date.now() });

        let processedCount = 0;

        // Process in chunks to prevent timeout / rate limiting
        for (let i = 0; i < rpInventory.length; i += chunkSize) {
            const chunk = rpInventory.slice(i, i + chunkSize);
            await Promise.all(chunk.map(async (item) => {
                const rpDomain = (item.rpDomain || '').trim();
                if (!rpDomain) return;

                const attachedServer = servers.find(s => s.name === item.srv);
                const serverIps = attachedServer ? (attachedServer.allIps || [attachedServer.mainIp || attachedServer.ip]).filter(Boolean) : [];

                const spfRecord = await getSpfRecord(rpDomain);
                const verification = verifySpfRecord(
                    spfRecord,
                    item.spfType || 'Include',
                    item.domainIncluded,
                    item.subdomainIncluded,
                    item.rpType || 'extern',
                    serverIps,
                    rpDomain
                );

                if (verification.ok === 'warning') {
                    item.spfStatus = 'WARNING';
                } else {
                    item.spfStatus = verification.ok ? 'OK' : 'ERROR';
                }
                item.spfStatusDetail = verification.reason;
                item.spfCheckedAt = checkedAt;

                results.push({
                    id: item.id,
                    rpDomain: item.rpDomain,
                    spfType: item.spfType,
                    domainIncluded: item.domainIncluded,
                    subdomainIncluded: item.subdomainIncluded,
                    spfStatus: item.spfStatus,
                    spfStatusDetail: item.spfStatusDetail,
                    spfCheckedAt: item.spfCheckedAt
                });
            }));

            processedCount += chunk.length;
            await setFirebaseData('state/rpSpfProgress', { 
                status: 'running', 
                current: Math.min(processedCount, rpInventory.length), 
                total: rpInventory.length,
                timestamp: Date.now()
            });
        }

        // Set completed progress state
        await setFirebaseData('state/rpSpfProgress', { status: 'idle', current: rpInventory.length, total: rpInventory.length, timestamp: Date.now() });

        // Save updated state back to Firebase
        await setFirebaseData('state/rpInventory', rpInventory);
        await setFirebaseData('state/rps', rps);

        const summary = {
            total: results.length,
            ok: results.filter(r => r.spfStatus === 'OK').length,
            warning: results.filter(r => r.spfStatus === 'WARNING').length,
            error: results.filter(r => r.spfStatus === 'ERROR').length
        };

        try {
            const isCron = req.headers['x-vercel-cron'] === 'true';
            const triggerType = isCron ? '⚙️ Automated Scheduled Check' : '👤 Manual Check';

            const errors = results.filter(r => r.spfStatus === 'ERROR');
            const warnings = results.filter(r => r.spfStatus === 'WARNING');

            let report = `<b>🔍 RPs SPF Check</b>\n`;
            report += `Status: ${errors.length > 0 ? '⚠️ ISSUES DETECTED' : '✅ ALL CLEAR'}\n\n`;

            if (errors.length > 0) {
                report += `<b>❌ Attention Required (SPF Errors):</b>\n`;
                const errorLines = errors.map(e => `• <b>${e.rpDomain}</b>: ${e.spfStatusDetail} (${e.spfType})`);
                const displayLines = errorLines.slice(0, 50);
                report += displayLines.join('\n');
                if (errorLines.length > 50) report += `\n...and ${errorLines.length - 50} more.`;
                report += `\n\n`;
            }

            // Do not add the "could be ok" warnings into the notification list, only "not ok" errors

            report += `<b>📊 Summary:</b>\n`;
            report += `✅ Total OK: ${summary.ok}\n`;
            if (summary.warning > 0) {
                report += `⚠️ Total Could be OK: ${summary.warning}\n`;
            }
            report += `❌ Total ERROR: ${summary.error}\n`;
            report += `⏰ Time: ${new Date().toLocaleString()}\n`;
            report += triggerType;

            await sendTelegram(report);
        } catch (telegramErr) {
            console.error('Telegram report failed:', telegramErr);
        }

        return res.status(200).json({
            success: true,
            summary,
            results
        });

    } catch (err) {
        console.error('SPF Check Handler Error:', err);
        // Reset progress on error
        await setFirebaseData('state/rpSpfProgress', { status: 'idle', current: 0, total: 0, timestamp: Date.now() });
        return res.status(500).json({ success: false, error: err.message });
    }
}
