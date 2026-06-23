const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../api/sync-telegram-warmup.js');
let code = fs.readFileSync(filePath, 'utf8');

const strategyStr = `
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
    '21000': { drops: 2, next: 26000 },
    '26000': { drops: 3, next: 50000 },
    '50000': { drops: 1, next: 50000 }
};

function getLevelBand(val) {
    if (val >= 15000 && val <= 19000) return '15000-19000';
    return val.toString();
}
`;

// Insert the strategy definition at the top of processAutoWarmup if not already there
if (!code.includes('const STRATEGY = {')) {
    code = code.replace('async function processAutoWarmup(allData, newRecords) {', 'async function processAutoWarmup(allData, newRecords) {' + strategyStr);
}

// 1. Update the loop where we process stats to handle the streak
const statsRegex = /if \(addedCount > 0 && newRecords\[r\.messageId\]\) \{\s*warmupStats\[statKey\]\.totalDrops\+\+;\s*statsUpdated = true;\s*\}/g;
const statsRepl = `if (addedCount > 0 && newRecords[r.messageId]) {
                  warmupStats[statKey].totalDrops++;
                  statsUpdated = true;
                  
                  // Streak Logic for Upgrades
                  const inVal = parseInt(r.inVal, 10) || 0;
                  const outVal = parseInt(r.outVal, 10) || 0;
                  const isSuccess = inVal > 0 && outVal >= Math.floor(inVal * 0.95);
                  
                  const band = getLevelBand(inVal);
                  
                  if (!warmupStats[statKey].currentBand || warmupStats[statKey].currentBand !== band) {
                      warmupStats[statKey].currentBand = band;
                      warmupStats[statKey].streak = 0; // Reset streak on band change
                  }
                  
                  if (isSuccess) {
                      warmupStats[statKey].streak++;
                  } else {
                      // If fail, we don't reset streak immediately here because the 2-drop downgrade logic 
                      // handles changing the target. If target changes, streak resets automatically above.
                  }
              }`;

code = code.replace(statsRegex, statsRepl);

// 2. Replace the old "3 drops check" and success logic
const oldSuccessLogicRegex = /g\.records\.sort\(\(a, b\) => b\.timestamp - a\.timestamp\);\s*if \(g\.records\.length < 3\) continue;\s*\/\/ Check if 3 last drops succeeded \[\s\S]*?if \(latestDowngradeTime > 0\) \{\s*const dropsAfter = g\.records\.filter\(r => r\.timestamp > latestDowngradeTime\)\.length;\s*if \(dropsAfter < 3\) \{\s*console\.log\(`Cooldown active.*?\);\s*continue;.*?\s*\}\s*\}/g;

const newSuccessLogicRepl = `g.records.sort((a, b) => b.timestamp - a.timestamp);
              
              const cleanGDomain = (g.domain || '').toLowerCase().trim();
              const isRdns = !g.domain || cleanGDomain === '[rdns]' || cleanGDomain === 'rdns' || cleanGDomain === 'n/a';
              const cleanDomainName = isRdns ? (g.ip || 'unknown') : (g.domain || g.ip || 'unknown');
              const safeDomainName = cleanDomainName.replace(/[\\.\\#\\$\\[\\]\\/]/g, '_');
              const safeIp = (g.ip || 'unknown').replace(/[\\.\\:\\/]/g, '_');
              const statKey = \`\${safeDomainName}_\${g.server}_\${safeIp}\`;
              const downPrefix = \`\${safeDomainName}_\${g.server}_\${safeIp}_down_\`;
              
              const latestVal = parseInt(g.records[0].inVal, 10) || 0;
              const currentBand = getLevelBand(latestVal);
              const streak = warmupStats[statKey] && warmupStats[statKey].currentBand === currentBand ? (warmupStats[statKey].streak || 0) : 0;
              
              const strategyRules = STRATEGY[currentBand];
              let success = false;
              let nextTarget = latestVal;
              
              if (strategyRules && streak >= strategyRules.drops) {
                  success = true;
                  nextTarget = strategyRules.next;
              }
              
              if (success && nextTarget > latestVal) {
                  // Wait, check downgrade cooldown
                   let latestDowngradeTime = 0;
                   Object.keys(autoNotifiedState).forEach(k => {
                       if (k.startsWith(downPrefix)) {
                           const val = autoNotifiedState[k];
                           const t = typeof val === 'number' ? val : 0;
                           if (t > latestDowngradeTime) {
                               latestDowngradeTime = t;
                           }
                       }
                   });
                   
                   if (latestDowngradeTime > 0) {
                       const dropsAfter = g.records.filter(r => r.timestamp > latestDowngradeTime).length;
                       if (dropsAfter < 3) {
                           console.log(\`Cooldown active for \${cleanDomainName} on server \${g.server}: only \${dropsAfter} drops since downgrade (need 3). Skipping upgrade check.\`);
                           continue; // Cooldown active
                       }
                   }
                   `;

code = code.replace(oldSuccessLogicRegex, newSuccessLogicRepl);

// 3. Delete the old nextTarget logic inside `if (success) {` block
const oldNextTargetRegex = /const latestVal = parseInt\(g\.records\[0\]\.inVal, 10\) \|\| 0;\s*const LEVELS = \[50, 100, 200, 300, 500, 760, 1000, 1500, 2000, 3000, 5000, 7000, 8000, 10000, 15000, 19000, 21000, 26000, 30000\];\s*const nextTarget = LEVELS\.find\(l => l > latestVal\) \|\| latestVal;/g;

code = code.replace(oldNextTargetRegex, "");

// 4. In the downgrade logic, use the new strategy instead of LEVELS
const oldDowngradeRegex = /const LEVELS = \[50, 100, 200, 300, 500, 760, 1000, 1500, 2000, 3000, 5000, 7000, 8000, 10000, 15000, 19000, 21000, 26000, 30000\];\s*const currentIdx = LEVELS\.indexOf\(latestVal\);\s*let prevTarget = latestVal;\s*if \(currentIdx > 0\) \{\s*prevTarget = LEVELS\[currentIdx - 1\];\s*\} else if \(currentIdx === -1\) \{\s*const found = \[\.\.\.LEVELS\]\.reverse\(\)\.find\(l => l < latestVal\);\s*prevTarget = found \|\| LEVELS\[0\];\s*\}/g;

const newDowngradeRepl = `const ORDERED_TARGETS = [50, 100, 200, 300, 500, 1000, 2000, 4000, 7000, 10000, 15000, 19000, 21000, 26000, 50000];
                      const currentIdx = ORDERED_TARGETS.indexOf(latestVal);
                      let prevTarget = latestVal;
                      if (currentIdx > 0) {
                          prevTarget = ORDERED_TARGETS[currentIdx - 1];
                      } else if (currentIdx === -1) {
                          const found = [...ORDERED_TARGETS].reverse().find(l => l < latestVal);
                          prevTarget = found || ORDERED_TARGETS[0];
                      }`;

code = code.replace(oldDowngradeRegex, newDowngradeRepl);

// 5. Reset streak on upgrade
const upgradeSentRegex = /const acquired = await putFirebaseDataConditional\(`state\/autoWarmupNotified\/\$\{safeKey\}`/g;
const upgradeSentRepl = `warmupStats[statKey].streak = 0; // Reset streak so it doesn't fire multiple times
                          statsUpdated = true;
                          const acquired = await putFirebaseDataConditional(\`state/autoWarmupNotified/\${safeKey}\``;

code = code.replace(upgradeSentRegex, upgradeSentRepl);


fs.writeFileSync(filePath, code, 'utf8');
console.log("Patch complete.");
