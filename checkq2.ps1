$response = Invoke-WebRequest -Uri 'https://gestion-team-e-default-rtdb.firebaseio.com/state/autoWarmupQueue.json'
Write-Host $response.Content
