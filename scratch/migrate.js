const https = require('https');

const DB_URL = 'https://gestion-team-c-01-default-rtdb.firebaseio.com';

function fetchJson(path) {
    return new Promise((resolve, reject) => {
        https.get(`${DB_URL}/${path}.json`, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

function putJson(path, payload) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const options = {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        const req = https.request(`${DB_URL}/${path}.json`, options, res => {
            let resData = '';
            res.on('data', chunk => resData += chunk);
            res.on('end', () => resolve(resData));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function migrate() {
    console.log("Fetching warmupData...");
    const warmupData = await fetchJson('warmupData');
    if (!warmupData) {
        console.log("No data found.");
        return;
    }
    
    console.log(`Loaded ${Object.keys(warmupData).length} records.`);
    
    const warmupStats = {};
    const prunedData = {};
    const cutoff = Date.now() - (72 * 60 * 60 * 1000); // 72 hours ago
    
    // Group and calculate stats
    const rawRecords = Object.values(warmupData);
    // Sort by timestamp ASCENDING to easily find the first drop
    rawRecords.sort((a, b) => a.timestamp - b.timestamp);
    
    for (const r of rawRecords) {
        if (!r || !r.domain || !r.server || !r.ip) continue;
        
        // Match the logic used in components.js
        let cleanDomain = (r.domain || '').trim().toLowerCase();
        // Since we don't have RDNS resolution here easily, we just use the raw domain
        // Wait, components.js keys by resolvedDomain. But state/warmupStats can just be keyed by safe domain/server/ip.
        const safeDomainName = (r.domain || r.ip || 'unknown').replace(/[\.\#\$\[\]\/]/g, '_');
        const safeIp = (r.ip || 'unknown').replace(/[\.\:\/]/g, '_');
        const key = `${safeDomainName}_${r.server}_${safeIp}`;
        
        if (!warmupStats[key]) {
            warmupStats[key] = {
                firstDropTimestamp: r.timestamp,
                totalDrops: 0
            };
        }
        
        // Deduplication (we know duplicates existed, so we only count unique drops for stats)
        // Actually, we don't need perfect dedup for the stats count, but let's be accurate
        warmupStats[key].totalDrops++;
        
        // If it's newer than cutoff, keep it in prunedData
        if (r.timestamp >= cutoff) {
            prunedData[r.messageId || Date.now() + Math.random()] = r;
        }
    }
    
    console.log(`Calculated stats for ${Object.keys(warmupStats).length} groups.`);
    console.log(`Pruned data size: ${Object.keys(prunedData).length} records.`);
    
    console.log("Uploading warmupStats...");
    await putJson('state/warmupStats', warmupStats);
    
    console.log("Uploading pruned warmupData...");
    await putJson('warmupData', prunedData);
    
    console.log("Migration complete!");
}

migrate().catch(console.error);
