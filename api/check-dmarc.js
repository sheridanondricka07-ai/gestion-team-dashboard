import dns from 'dns';
const dnsPromises = dns.promises;

async function safeResolveTxt(domain, timeoutMs = 4000) {
    try {
        const lookup = dnsPromises.resolveTxt(domain);
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('DNS Timeout')), timeoutMs));
        return await Promise.race([lookup, timeout]);
    } catch (e) {
        return null;
    }
}

// TXT records come back as arrays of chunks (long records get split by DNS);
// join each one, then keep only the DMARC record.
function findDmarcRecord(records) {
    if (!records) return null;
    const flat = records
        .map(chunks => chunks.join(''))
        .filter(r => r.trim().toLowerCase().startsWith('v=dmarc1'));
    return flat.length > 0 ? flat[0] : null;
}

function extractTag(record, tag) {
    for (const part of record.split(';')) {
        const eq = part.indexOf('=');
        if (eq === -1) continue;
        const key = part.slice(0, eq).trim().toLowerCase();
        if (key === tag) return part.slice(eq + 1).trim().toLowerCase();
    }
    return null;
}

async function checkDomain(rawDomain) {
    const domain = (rawDomain || '').trim().toLowerCase()
        .replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[\/\s].*$/, '');
    if (!domain || !domain.includes('.')) {
        return { domain: rawDomain, hasDmarc: false, policy: null, record: null, error: 'Invalid domain' };
    }
    try {
        const records = await safeResolveTxt(`_dmarc.${domain}`);
        const record = findDmarcRecord(records);
        if (!record) {
            return { domain, hasDmarc: false, policy: null, record: null };
        }
        return {
            domain,
            hasDmarc: true,
            policy: extractTag(record, 'p'),
            subdomainPolicy: extractTag(record, 'sp'),
            pct: extractTag(record, 'pct'),
            record
        };
    } catch (e) {
        return { domain, hasDmarc: false, policy: null, record: null, error: e.message };
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const { domains } = req.body || {};
    if (!domains || !Array.isArray(domains) || domains.length === 0) {
        return res.status(400).json({ error: 'Provide a non-empty "domains" array' });
    }

    // Cap per-request size — the client chunks large bulk pastes into batches
    // and calls this endpoint multiple times (in parallel) instead.
    const batch = domains.slice(0, 60);
    const results = await Promise.all(batch.map(d => checkDomain(d)));

    return res.status(200).json({ results });
}
