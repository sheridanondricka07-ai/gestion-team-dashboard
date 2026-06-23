const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../api/sync-telegram-warmup.js');
let code = fs.readFileSync(filePath, 'utf8');

// Patch getFirebaseData to prevent caching
code = code.replace(
    /const resp = await fetch\(`\$\{DB_URL\}\/\$\{path\}\.json`\);/g,
    "const resp = await fetch(`${DB_URL}/${path}.json`, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' }, cache: 'no-store' });"
);

// Patch the warmupData fetch to prevent caching
code = code.replace(
    /const resp = await fetch\(`\$\{DB_URL\}\/warmupData\.json\?orderBy="\$key"&limitToLast=2000`\);/g,
    "const resp = await fetch(`${DB_URL}/warmupData.json?orderBy=\"$key\"&limitToLast=2000`, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' }, cache: 'no-store' });"
);

fs.writeFileSync(filePath, code, 'utf8');
console.log("Patched getFirebaseData to prevent caching.");
