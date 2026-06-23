$content = Get-Content 'c:/Users/admin_11/Documents/Gestion_Team/api/sync-telegram-warmup.js' -Raw

# Replace the sendWarmupReport function definition
$regex1 = '(?s)async function sendWarmupReport\(server, ip, domain, action, beforeSend, afterSend, userName, reason\) \{.*?catch \(e\) \{.*?\}\s*\}'
$replacement1 = 'function formatWarmupReport(server, ip, domain, action, beforeSend, afterSend, userName, reason) { const emoji = action === "Upgrade" ? "?? <b>Warmup Upgrade</b>" : "?? <b>Warmup Downgrade</b>"; return emoji + "`n`n?? Server: <b>" + (server || "N/A") + "</b>`n?? User: <b>" + (userName || "Unknown") + "</b>`n?? IP: <code>" + (ip || "N/A") + "</code>`n?? Domain: <b>" + (domain || "N/A") + "</b>`n?? Send Size: <code>" + beforeSend + "</code> ?? <b>" + afterSend + "</b>`n`n?? Reason: " + reason; }'

$content = [System.Text.RegularExpressions.Regex]::Replace($content, $regex1, $replacement1)

# Replace the Upgrade call
$regex2 = 'await sendWarmupReport\(g\.server, g\.ip, cleanDomain, "Upgrade", latestVal, nextTarget, userName, "Last 3 drops succeeded \(OUT >= 95% of IN\)\."\);'
$replacement2 = 'const reportText = formatWarmupReport(g.server, g.ip, cleanDomain, "Upgrade", latestVal, nextTarget, userName, "Last 3 drops succeeded (OUT >= 95% of IN)."); maxSendAt = maxSendAt + 10000; queueState["q_" + safeKey + "_report"] = { chat_id: "-5317343683", text: reportText, parse_mode: "HTML", sendAt: maxSendAt };'

$content = [System.Text.RegularExpressions.Regex]::Replace($content, $regex2, $replacement2)

# Replace the Downgrade call
$regex3 = 'await sendWarmupReport\(g\.server, g\.ip, cleanDomain, "Downgrade", latestVal, prevTarget, userName, "Last 2 drops failed \(OUT < 95% of IN or IN <= 0\)\."\);'
$replacement3 = 'const reportText = formatWarmupReport(g.server, g.ip, cleanDomain, "Downgrade", latestVal, prevTarget, userName, "Last 2 drops failed (OUT < 95% of IN or IN <= 0)."); maxSendAt = maxSendAt + 10000; queueState["q_" + safeKey + "_report"] = { chat_id: "-5317343683", text: reportText, parse_mode: "HTML", sendAt: maxSendAt };'

$content = [System.Text.RegularExpressions.Regex]::Replace($content, $regex3, $replacement3)

Set-Content 'c:/Users/admin_11/Documents/Gestion_Team/api/sync-telegram-warmup.js' $content
