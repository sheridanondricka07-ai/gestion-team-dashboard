$response = Invoke-RestMethod -Uri 'https://gestion-team-e-default-rtdb.firebaseio.com/state/autoWarmupQueue.json'
if ($response) {
    $response.PSObject.Properties | Select-Object Name | ForEach-Object { $_ }
} else {
    Write-Host 'Queue is empty'
}
