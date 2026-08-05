const fs = require('fs');

let code = fs.readFileSync('api/sync-telegram-warmup.js', 'utf8');

// Replace the 3-drop success check with the proper Strategy check
const blockToReplace = `
            // Check if 3 last drops succeeded (OUT >= 0.95 * IN)
            let success = true;
            for (let i = 0; i < 3; i++) {
                const r = g.records[i];
                if (!r.timestamp || r.timestamp < cutoff) {
                    success = false;
                    break;
                }
                const inVal = parseInt(r.inVal, 10) || 0;
                const outVal = parseInt(r.outVal, 10) || 0;
                const latestInVal = parseInt(g.records[0].inVal, 10) || 0;

                if (inVal <= 0 || outVal < inVal * 0.95) {
                    success = false;
                    break;
                }
                
                if (Math.abs(inVal - latestInVal) > 50) {
                    success = false;
                    break;
                }
            }
`;

const newBlock = `
            // Strategy check using the streak calculated in the first loop
            let success = false;
            let nextTarget = 0;
            const latestVal = parseInt(g.records[0].inVal, 10) || 0;
            
            const cleanDomainStr = (g.domain || g.ip || 'unknown').replace(/[\\.\\#\\$\\[\\]\\/]/g, '_');
            const safeIpStr = (g.ip || 'unknown').replace(/[\\.\\:\\/]/g, '_');
            const statKey = \`\${cleanDomainStr}_\${g.server}_\${safeIpStr}\`;
            
            if (warmupStats[statKey]) {
                const band = warmupStats[statKey].currentBand;
                const streak = warmupStats[statKey].streak || 0;
                const strat = STRATEGY[band];
                
                if (strat && streak >= strat.drops) {
                    success = true;
                    nextTarget = strat.next;
                }
            }
`;

// Replace `let success = true; ...` with the strategy check
code = code.replace(blockToReplace, newBlock);

// Also fix `latestVal` not being defined in the report Text
// Wait, latestVal is defined in newBlock now! But wait, `latestVal` was also used in `formatWarmupReport` but it wasn't defined either!
// In the original code, `latestVal` was NOT defined in the second loop!!
// I added `latestVal` in `newBlock`.

// Replace `latestInVal` inside the downgrade cooldown check, because I removed it from the replaced block.
// Wait, downgrade cooldown doesn't use `latestInVal`.

// Find the report text formatting:
// const reportText = formatWarmupReport(g.server, g.ip, cleanDomain, "Upgrade", latestVal, nextTarget, userName, "Last 3 drops succeeded (OUT >= 95% of IN).");
const reportTarget = `const reportText = formatWarmupReport(g.server, g.ip, cleanDomain, "Upgrade", latestVal, nextTarget, userName, "Last 3 drops succeeded (OUT >= 95% of IN).");`;
const newReportTarget = `const reportText = formatWarmupReport(g.server, g.ip, cleanDomain, "Upgrade", latestVal, nextTarget, userName, "Strategy Target Reached! (Streak: " + warmupStats[statKey].streak + " drops)");`;
code = code.replace(reportTarget, newReportTarget);

fs.writeFileSync('api/sync-telegram-warmup.js', code, 'utf8');
console.log("Rewrote upgrade logic to use strategy.");
