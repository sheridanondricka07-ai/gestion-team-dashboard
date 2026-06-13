const dns = require('dns').promises;

const DB_URL = "https://gestion-team-e-default-rtdb.firebaseio.com";

async function getFirebaseData(path) {
    try {
        const resp = await fetch(`${DB_URL}/${path}.json`);
        return await resp.json();
    } catch (e) {
        return null;
    }
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

async function getSpfRecord(domain) {
    const records = await safeDnsResolve(dns.resolveTxt, domain);
    if (!records) return null;
    const spfRecords = records
        .map(chunks => chunks.join(''))
        .filter(r => r.toLowerCase().startsWith('v=spf1'));
    return spfRecords.length > 0 ? spfRecords[0] : null;
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

function ipInCidr(ip, cidr) {
    const [range, bitsStr] = cidr.split('/');
    if (!bitsStr) return ip === range;
    const bits = parseInt(bitsStr, 10);
    if (isNaN(bits)) return ip === range;
    const ipP = ip.split('.').map(Number);
    const rP = range.split('.').map(Number);
    if (ipP.length !== 4 || rP.length !== 4) return false;
    const ipNum = ((ipP[0] * 256 + ipP[1]) * 256 + ipP[2]) * 256 + ipP[3];
    const rNum = ((rP[0] * 256 + rP[1]) * 256 + rP[2]) * 256 + rP[3];
    const mask = bits === 0 ? 0 : (0xFFFFFFFF << (32 - bits));
    return (ipNum & mask) === (rNum & mask);
}

function matchIpAgainstServers(ipOrCidr, servers) {
    for (const s of servers) {
        for (const sIp of (s.allIps || [])) {
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

export default async function handler(req, res) {
    try {
        const domain = (req.query.domain || '').trim().toLowerCase();
        if (!domain) {
            return res.status(400).json({ success: false, error: 'Missing domain parameter' });
        }

        const servers = await getFirebaseData('state/servers') || [];

        // Step 1: Get SPF record of the RP domain
        const spfRecord = await getSpfRecord(domain);
        if (!spfRecord) {
            return res.status(200).json({ success: true, found: false, reason: 'No SPF record found', rawSpf: null });
        }

        const mechs = parseSpfMechanisms(spfRecord);

        // Step 2: Check ip4: mechanisms (direct IP = intern, domain/subdomain = RP itself)
        for (const ip4 of mechs.ip4s) {
            const srv = matchIpAgainstServers(ip4, servers);
            if (srv) {
                return res.status(200).json({
                    success: true, found: true,
                    domainIncluded: domain, subdomainIncluded: domain,
                    server: srv, spfType: 'Include', rpType: 'intern',
                    rawSpf: spfRecord, matchedVia: 'ip4:' + ip4
                });
            }
        }

        // Step 2b: Check bare 'a' mechanism (A record of RP domain itself)
        if (mechs.bareA) {
            const aIps = await safeDnsResolve(dns.resolve4, domain);
            if (aIps) {
                for (const aIp of aIps) {
                    const srv = matchIpAgainstServers(aIp, servers);
                    if (srv) {
                        return res.status(200).json({
                            success: true, found: true,
                            domainIncluded: domain, subdomainIncluded: domain,
                            server: srv, spfType: 'Arecod', rpType: 'intern',
                            rawSpf: spfRecord, matchedVia: 'a (bare) -> ' + aIp
                        });
                    }
                }
            }
        }

        // Step 3: Check include: mechanisms (resolve 2 levels deep)
        for (const incDomain of mechs.includes) {
            const incSpf = await getSpfRecord(incDomain);
            if (!incSpf) continue;
            const incMechs = parseSpfMechanisms(incSpf);

            // Check ip4 in included domain's SPF
            for (const ip4 of incMechs.ip4s) {
                const srv = matchIpAgainstServers(ip4, servers);
                if (srv) {
                    const root = extractRootDomain(incDomain);
                    return res.status(200).json({
                        success: true, found: true,
                        domainIncluded: root, subdomainIncluded: incDomain,
                        server: srv, spfType: 'Include', rpType: 'extern',
                        rawSpf: spfRecord, matchedVia: 'include:' + incDomain + ' -> ip4:' + ip4
                    });
                }
            }

            // Level 2: nested includes
            for (const nested of incMechs.includes) {
                const nestedSpf = await getSpfRecord(nested);
                if (!nestedSpf) continue;
                const nestedMechs = parseSpfMechanisms(nestedSpf);
                for (const ip4 of nestedMechs.ip4s) {
                    const srv = matchIpAgainstServers(ip4, servers);
                    if (srv) {
                        const root = extractRootDomain(incDomain);
                        return res.status(200).json({
                            success: true, found: true,
                            domainIncluded: root, subdomainIncluded: incDomain,
                            server: srv, spfType: 'Include', rpType: 'extern',
                            rawSpf: spfRecord, matchedVia: 'include:' + incDomain + ' -> include:' + nested + ' -> ip4:' + ip4
                        });
                    }
                }
            }
        }

        // Step 4: Check a: mechanisms
        for (const aDomain of mechs.aRecords) {
            const aIps = await safeDnsResolve(dns.resolve4, aDomain);
            if (!aIps) continue;
            for (const aIp of aIps) {
                const srv = matchIpAgainstServers(aIp, servers);
                if (srv) {
                    const root = extractRootDomain(aDomain);
                    return res.status(200).json({
                        success: true, found: true,
                        domainIncluded: root, subdomainIncluded: aDomain,
                        server: srv, spfType: 'Arecod', rpType: 'extern',
                        rawSpf: spfRecord, matchedVia: 'a:' + aDomain + ' -> ' + aIp
                    });
                }
            }
        }

        // No match found
        return res.status(200).json({
            success: true, found: false,
            reason: 'SPF exists but no mechanisms match our server IPs',
            rawSpf: spfRecord
        });

    } catch (err) {
        console.error('Extract SPF Error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
