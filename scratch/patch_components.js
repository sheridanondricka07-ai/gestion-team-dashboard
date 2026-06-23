const fs = require('fs');
let code = fs.readFileSync('components.js', 'utf8');

code = code.replace(
    /const snapshot = await window\.db\.ref\('warmupData'\)\.once\('value'\);/g,
    "const snapshot = await window.db.ref('warmupData').orderByKey().limitToLast(2000).once('value');"
);

code = code.replace(
    /const snapshotUpdate = await window\.db\.ref\('warmupData'\)\.once\('value'\);/g,
    "const snapshotUpdate = await window.db.ref('warmupData').orderByKey().limitToLast(2000).once('value');"
);

fs.writeFileSync('components.js', code, 'utf8');
console.log("Patched components.js successfully.");
