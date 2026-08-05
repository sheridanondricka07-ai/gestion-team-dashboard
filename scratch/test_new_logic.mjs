const DB_URL = "https://gestion-team-c-01-default-rtdb.firebaseio.com";

const STRATEGY = {
    '100': { drops: 7, next: 200 },
    '200': { drops: 7, next: 300 },
    '300': { drops: 2, next: 500 },
    '500': { drops: 13, next: 1000 },
    '1000': { drops: 7, next: 2000 },
    '2000': { drops: 9, next: 4000 },
    '4000': { drops: 7, next: 7000 },
    '7000': { drops: 7, next: 10000 },
    '10000': { drops: 5, next: 15000 },
    '15000-19000': { drops: 25, next: 21000 },
    '21000': { drops: 2, next: 27000 },
    '27000': { drops: 3, next: 50000 },
    '50000': { drops: 1, next: 50000 }
};

function getLevelBand(val) {
    const num = parseInt(val, 10) || 0;
    if (num >= 15000 && num <= 19000) return '15000-19000';
    
    const bands = [100, 200, 300, 500, 1000, 2000, 4000, 7000, 10000, 21000, 27000, 50000];
    let matched = bands[0];
    for (const b of bands) {
        if (num >= b) {
            matched = b;
        }
    }
    return matched.toString();
}

function calculateStreak(records) {
    if (!records || records.length === 0) return { streak: 0, currentBand: '100' };
    const latestInVal = parseInt(records[0].inVal, 10) || 0;
    const currentBand = getLevelBand(latestInVal);
    
    let streak = 0;
    for (const r of records) {
        const inVal = parseInt(r.inVal, 10) || 0;
        const outVal = parseInt(r.outVal, 10) || 0;
        
        if (getLevelBand(inVal) !== currentBand) {
            break;
        }
        
        const isSuccess = inVal > 0 && outVal >= Math.floor(inVal * 0.95);
        if (isSuccess) {
            streak++;
        } else {
            break;
        }
    }
    return { streak, currentBand };
}

async function test() {
    // Fetch recent warmupData and servers
    const [warmupDataResp, serversResp] = await Promise.all([
        fetch(`${DB_URL}/warmupData.json?orderBy="$key"&limitToLast=2000`),
        fetch(`${DB_URL}/state/servers.json`)
    ]);
    const allData = await warmupDataResp.json() || {};
    const servers = await serversResp.json() || [];
    
    function resolveDomainName(domain, ip) {
        const clean = (domain || '').toLowerCase().trim();
        const isRdns = !domain || clean === '[rdns]' || clean === 'rdns' || clean === 'n/a';
        if (isRdns) {
            const safeIp = (ip || '').replace(/\./g, '_');
            for (const s of servers) {
                if (s && s.vmtaMap && s.vmtaMap[safeIp]) {
                    return s.vmtaMap[safeIp];
                }
            }
            return ip || 'unknown';
        }
        return domain;
    }

    const grouped = {};
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    
    Object.values(allData).forEach(r => {
        if (!r.domain && !r.ip && !r.server) return;
        
        let actualServer = r.server || 'Unknown';
        let actualDomain = r.domain || 'N/A';
        if (actualServer.includes('.') || (!actualServer.startsWith('sh_') && !actualServer.startsWith('s_'))) {
            actualDomain = actualServer;
            actualServer = 'Unknown';
        }
        if ((actualServer === 'Unknown' || !actualServer) && r.ip) {
            const srv = servers.find(s => {
                const ips = [...(s.allIps || [])];
                if (s.ip) ips.push(s.ip);
                if (s.mainIp) ips.push(s.mainIp);
                return ips.map(x => (x || '').trim()).includes(r.ip.trim());
            });
            if (srv) actualServer = srv.name;
        }

        const cleanDomain = resolveDomainName(actualDomain, r.ip);
        const key = `${cleanDomain}_${actualServer}_${r.ip || ''}`;
        if (!grouped[key]) grouped[key] = { domain: cleanDomain, server: actualServer, ip: r.ip || '', records: [] };
        
        const isDuplicate = grouped[key].records.some(ex => 
            ex.ip === r.ip &&
            ex.outVal === r.outVal && 
            Math.abs(ex.timestamp - r.timestamp) < 5 * 60 * 1000
        );
        
        if (!isDuplicate) {
            grouped[key].records.push(r);
        }
    });
    
    console.log('--- Upgrade / Downgrade Evaluation ---');
    for (const key in grouped) {
        const g = grouped[key];
        g.records.sort((a, b) => b.timestamp - a.timestamp);
        
        const { streak, currentBand } = calculateStreak(g.records);
        const latestDrop = g.records[0];
        
        if (latestDrop.timestamp && latestDrop.timestamp >= cutoff) {
            const strat = STRATEGY[currentBand];
            const meetsUpgrade = strat && streak >= strat.drops;
            
            // Check downgrade
            let meetsDowngrade = false;
            if (g.records.length >= 2) {
                let bothFailed = true;
                for (let i = 0; i < 2; i++) {
                    const r = g.records[i];
                    if (!r.timestamp || r.timestamp < cutoff) {
                        bothFailed = false;
                        break;
                    }
                    const inVal = parseInt(r.inVal, 10) || 0;
                    const outVal = parseInt(r.outVal, 10) || 0;
                    if (inVal > 0 && outVal >= inVal * 0.95) {
                        bothFailed = false;
                        break;
                    }
                }
                if (bothFailed) {
                    meetsDowngrade = true;
                }
            }
            
            if (meetsUpgrade || meetsDowngrade || g.domain.includes('briarfield')) {
                console.log(`Domain: ${g.domain} | Server: ${g.server} | IP: ${g.ip}`);
                console.log(`  Band: ${currentBand} | Streak: ${streak} | Meets Upgrade: ${meetsUpgrade} | Meets Downgrade: ${meetsDowngrade}`);
            }
        }
    }
}

test();
