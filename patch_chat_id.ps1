$content = Get-Content 'c:/Users/admin_11/Documents/Gestion_Team/api/sync-telegram-warmup.js' -Raw

$content = $content -replace 'parse_mode: itemToSend\.parse_mode \}\)', 'parse_mode: itemToSend.parse_mode, message_thread_id: itemToSend.message_thread_id })'

$content = $content -replace '\{ chat_id: "-5317343683", text: reportText, parse_mode: "HTML", sendAt: maxSendAt \};', '{ chat_id: "-1003735130681", message_thread_id: 91, text: reportText, parse_mode: "HTML", sendAt: maxSendAt };'

Set-Content 'c:/Users/admin_11/Documents/Gestion_Team/api/sync-telegram-warmup.js' $content
