const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../components.js');
let code = fs.readFileSync(filePath, 'utf8');

const regex = /let durationDays = 1;\s*let startDateStr = 'Unknown';\s*let totalDrops = recordsForCurrentIp\.length;/g;

const repl = `const last3 = g.records.slice(0, 3).map(r => r.outVal);
                                const repOut = g.repOut;
                                const totalOutAllTime = recordsForCurrentIp.reduce((sum, r) => sum + (parseInt(r.outVal) || 0), 0);
                                
                                let durationDays = 1;
                                let startDateStr = 'Unknown';
                                let totalDrops = recordsForCurrentIp.length;`;

if (regex.test(code)) {
    code = code.replace(regex, repl);
    fs.writeFileSync(filePath, code, 'utf8');
    console.log("Restored missing variables.");
} else {
    console.log("Regex did not match.");
}
