const fs = require('fs');
const file = 'c:/Users/admin_11/Documents/Gestion_Team/api/sync-telegram-warmup.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Add parse_mode to queue processor
content = content.replace(
    'chat_id: itemToSend.chat_id,\n                    text: itemToSend.text\n                })',
    'chat_id: itemToSend.chat_id,\n                    text: itemToSend.text,\n                    ...(itemToSend.parse_mode && { parse_mode: itemToSend.parse_mode })\n                })'
);

// 2. Change sendWarmupReport to formatWarmupReport
content = content.replace(
    /async function sendWarmupReport\([^\{]+\{\s*const notifToken[\s\S]*?catch \(e\) \{\s*console\.error\([^\}]+\}\s*\}/,
    \unction formatWarmupReport(server, ip, domain, action, beforeSend, afterSend, userName, reason) {
    const emoji = action === "Upgrade" ? "?? <b>Warmup Upgrade</b>" : "?? <b>Warmup Downgrade</b>";
    return \ + '\' + \\\\n\\n\ + '\' + \ +
                 \ + '\' + \?? Server: <b>\</b>\\n\ + '\' + \ +
                 \ + '\' + \?? User: <b>\</b>\\n\ + '\' + \ +
                 \ + '\' + \?? IP: <code>\</code>\\n\ + '\' + \ +
                 \ + '\' + \?? Domain: <b>\</b>\\n\ + '\' + \ +
                 \ + '\' + \?? Send Size: <code>\</code> ?? <b>\</b>\\n\\n\ + '\' + \ +
                 \ + '\' + \?? Reason: \\ + '\' + \;
}\
);

// 3. Update Upgrade queueing
content = content.replace(
    /const userName = g\.records && g\.records\[0\] \? g\.records\[0\]\.user : "Unknown";\\s*await sendWarmupReport\\([^;]+\\);/,
    \const userName = g.records && g.records[0] ? g.records[0].user : "Unknown";
                      const reportText = formatWarmupReport(g.server, g.ip, cleanDomain, "Upgrade", latestVal, nextTarget, userName, "Last 3 drops succeeded (OUT >= 95% of IN).");
                      maxSendAt = maxSendAt + 10000;
                      queueState["q_" + safeKey + "_report"] = {
                          chat_id: "-5317343683",
                          text: reportText,
                          parse_mode: 'HTML',
                          sendAt: maxSendAt
                      };\
);

// 4. Update Downgrade queueing
content = content.replace(
    /const userName = g\.records && g\.records\[0\] \? g\.records\[0\]\.user : "Unknown";\\s*await sendWarmupReport\\([^;]+\\);/,
    \const userName = g.records && g.records[0] ? g.records[0].user : "Unknown";
                             const reportText = formatWarmupReport(g.server, g.ip, cleanDomain, "Downgrade", latestVal, prevTarget, userName, "Last 2 drops failed (OUT < 95% of IN or IN <= 0).");
                             maxSendAt = maxSendAt + 10000;
                             queueState["q_" + safeKey + "_report"] = {
                                 chat_id: "-5317343683",
                                 text: reportText,
                                 parse_mode: 'HTML',
                                 sendAt: maxSendAt
                             };\
);

fs.writeFileSync(file, content);
console.log('Patch complete.');
