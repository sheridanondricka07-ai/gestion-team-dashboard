const fs = require('fs');

let code = fs.readFileSync('api/sync-telegram-warmup.js', 'utf8');

const regex = /\/\/ Check if 3 last drops succeeded \(OUT >= 0\.95 \* IN\)[\s\S]*?if \(success\) \{/;

const replacement = `// STRATEGY LOGIC UPGRADE
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

             if (success) {`;

code = code.replace(regex, replacement);

fs.writeFileSync('api/sync-telegram-warmup.js', code, 'utf8');
console.log("Regex replaced");
