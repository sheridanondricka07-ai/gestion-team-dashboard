const fs = require('fs');
const path = require('path');
const net = require('net');

const INPUT_FILE = 'scratch/user_domains.txt';
const OUTPUT_FILE = 'scratch/aged_domains_result.txt';
const CACHE_FILE = 'scratch/domain_age_cache.json';

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
        // Silently catch
    }
    return null;
}

async function lookupDomainAge(domain) {
    let created = await fetchRdap(domain);
    if (created) return created;

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
        // Silently catch
    }
    
    return created;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`Input file not found at ${INPUT_FILE}`);
        return;
    }

    const rawInput = fs.readFileSync(INPUT_FILE, 'utf8');
    const domains = rawInput.split(/[\r\n,;\s]+/)
        .map(d => d.trim().toLowerCase())
        .filter(d => d && d.includes('.') && d.length > 3);

    console.log(`Loaded ${domains.length} domains to check.`);

    let cache = {};
    if (fs.existsSync(CACHE_FILE)) {
        cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        console.log(`Loaded ${Object.keys(cache).length} cached domain ages.`);
    }

    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    const agedDomains = [];
    const concurrencyLimit = 10; // slightly higher concurrency for speed, RDAP handled mostly

    for (let i = 0; i < domains.length; i += concurrencyLimit) {
        const chunk = domains.slice(i, i + concurrencyLimit);
        
        await Promise.all(chunk.map(async (domain) => {
            let createdStr = cache[domain];
            if (!createdStr) {
                createdStr = await lookupDomainAge(domain);
                cache[domain] = createdStr || 'unknown';
            }

            if (createdStr && createdStr !== 'unknown') {
                const createdDate = new Date(createdStr);
                if (createdDate < oneYearAgo) {
                    agedDomains.push({ domain, created: createdStr });
                }
            }
        }));

        // Incremental cache save
        if (i % 50 === 0 || i + concurrencyLimit >= domains.length) {
            fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
            console.log(`Checked ${Math.min(i + concurrencyLimit, domains.length)}/${domains.length} domains... Found ${agedDomains.length} aged (+1y) domains.`);
        }
        
        await sleep(150); // fast pacing
    }

    // Write aged domains to output file
    const outputLines = agedDomains.map(item => `${item.domain} (${new Date(item.created).toLocaleDateString()})`);
    fs.writeFileSync(OUTPUT_FILE, outputLines.join('\n'));
    console.log(`Finished checking! Saved ${agedDomains.length} aged domains to ${OUTPUT_FILE}`);
}

main().catch(console.error);
