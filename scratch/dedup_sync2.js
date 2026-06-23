const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../api/sync-telegram-warmup.js');
let code = fs.readFileSync(filePath, 'utf8');

const regex1 = /if \(!grouped\[key\]\) grouped\[key\] = \{ \.\.\.r, records: \[\] \};\s*grouped\[key\]\.records\.push\(r\);/g;

const repl1 = `if (!grouped[key]) grouped[key] = { ...r, records: [] };
            
            const isDuplicate = grouped[key].records.some(ex => 
                ex.ip === r.ip &&
                ex.outVal === r.outVal && 
                Math.abs(ex.timestamp - r.timestamp) < 5 * 60 * 1000
            );
            
            if (!isDuplicate) {
                grouped[key].records.push(r);
            }`;

if (regex1.test(code)) {
    code = code.replace(regex1, repl1);
    console.log("Replaced deduplication logic.");
}

const targetSuccessLogic = `                const inVal = parseInt(r.inVal, 10) || 0;
                const outVal = parseInt(r.outVal, 10) || 0;
                if (inVal <= 0 || outVal < inVal * 0.95) {
                    success = false;
                    break;
                }`;

const replSuccessLogic = `                const inVal = parseInt(r.inVal, 10) || 0;
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

if (code.includes(targetSuccessLogic)) {
    code = code.replace(targetSuccessLogic, replSuccessLogic);
    console.log("Replaced success logic.");
} else {
    // Windows line endings maybe?
    const targetSuccessLogicCRLF = targetSuccessLogic.replace(/\\n/g, '\\r\\n');
    if (code.includes(targetSuccessLogicCRLF)) {
        code = code.replace(targetSuccessLogicCRLF, replSuccessLogic.replace(/\\n/g, '\\r\\n'));
        console.log("Replaced success logic (CRLF).");
    } else {
        console.log("Could not find success logic!");
    }
}

fs.writeFileSync(filePath, code, 'utf8');
console.log("Done.");
