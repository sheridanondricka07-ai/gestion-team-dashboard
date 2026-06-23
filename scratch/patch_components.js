const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../components.js');
let code = fs.readFileSync(filePath, 'utf8');

// Patch fetching warmupData to also fetch warmupStats
const regexFetch1 = /const snapshot = await window\.db\.ref\('warmupData'\)\.once\('value'\);\s*app\.state\.warmupData = snapshot\.val\(\) \|\| \{\};/g;
const replFetch1 = `const snapshot = await window.db.ref('warmupData').once('value');
                  app.state.warmupData = snapshot.val() || {};
                  const statsSnapshot = await window.db.ref('state/warmupStats').once('value');
                  app.state.warmupStats = statsSnapshot.val() || {};`;

if (regexFetch1.test(code)) {
    code = code.replace(regexFetch1, replFetch1);
    console.log("Replaced fetch 1");
}

const regexFetch2 = /const snapshotUpdate = await window\.db\.ref\('warmupData'\)\.once\('value'\);\s*app\.state\.warmupData = snapshotUpdate\.val\(\) \|\| \{\};/g;
const replFetch2 = `const snapshotUpdate = await window.db.ref('warmupData').once('value');
                      app.state.warmupData = snapshotUpdate.val() || {};
                      const statsSnapshotUpdate = await window.db.ref('state/warmupStats').once('value');
                      app.state.warmupStats = statsSnapshotUpdate.val() || {};`;

if (regexFetch2.test(code)) {
    code = code.replace(regexFetch2, replFetch2);
    console.log("Replaced fetch 2");
}

const regexFetch3 = /const snapshot = await window\.db\.ref\('warmupData'\)\.once\('value'\);\s*window\.app\.state\.warmupData = snapshot\.val\(\) \|\| \{\};/g;
const replFetch3 = `const snapshot = await window.db.ref('warmupData').once('value');
              window.app.state.warmupData = snapshot.val() || {};
              const statsSnapshotBtn = await window.db.ref('state/warmupStats').once('value');
              window.app.state.warmupStats = statsSnapshotBtn.val() || {};`;

if (regexFetch3.test(code)) {
    code = code.replace(regexFetch3, replFetch3);
    console.log("Replaced fetch 3");
}

// Now replace rendering logic for drops and duration
const renderLogicRegex = /const oldestForIp = recordsForCurrentIp\[recordsForCurrentIp\.length - 1\];\s*let durationDays = 1;\s*if \(oldestForIp && oldestForIp\.timestamp\) \{\s*const msDiff = Date\.now\(\) - oldestForIp\.timestamp;\s*durationDays = Math\.max\(1, Math\.ceil\(msDiff \/ \(1000 \* 60 \* 60 \* 24\)\)\);\s*\}\s*const startDateStr = oldestForIp \? new Date\(oldestForIp\.timestamp\)\.toLocaleDateString\(\) : 'Unknown';\s*const totalDrops = recordsForCurrentIp\.length;/g;

const renderLogicRepl = `let durationDays = 1;
                                  let startDateStr = 'Unknown';
                                  let totalDrops = recordsForCurrentIp.length;
                                  
                                  const safeDomainName = (g.domain || g.ip || 'unknown').replace(/[\\.\\#\\$\\[\\]\\/]/g, '_');
                                  const safeIpKey = (g.ip || 'unknown').replace(/[\\.\\:\\/]/g, '_');
                                  const statKey = \`\${safeDomainName}_\${g.server}_\${safeIpKey}\`;
                                  
                                  if (app.state.warmupStats && app.state.warmupStats[statKey]) {
                                      const stats = app.state.warmupStats[statKey];
                                      totalDrops = stats.totalDrops || totalDrops;
                                      if (stats.firstDropTimestamp) {
                                          const msDiff = Date.now() - stats.firstDropTimestamp;
                                          durationDays = Math.max(1, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
                                          startDateStr = new Date(stats.firstDropTimestamp).toLocaleDateString();
                                      }
                                  }`;

if (renderLogicRegex.test(code)) {
    code = code.replace(renderLogicRegex, renderLogicRepl);
    console.log("Replaced rendering logic.");
} else {
    // try formatting diff
    const crlRegex = /const oldestForIp = recordsForCurrentIp\[recordsForCurrentIp\.length - 1\];[\s\S]*?const totalDrops = recordsForCurrentIp\.length;/g;
    if (crlRegex.test(code)) {
        code = code.replace(crlRegex, renderLogicRepl);
        console.log("Replaced rendering logic via relaxed regex.");
    } else {
        console.log("Could not find rendering logic.");
    }
}

fs.writeFileSync(filePath, code, 'utf8');
console.log("Done.");
