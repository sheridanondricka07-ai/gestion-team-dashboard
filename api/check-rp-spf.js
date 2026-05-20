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

function verifySpfRecord(spfRecord, type, domainInc, subdomainInc) {
    if (!spfRecord) return { ok: false, reason: 'No SPF Record' };
    
    const spf = spfRecord.toLowerCase().replace(/\s/g, '');
    const dom = (domainInc || '').toLowerCase().trim();
    const sub = (subdomainInc || '').toLowerCase().trim();

    if (!dom && !sub) {
        return { ok: false, reason: 'No Target Configured' };
    }

    if (type === 'Include') {
        const hasDom = dom && spf.includes(`include:${dom}`);
        const hasSub = sub && spf.includes(`include:${sub}`);
        if (hasDom || hasSub) {
            return { ok: true, reason: 'OK' };
        }
        return { ok: false, reason: `Missing Include: ${dom || sub}` };
    } else if (type === 'Arecod') {
        const hasDom = dom && (spf.includes(`a:${dom}`) || spf.includes(`a/${dom}`));
        const hasSub = sub && (spf.includes(`a:${sub}`) || spf.includes(`a/${sub}`));
        if (hasDom || hasSub) {
            return { ok: true, reason: 'OK' };
        }
        return { ok: false, reason: `Missing Arecord: ${dom || sub}` };
    }

    return { ok: false, reason: `Invalid SPF Type: ${type}` };
}

export default async function handler(req, res) {
    try {
        const rpInventory = await getFirebaseData('state/rpInventory') || [];
        
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

        // Process in chunks to prevent timeout / rate limiting
        for (let i = 0; i < rpInventory.length; i += chunkSize) {
            const chunk = rpInventory.slice(i, i + chunkSize);
            await Promise.all(chunk.map(async (item) => {
                const rpDomain = (item.rpDomain || '').trim();
                if (!rpDomain) return;

                const spfRecord = await getSpfRecord(rpDomain);
                const verification = verifySpfRecord(
                    spfRecord,
                    item.spfType || 'Include',
                    item.domainIncluded,
                    item.subdomainIncluded
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
        }

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
        return res.status(500).json({ success: false, error: err.message });
    }
}
