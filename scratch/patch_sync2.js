const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../api/sync-telegram-warmup.js');
let code = fs.readFileSync(filePath, 'utf8');

const regexCleanup = /\/\/ Cleanup old records \(> 7 days\)\s*const sevenDaysAgo = Date\.now\(\) - \(7 \* 24 \* 60 \* 60 \* 1000\);\s*const keysToDelete = Object\.keys\(allData\)\.filter\(k => allData\[k\]\.timestamp < sevenDaysAgo\);/g;

const replCleanup = `// Cleanup old records (> 72 hours to save bandwidth)
          const cutoffTime = Date.now() - (72 * 60 * 60 * 1000);
          const keysToDelete = Object.keys(allData).filter(k => allData[k].timestamp < cutoffTime);`;

if (regexCleanup.test(code)) {
    code = code.replace(regexCleanup, replCleanup);
    console.log("Replaced cleanup logic.");
} else {
    console.log("Could not find cleanup logic target.");
}

const regexFetchStats = /const autoNotifiedState = await getFirebaseData\('state\/autoWarmupNotified'\) \|\| \{\};/g;
const replFetchStats = `const autoNotifiedState = await getFirebaseData('state/autoWarmupNotified') || {};
        const warmupStats = await getFirebaseData('state/warmupStats') || {};
        let statsUpdated = false;`;

if (regexFetchStats.test(code)) {
    code = code.replace(regexFetchStats, replFetchStats);
    console.log("Replaced fetch stats.");
}

const regexNewRecords = /if \(!grouped\[key\]\) grouped\[key\] = \{ \.\.\.r, records: \[\] \};/g;
const replNewRecords = `if (!grouped[key]) grouped[key] = { ...r, records: [] };
            
            // Update stats
            const cleanDomainName = (r.domain || r.ip || 'unknown').replace(/[\\.\\#\\$\\[\\]\\/]/g, '_');
            const safeIp = (r.ip || 'unknown').replace(/[\\.\\:\\/]/g, '_');
            const statKey = \`\${cleanDomainName}_\${r.server}_\${safeIp}\`;
            
            if (!warmupStats[statKey]) {
                warmupStats[statKey] = { firstDropTimestamp: r.timestamp, totalDrops: 0 };
            }
            if (addedCount > 0 && newRecords[r.messageId]) {
                warmupStats[statKey].totalDrops++;
                statsUpdated = true;
            }`;

if (regexNewRecords.test(code)) {
    code = code.replace(regexNewRecords, replNewRecords);
    console.log("Replaced new records stats bump.");
}

const regexSaveStats = /if \(newNotified\) \{\s*await fetch\(`\$\{DB_URL\}\/state\/warmupNotified\.json`, \{\s*method: 'PUT',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(notifiedState\)\s*\}\);\s*\}/g;
const replSaveStats = `if (newNotified) {
                          await fetch(\`\${DB_URL}/state/warmupNotified.json\`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(notifiedState)
                          });
                      }
                      if (statsUpdated) {
                          await fetch(\`\${DB_URL}/state/warmupStats.json\`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(warmupStats)
                          });
                      }`;

if (regexSaveStats.test(code)) {
    code = code.replace(regexSaveStats, replSaveStats);
    console.log("Replaced save stats.");
}

fs.writeFileSync(filePath, code, 'utf8');
console.log("Done.");
