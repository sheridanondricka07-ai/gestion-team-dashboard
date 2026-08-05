const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../api/sync-telegram-warmup.js');
let code = fs.readFileSync(filePath, 'utf8');

// We need to add `lastProcessedDropId` check inside processAutoWarmup
// Find the start of the upgrade check loop
const checkTarget = /if \(!warmupStats\[statKey\]\) \{/;

const patchLogic = `
                          // PREVENT DOUBLE PROCESSING: Only evaluate if we haven't processed this exact drop before
                          if (warmupStats[statKey].lastProcessedDropId === latestDrop.messageId) {
                              return; // Skip evaluation, already processed
                          }
                          warmupStats[statKey].lastProcessedDropId = latestDrop.messageId;

                          if (!warmupStats[statKey]) {`;

code = code.replace(checkTarget, patchLogic);

// Remove the early webhook return for processAutoWarmup so the cron job is the only one doing the heavy lifting?
// Actually, if it's a webhook, we DON'T want to call processAutoWarmup at all, to save bandwidth.
// Let's find:
/*
        if (isTelegramWebhook) {
            await processAutoWarmup(newRecords);
            
            return res.status(200).json({ 
                success: true, 
                addedCount 
            });
        }
*/
const webhookBlock = /if \(isTelegramWebhook\) \{\s*await processAutoWarmup\(newRecords\);\s*return res\.status\(200\)\.json\(\{[\s\S]*?\}\);\s*\}/;

const newWebhookBlock = `if (isTelegramWebhook) {
            // Webhook ONLY saves data to prevent bandwidth exhaustion. 
            // The heavy upgrade evaluation will be done by the 5-minute cron job.
            return res.status(200).json({ 
                success: true, 
                addedCount 
            });
        }`;

code = code.replace(webhookBlock, newWebhookBlock);

fs.writeFileSync(filePath, code, 'utf8');
console.log("Patched processAutoWarmup to prevent double processing and webhook exhaustion.");
