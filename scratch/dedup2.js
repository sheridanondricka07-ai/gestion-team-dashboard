const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../components.js');
let code = fs.readFileSync(filePath, 'utf8');

const regex1 = /warmupGrouped\[key\]\s*=\s*\{\s*domain:\s*resolvedDomain,\s*server:\s*r\.server,\s*ip:\s*r\.ip,\s*records:\s*\[\]\s*\};\s*\}\s*warmupGrouped\[key\]\.records\.push\(r\);\s*\}\);/g;

const repl1 = `warmupGrouped[key] = {
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

const regex2 = /grouped\[key\]\s*=\s*\{\s*domain:\s*resolvedDomain,\s*server:\s*r\.server,\s*ip:\s*r\.ip,\s*records:\s*\[\]\s*\};\s*\}\s*grouped\[key\]\.records\.push\(r\);\s*\}\);/g;

const repl2 = `grouped[key] = {
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
if (regex1.test(code)) {
    code = code.replace(regex1, repl1);
    fixed = true;
    console.log("Replaced 1");
}

if (regex2.test(code)) {
    code = code.replace(regex2, repl2);
    fixed = true;
    console.log("Replaced 2");
}

if (fixed) {
    fs.writeFileSync(filePath, code, 'utf8');
    console.log("Done.");
} else {
    console.log("Could not find targets.");
}
