const fs = require('fs');
const path = require('path');
const net = require('net');

const CACHE_FILE = 'scratch/domain_age_cache.json';
const BACKUP_FILE = 'database_backup.json';

// Helper to query WHOIS (port 43)
function queryWhois(domain, server = 'whois.iana.org') {
    return new Promise((resolve) => {
        const client = net.createConnection(43, server, () => {
            client.write(domain + '\r\n');
        });
        
        let data = '';
        client.setTimeout(4000);
        
        client.on('data', (chunk) => {
            data += chunk;
        });
        
        client.on('end', () => {
            resolve(data);
        });
        
        client.on('timeout', () => {
            client.destroy();
            resolve('');
        });
        
        client.on('error', () => {
            resolve('');
        });
    });
}

function parseWhois(text) {
    if (!text) return null;
    const lines = text.split('\n');
    let created = null;

    const creationKeys = [
        'creation date', 'created on', 'created date', 
        'registration date', 'created:', 'registered:',
        'registered on'
    ];

    for (let line of lines) {
        const clean = line.trim();
        const lower = clean.toLowerCase();
        
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
        if (created) break;
    }
    return created;
}

// Fetch RDAP (HTTP)
async function fetchRdap(domain) {
    try {
        const url = `https://rdap.org/domain/${domain}`;
        const resp = await fetch(url, { redirect: 'follow' });
        if (resp.ok) {
            const json = await resp.json();
            const events = json.events || [];
            const regEvent = events.find(e => e.eventAction === 'registration');
            if (regEvent && regEvent.eventDate) {
                return new Date(regEvent.eventDate).toISOString();
            }
        }
    } catch (e) {
        // Silently catch RDAP failure
    }
    return null;
}

async function lookupDomainAge(domain) {
    // 1. Try RDAP first (faster, less rate-limited)
    let created = await fetchRdap(domain);
    if (created) return created;

    // 2. Try WHOIS Port 43
    try {
        const ianaData = await queryWhois(domain, 'whois.iana.org');
        let referServer = '';
        const referMatch = ianaData.match(/refer:\s+([^\s]+)/i);
        if (referMatch) {
            referServer = referMatch[1].trim();
        } else {
            const tld = domain.split('.').pop();
            if (tld === 'com' || tld === 'net') referServer = 'whois.verisign-grs.com';
            else if (tld === 'org') referServer = 'whois.pir.org';
        }
        
        if (referServer) {
            const registryData = await queryWhois(domain, referServer);
            created = parseWhois(registryData);
        }
    } catch (e) {
        // Silently catch WHOIS failure
    }
    
    return created;
}

// Delay helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
    console.log("Loading cache and database backup...");
    let cache = {};
    if (fs.existsSync(CACHE_FILE)) {
        cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        console.log(`Loaded ${Object.keys(cache).length} cached domain ages.`);
    }

    const data = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8')).state;
    const vmtaResults = data.vmtaResults || {};
    const spamhaus = data.spamhaus || {};

    const ipList = [];
    const uniqueDomains = new Set();

    Object.keys(vmtaResults).forEach(ipKey => {
        const entry = vmtaResults[ipKey];
        const shEntry = spamhaus[ipKey] || {};
        const isListed = shEntry.status === 'listed';
        
        if (entry && entry.ptr && entry.ptr !== 'NXDOMAIN / No PTR' && entry.ptr !== 'No PTR record') {
            const cleanHost = entry.ptr.trim().replace(/\.$/, '').toLowerCase();
            const parts = cleanHost.split('.');
            if (parts.length >= 2) {
                const domain = parts.slice(-2).join('.');
                uniqueDomains.add(domain);
                ipList.push({
                    ip: ipKey.replace(/_/g, '.'),
                    domain: domain,
                    host: cleanHost,
                    listed: isListed,
                    shStatus: shEntry.status || 'clean',
                    listType: shEntry.list || 'none'
                });
            }
        }
    });

    console.log(`Total mapped IPs to process: ${ipList.length}`);
    console.log(`Total unique domains: ${uniqueDomains.size}`);

    const domainsArray = Array.from(uniqueDomains);
    let checkedCount = 0;
    
    // We will scan domains. To avoid long waits and registry bans, we can run them concurrently
    // but with sequential pacing.
    const concurrencyLimit = 5;
    
    for (let i = 0; i < domainsArray.length; i += concurrencyLimit) {
        const chunk = domainsArray.slice(i, i + concurrencyLimit);
        
        await Promise.all(chunk.map(async (domain) => {
            if (cache[domain]) {
                return;
            }
            
            const created = await lookupDomainAge(domain);
            cache[domain] = created || 'unknown';
        }));

        checkedCount += chunk.length;
        
        // Save cache incrementally
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
        
        if (i % 25 === 0 || i + concurrencyLimit >= domainsArray.length) {
            console.log(`Processed ${checkedCount}/${domainsArray.length} domains...`);
        }
        
        // Pacing delay
        await sleep(350);
    }

    console.log("Domain scanning completed. Running correlation analysis...");

    // Brackets definitions
    // New (0-30 days)
    // Young (31-90 days)
    // Medium (91-180 days)
    // Mature (181-365 days)
    // Established (1 year+)
    // Unknown

    const brackets = {
        'New (0-30d)': { total: 0, listed: 0, domains: new Set() },
        'Young (31-90d)': { total: 0, listed: 0, domains: new Set() },
        'Medium (91-180d)': { total: 0, listed: 0, domains: new Set() },
        'Mature (181-365d)': { total: 0, listed: 0, domains: new Set() },
        'Established (1y+)': { total: 0, listed: 0, domains: new Set() },
        'Unknown': { total: 0, listed: 0, domains: new Set() }
    };

    const now = new Date();

    ipList.forEach(item => {
        const createdStr = cache[item.domain];
        let bracketName = 'Unknown';

        if (createdStr && createdStr !== 'unknown') {
            const created = new Date(createdStr);
            const ageDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
            
            if (ageDays <= 30) bracketName = 'New (0-30d)';
            else if (ageDays <= 90) bracketName = 'Young (31-90d)';
            else if (ageDays <= 180) bracketName = 'Medium (91-180d)';
            else if (ageDays <= 365) bracketName = 'Mature (181-365d)';
            else bracketName = 'Established (1y+)';
        }

        const b = brackets[bracketName];
        b.total++;
        b.domains.add(item.domain);
        if (item.listed) {
            b.listed++;
        }
    });

    console.log("\n================ ANALYSIS RESULTS ================");
    Object.keys(brackets).forEach(key => {
        const b = brackets[key];
        const rate = b.total > 0 ? ((b.listed / b.total) * 100).toFixed(1) : '0.0';
        console.log(`${key.padEnd(20)} | IPs: ${String(b.total).padEnd(5)} | Listed: ${String(b.listed).padEnd(5)} | Listing Rate: ${rate}% | Unique Domains: ${b.domains.size}`);
    });
    console.log("==================================================");

    // Save final report data structure
    const reportData = {
        generatedAt: new Date().toISOString(),
        brackets: Object.keys(brackets).map(key => ({
            bracket: key,
            ipsTotal: brackets[key].total,
            ipsListed: brackets[key].listed,
            listingRate: brackets[key].total > 0 ? parseFloat(((brackets[key].listed / brackets[key].total) * 100).toFixed(2)) : 0,
            uniqueDomainsCount: brackets[key].domains.size
        }))
    };
    fs.writeFileSync('scratch/age_analysis_data.json', JSON.stringify(reportData, null, 2));
}

main().catch(console.error);
