const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../api/sync-telegram-warmup.js');
let code = fs.readFileSync(filePath, 'utf8');

const regexSave = /if \(Object\.keys\(newQueueItems\)\.length > 0\) \{/g;
const replSave = `if (statsUpdated) {
              await fetch(\`\${DB_URL}/state/warmupStats.json\`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(warmupStats)
              });
          }
          if (Object.keys(newQueueItems).length > 0) {`;

if (regexSave.test(code)) {
    code = code.replace(regexSave, replSave);
    fs.writeFileSync(filePath, code, 'utf8');
    console.log("Stats save logic inserted.");
} else {
    console.log("Could not find target.");
}
