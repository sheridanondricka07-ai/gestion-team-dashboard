const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../api/cron-master.js');
let code = fs.readFileSync(filePath, 'utf8');

const targetToInsertBefore = `        if (hour === 0) {
          console.log('Triggering PTR SPF Check...');`;

const insertText = `        console.log('Triggering Telegram Warmup Sync...');
        try {
            const baseUrl = process.env.VERCEL_URL ? \`https://\${process.env.VERCEL_URL}\` : 'http://localhost:3000';
            const triggerResp = await fetch(\`\${baseUrl}/api/sync-telegram-warmup\`, {
                method: 'GET',
                headers: { 'x-vercel-cron': 'true' }
            });
            console.log('Warmup Sync response:', triggerResp.status);
        } catch (e) {
            console.error('Error triggering Warmup Sync:', e);
        }

`;

if (code.includes(targetToInsertBefore)) {
    code = code.replace(targetToInsertBefore, insertText + targetToInsertBefore);
    fs.writeFileSync(filePath, code, 'utf8');
    console.log("Added sync-telegram-warmup to cron-master.");
} else {
    console.log("Target not found!");
}
