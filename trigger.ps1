$body = @{ text = "test" } | ConvertTo-Json
Invoke-RestMethod -Uri "https://gestion-team-dashboard.vercel.app/api/sync-telegram-warmup" -Method POST -Body $body -Headers @{ "Content-Type" = "application/json"; "User-Agent" = "Telegram Bot API" }
