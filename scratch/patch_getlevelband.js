const fs = require('fs');

let code = fs.readFileSync('api/sync-telegram-warmup.js', 'utf8');

const targetRegex = /function getLevelBand\(val\) \{[\s\S]*?return val\.toString\(\);\s*\}/;

const replacement = \`function getLevelBand(val) {
    if (val >= 15000 && val <= 19000) return '15000-19000';
    
    // Define the valid strategy thresholds in ascending order
    const thresholds = [100, 200, 300, 500, 1000, 2000, 4000, 7000, 10000, 21000, 27000, 50000];
    
    // Find the closest valid tier that is less than or equal to the actual val
    // (allowing a 10% margin for drops that are slightly below target)
    let matchedTier = 100;
    for (const t of thresholds) {
        if (val >= t * 0.9) {
            matchedTier = t;
        } else {
            break;
        }
    }
    
    return matchedTier.toString();
}\`;

code = code.replace(targetRegex, replacement);

fs.writeFileSync('api/sync-telegram-warmup.js', code, 'utf8');
console.log("Updated getLevelBand");
