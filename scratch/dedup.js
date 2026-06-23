const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../components.js');
let code = fs.readFileSync(filePath, 'utf8');

const target1 = `                if (!warmupGrouped[key]) {
                    warmupGrouped[key] = {
                        domain: resolvedDomain,
                        server: r.server,
                        ip: r.ip,
                        records: []
                    };
                }
                warmupGrouped[key].records.push(r);
            });`;

const replacement1 = `                if (!warmupGrouped[key]) {
                    warmupGrouped[key] = {
                        domain: resolvedDomain,
                        server: r.server,
                        ip: r.ip,
                        records: []
                    };
                }
                
                const isDuplicate = warmupGrouped[key].records.some(ex => 
                    ex.ip === r.ip &&
                    ex.outVal === r.outVal && 
                    Math.abs(ex.timestamp - r.timestamp) < 5 * 60 * 1000
                );
                
                if (!isDuplicate) {
                    warmupGrouped[key].records.push(r);
                }
            });`;

const target2 = `        if (!grouped[key]) {
            grouped[key] = {
                domain: resolvedDomain,
                server: r.server,
                ip: r.ip,
                records: []
            };
        }
        grouped[key].records.push(r);
    });`;

const replacement2 = `        if (!grouped[key]) {
            grouped[key] = {
                domain: resolvedDomain,
                server: r.server,
                ip: r.ip,
                records: []
            };
        }
        
        const isDuplicate = grouped[key].records.some(ex => 
            ex.ip === r.ip &&
            ex.outVal === r.outVal && 
            Math.abs(ex.timestamp - r.timestamp) < 5 * 60 * 1000
        );
        
        if (!isDuplicate) {
            grouped[key].records.push(r);
        }
    });`;

let fixed = false;
if (code.includes(target1)) {
    code = code.replace(target1, replacement1);
    fixed = true;
    console.log("Replaced 1");
}

if (code.includes(target2)) {
    code = code.replace(target2, replacement2);
    fixed = true;
    console.log("Replaced 2");
}

if (fixed) {
    fs.writeFileSync(filePath, code, 'utf8');
    console.log("Done.");
} else {
    console.log("Could not find targets.");
}
