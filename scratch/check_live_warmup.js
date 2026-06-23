const DB_URL = "https://gestion-team-c-01-default-rtdb.firebaseio.com";

async function checkStatus() {
    try {
        const queueResp = await fetch(`${DB_URL}/state/autoWarmupQueue.json`);
        const queue = await queueResp.json() || {};
        console.log("=== CURRENT AUTO WARMUP QUEUE ===");
        console.log(JSON.stringify(queue, null, 2));

        const notifiedResp = await fetch(`${DB_URL}/state/autoWarmupNotified.json`);
        const notified = await notifiedResp.json() || {};
        console.log("\n=== RECENT NOTIFIED STATE (UPGRADES/DOWNGRADES) ===");
        console.log(JSON.stringify(notified, null, 2));

        const dataResp = await fetch(`${DB_URL}/warmupData.json`);
        const allData = await dataResp.json() || {};
        
        console.log("\n=== ACTIVE WARMUPS IN LAST 24 HOURS ===");
        const grouped = {};
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        Object.values(allData).forEach(r => {
            if (!r.domain && !r.ip && !r.server) return;
            if (r.timestamp && r.timestamp < cutoff) return;
            const key = `${r.domain || ''}_${r.server || ''}_${r.ip || ''}`;
            if (!grouped[key]) grouped[key] = { ...r, records: [] };
            grouped[key].records.push(r);
        });

        for (const key in grouped) {
            const g = grouped[key];
            g.records.sort((a, b) => b.timestamp - a.timestamp);
            const latestDrop = g.records[0];
            const inVal = parseInt(latestDrop.inVal, 10) || 0;
            const outVal = parseInt(latestDrop.outVal, 10) || 0;
            console.log(`- Target: ${key}`);
            console.log(`  Latest drop: IN=${inVal}, OUT=${outVal}, Time=${new Date(latestDrop.timestamp).toLocaleString()}, Count=${g.records.length}`);
            
            // Check if last 3 succeeded
            let success = true;
            for (let i = 0; i < 3; i++) {
                if (g.records.length < 3) {
                    success = false;
                    break;
                }
                const r = g.records[i];
                const rIn = parseInt(r.inVal, 10) || 0;
                const rOut = parseInt(r.outVal, 10) || 0;
                if (rIn <= 0 || rOut < rIn * 0.95) {
                    success = false;
                    break;
                }
            }
            console.log(`  Succeed in 3 last drops: ${success}`);
        }
    } catch (e) {
        console.error(e);
    }
}

checkStatus();
