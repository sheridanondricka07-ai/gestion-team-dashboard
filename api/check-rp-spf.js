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
        await fetch(`${DB_URL}/${path}.json`, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.error('Firebase REST Error:', e);
    }
}

async function getSpfRecord(domain) {
    try {
        const records = await dns.resolveTxt(domain);
        const spfRecord = records
            .map(chunks => chunks.join(''))
            .find(record => record.toLowerCase().startsWith('v=spf1'));
        return spfRecord || null;
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
    if (!spfRecord) return { ok: false, reason: 'No SPF Record' };

    const rpDom = (rpDomain || '').toLowerCase().trim();
    const dom = (domainInc || '').toLowerCase().trim();

    if (rpDom && dom && rpDom === dom) {
        return { ok: true, reason: 'OK' };
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
    
    const dom = (domainInc || '').toLowerCase().trim();
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

export default async function handler(req, res) {
    try {
        const rpInventory = await getFirebaseData('state/rpInventory') || [];
        const servers = await getFirebaseData('state/servers') || [];
        
        if (rpInventory.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No RPs in inventory to check.',
                summary: { total: 0, ok: 0, error: 0 },
                results: []
            });
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

                item.spfStatus = verification.ok ? 'OK' : 'ERROR';
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

        const summary = {
            total: results.length,
            ok: results.filter(r => r.spfStatus === 'OK').length,
            error: results.filter(r => r.spfStatus === 'ERROR').length
        };

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
