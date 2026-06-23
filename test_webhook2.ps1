$body = @{
    text = "User: h.ghazzali`nServer Deployment Summary`n200 (IN) 200 (OUT)`ns_wmn3_2236 200 200`n104.206.145.37`n【IP】: 104.206.145.37"
} | ConvertTo-Json

Invoke-RestMethod -Uri 'https://gestion-team-dashboard.vercel.app/api/sync-telegram-warmup' -Method POST -Body $body -Headers @{ 'Content-Type'='application/json' }
