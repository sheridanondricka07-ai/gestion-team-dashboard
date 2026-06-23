$response = Invoke-WebRequest -Uri 'https://gestion-team-e-default-rtdb.firebaseio.com/state/autoWarmupNotified.json'
Write-Host $response.Content
