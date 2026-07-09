const dns = require('dns').promises;
const net = require('net');

const DB_URL = "https://gestion-team-c-01-default-rtdb.firebaseio.com";

// ==========================================
// WHOIS & RDAP DOMAIN AGE LOOKUP CODE (POST)
// ==========================================

function queryWhois(domain, server = 'whois.iana.org') {
    return new Promise((resolve, reject) => {
        const client = net.createConnection(43, server, () => {
            client.write(domain + '\r\n');
        });
        
        let data = '';
        client.setTimeout(6000);
        
        client.on('data', (chunk) => {
            data += chunk;
        });
        
        client.on('end', () => {
            resolve(data);
        });
        
        client.on('timeout', () => {
            client.destroy();
            reject(new Error('Connection timeout'));
        });
        
        client.on('error', (err) => {
            reject(err);
        });
    });
}

function parseWhois(text) {
    const lines = text.split('\n');
    let created = null;
    let expires = null;
    let registrar = null;

    const creationKeys = [
        'creation date', 'created on', 'created date', 
        'registration date', 'created:', 'registered:',
        'registered on'
    ];
    
    const expiryKeys = [
        'expiration date', 'expiry date', 'expires on', 
        'expires:', 'expiration:', 'registry expiry date'
    ];
    
    const registrarKeys = [
        'registrar:', 'sponsoring registrar', 'registrar name'
    ];

    for (let line of lines) {
        const clean = line.trim();
        const lower = clean.toLowerCase();
        
        if (!created) {
            for (const key of creationKeys) {
                if (lower.startsWith(key) || (lower.includes(key) && lower.indexOf(key) < 15)) {
                    const idx = lower.indexOf(key);
                    const val = clean.substring(idx + key.length).replace(/^[^\w]+/, '').trim();
                    const ts = Date.parse(val);
                    if (!isNaN(ts)) {
                        created = new Date(ts).toISOString();
                        break;
                    }
                }
            }
        }
        
        if (!expires) {
            for (const key of expiryKeys) {
                if (lower.startsWith(key) || (lower.includes(key) && lower.indexOf(key) < 15)) {
                    const idx = lower.indexOf(key);
                    const val = clean.substring(idx + key.length).replace(/^[^\w]+/, '').trim();
                    const ts = Date.parse(val);
                    if (!isNaN(ts)) {
                        expires = new Date(ts).toISOString();
                        break;
                    }
                }
            }
        }
        
        if (!registrar) {
            for (const key of registrarKeys) {
                if (lower.startsWith(key) || (lower.includes(key) && lower.indexOf(key) < 15)) {
                    const idx = lower.indexOf(key);
                    const val = clean.substring(idx + key.length).replace(/^[^\w:]+/, '').trim();
                    if (val) {
                        registrar = val;
                        break;
                    }
                }
            }
        }
    }

    return { created, expires, registrar };
}

async function lookupDomain(domain) {
    const cleanDomain = domain.trim().toLowerCase();
    try {
        const ianaData = await queryWhois(cleanDomain, 'whois.iana.org');
        
        let referServer = '';
        const referMatch = ianaData.match(/refer:\s+([^\s]+)/i);
        if (referMatch) {
            referServer = referMatch[1].trim();
        } else {
            const tld = cleanDomain.split('.').pop();
            if (tld === 'com' || tld === 'net') referServer = 'whois.verisign-grs.com';
            else if (tld === 'org') referServer = 'whois.pir.org';
            else if (tld === 'info') referServer = 'whois.afilias.net';
            else if (tld === 'biz') referServer = 'whois.nic.biz';
            else if (tld === 'me') referServer = 'whois.nic.me';
        }
        
        if (!referServer) {
            const rdapUrl = `https://rdap.org/domain/${cleanDomain}`;
            const rdapResp = await fetch(rdapUrl, { redirect: 'follow' });
            if (rdapResp.ok) {
                const json = await rdapResp.json();
                const events = json.events || [];
                const regEvent = events.find(e => e.eventAction === 'registration');
                const expEvent = events.find(e => e.eventAction === 'expiration');
                let registrarName = '';
                if (json.entities && json.entities[0]) {
                    registrarName = json.entities[0].vcardArray?.[1]?.find(prop => prop[0] === 'fn')?.[3] || '';
                }
                
                if (regEvent && regEvent.eventDate) {
                    return {
                        domain: cleanDomain,
                        created: new Date(regEvent.eventDate).toISOString(),
                        expires: expEvent ? new Date(expEvent.eventDate).toISOString() : null,
                        registrar: registrarName || 'RDAP Registry',
                        source: 'RDAP'
                    };
                }
            }
            throw new Error('Unable to find WHOIS server or RDAP entry');
        }

        const registryData = await queryWhois(cleanDomain, referServer);
        const parsed = parseWhois(registryData);

        if (parsed.created) {
            return {
                domain: cleanDomain,
                created: parsed.created,
                expires: parsed.expires,
                registrar: parsed.registrar || 'Unknown Registrar',
                source: referServer
            };
        }

        const rdapUrl = `https://rdap.org/domain/${cleanDomain}`;
        const rdapResp = await fetch(rdapUrl, { redirect: 'follow' });
        if (rdapResp.ok) {
            const json = await rdapResp.json();
            const events = json.events || [];
            const regEvent = events.find(e => e.eventAction === 'registration');
            const expEvent = events.find(e => e.eventAction === 'expiration');
            if (regEvent && regEvent.eventDate) {
                return {
                    domain: cleanDomain,
                    created: new Date(regEvent.eventDate).toISOString(),
                    expires: expEvent ? new Date(expEvent.eventDate).toISOString() : null,
                    registrar: 'RDAP Registry',
                    source: 'RDAP'
                };
            }
        }

        throw new Error('WHOIS entry parsed successfully but lacked registration date');

    } catch (err) {
        return {
            domain: cleanDomain,
            created: null,
            expires: null,
            registrar: null,
            error: err.message
        };
    }
}

// ==========================================
// SPF EXTRACTION CODE (GET)
// ==========================================

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

// ==========================================
// MAIN HANDLER
// ==========================================

export default async function handler(req, res) {
    if (req.method === 'POST') {
        // Bulk domain check
        const { domains } = req.body;
        if (!domains || !Array.isArray(domains)) {
            return res.status(400).json({ error: 'Invalid domains list provided' });
        }

        const results = [];
        for (const domain of domains) {
            if (!domain.trim()) continue;
            const resData = await lookupDomain(domain.trim());
            results.push(resData);
        }
        return res.status(200).json({ results });
    }

    // Default GET: extract SPF info
    try {
        const domain = (req.query.domain || '').trim().toLowerCase();
        if (!domain) {
            return res.status(400).json({ success: false, error: 'Missing domain parameter' });
        }

        const servers = await getFirebaseData('state/servers') || [];
        const spfRecord = await getSpfRecord(domain);
        if (!spfRecord) {
            return res.status(200).json({ success: true, found: false, reason: 'No SPF record found', rawSpf: null });
        }

        const mechs = parseSpfMechanisms(spfRecord);

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

        for (const incDomain of mechs.includes) {
            const incSpf = await getSpfRecord(incDomain);
            if (!incSpf) continue;
            const incMechs = parseSpfMechanisms(incSpf);

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
