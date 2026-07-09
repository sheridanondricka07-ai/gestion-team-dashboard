const net = require('net');

function queryWhois(domain, server = 'whois.iana.org') {
    return new Promise((resolve, reject) => {
        const client = net.createConnection(43, server, () => {
            client.write(domain + '\r\n');
        });
        
        let data = '';
        // Set timeout to avoid hanging connections
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
        
        // 1. Parse creation date
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
        
        // 2. Parse expiry date
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
        
        // 3. Parse registrar
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
        // Step 1: Query IANA to get the correct registrar WHOIS server
        const ianaData = await queryWhois(cleanDomain, 'whois.iana.org');
        
        let referServer = '';
        const referMatch = ianaData.match(/refer:\s+([^\s]+)/i);
        if (referMatch) {
            referServer = referMatch[1].trim();
        } else {
            // Fallback WHOIS servers for common TLDs if IANA doesn't specify
            const tld = cleanDomain.split('.').pop();
            if (tld === 'com' || tld === 'net') referServer = 'whois.verisign-grs.com';
            else if (tld === 'org') referServer = 'whois.pir.org';
            else if (tld === 'info') referServer = 'whois.afilias.net';
            else if (tld === 'biz') referServer = 'whois.nic.biz';
            else if (tld === 'me') referServer = 'whois.nic.me';
        }
        
        if (!referServer) {
            // Try querying RDAP as fallback
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

        // Step 2: Query the refer/TLD server
        const registryData = await queryWhois(cleanDomain, referServer);
        const parsed = parseWhois(registryData);

        // Calculate age helper
        if (parsed.created) {
            return {
                domain: cleanDomain,
                created: parsed.created,
                expires: parsed.expires,
                registrar: parsed.registrar || 'Unknown Registrar',
                source: referServer
            };
        }

        // If parse failed, try one more fallback to RDAP
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

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { domains } = req.body;

    if (!domains || !Array.isArray(domains)) {
        return res.status(400).json({ error: 'Invalid domains list provided' });
    }

    const results = [];
    
    // Process domains sequentially to avoid WHOIS server rate limit blocks
    for (const domain of domains) {
        if (!domain.trim()) continue;
        const resData = await lookupDomain(domain.trim());
        results.push(resData);
    }

    return res.status(200).json({ results });
}
