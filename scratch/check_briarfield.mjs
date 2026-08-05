const DB_URL = "https://gestion-team-c-01-default-rtdb.firebaseio.com";

async function main() {
    console.log("=== Fetching warmupData (last 200 messages) ===");
    
    // Get warmupData - look for briarfield entries
    const warmupResp = await fetch(`${DB_URL}/state/warmupData.json?orderBy="$key"&limitToLast=500`);
    const warmupData = await warmupResp.json();
    
    const briarEntries = [];
    for (const [key, val] of Object.entries(warmupData || {})) {
        const dom = (val.domain || '').toLowerCase();
        if (dom.includes('briar') || dom.includes('briarfield')) {
            briarEntries.push({ key, ...val });
        }
    }
    
    console.log(`\nFound ${briarEntries.length} briarfield entries in warmupData`);
    briarEntries.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    briarEntries.forEach(e => {
        const date = e.timestamp ? new Date(e.timestamp).toISOString() : 'N/A';
        console.log(`  ${date} | server=${e.server} | ip=${e.ip} | IN=${e.inVal} OUT=${e.outVal} | domain=${e.domain}`);
    });
    
    // Get autoWarmupNotified - look for briarfield entries
    console.log("\n=== Fetching autoWarmupNotified ===");
    const notifResp = await fetch(`${DB_URL}/state/autoWarmupNotified.json`);
    const notifData = await notifResp.json();
    
    const briarNotifs = {};
    for (const [key, val] of Object.entries(notifData || {})) {
        if (key.toLowerCase().includes('briar')) {
            briarNotifs[key] = val;
        }
    }
    console.log("Briarfield notifications:", JSON.stringify(briarNotifs, null, 2));
    
    // Get warmupStats - look for briarfield entries
    console.log("\n=== Fetching warmupStats ===");
    const statsResp = await fetch(`${DB_URL}/state/warmupStats.json`);
    const statsData = await statsResp.json();
    
    const briarStats = {};
    for (const [key, val] of Object.entries(statsData || {})) {
        if (key.toLowerCase().includes('briar')) {
            briarStats[key] = val;
        }
    }
    console.log("Briarfield stats:", JSON.stringify(briarStats, null, 2));
    
    // Now simulate the upgrade logic
    console.log("\n=== Simulating Upgrade Logic ===");
    
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
        if (val >= 15000 && val <= 19000) return '15000-19000';
        return val.toString();
    }
    
    // Replay all briarfield drops to trace the streak
    console.log("\n--- Streak Replay ---");
    let currentBand = null;
    let streak = 0;
    
    briarEntries.forEach(e => {
        const inVal = parseInt(e.inVal, 10) || 0;
        const outVal = parseInt(e.outVal, 10) || 0;
        const isSuccess = inVal > 0 && outVal >= Math.floor(inVal * 0.95);
        const band = getLevelBand(inVal);
        
        if (!currentBand || currentBand !== band) {
            console.log(`  Band change: ${currentBand} -> ${band} (streak reset from ${streak} to 0)`);
            currentBand = band;
            streak = 0;
        }
        
        if (isSuccess) {
            streak++;
        }
        // Note: failure does NOT reset streak in the production code!
        
        const strat = STRATEGY[band];
        const wouldUpgrade = strat && streak >= strat.drops;
        
        const date = e.timestamp ? new Date(e.timestamp).toISOString() : 'N/A';
        console.log(`  ${date} | IN=${inVal} OUT=${outVal} | ${isSuccess ? 'SUCCESS' : 'FAIL'} | band=${band} streak=${streak}${wouldUpgrade ? ' >>> UPGRADE TRIGGERED to ' + strat.next : ''}`);
    });
}

main().catch(console.error);
