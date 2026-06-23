const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../api/sync-telegram-warmup.js');
let code = fs.readFileSync(filePath, 'utf8');

const regex = /const inVal = parseInt\(r\.inVal, 10\) \|\| 0;\s*const outVal = parseInt\(r\.outVal, 10\) \|\| 0;\s*if \(inVal <= 0 \|\| outVal < inVal \* 0\.95\) \{\s*success = false;\s*break;\s*\}/g;

const repl = `const inVal = parseInt(r.inVal, 10) || 0;
                const outVal = parseInt(r.outVal, 10) || 0;
                const latestInVal = parseInt(g.records[0].inVal, 10) || 0;

                if (inVal <= 0 || outVal < inVal * 0.95) {
                    success = false;
                    break;
                }
                
                if (Math.abs(inVal - latestInVal) > 50) {
                    success = false;
                    break;
                }`;

if (regex.test(code)) {
    code = code.replace(regex, repl);
    fs.writeFileSync(filePath, code, 'utf8');
    console.log("Success logic replaced!");
} else {
    console.log("Regex still didn't match.");
}
