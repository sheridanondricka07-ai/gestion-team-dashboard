$response = Invoke-RestMethod -Uri 'https://gestion-team-e-default-rtdb.firebaseio.com/state/autoWarmupNotified.json'
$response.PSObject.Properties.Remove('104_206_145_35_s_wmn3_2236_200')
$response.PSObject.Properties.Remove('104_206_145_37_s_wmn3_2236_200')
$response.PSObject.Properties.Remove('104_206_145_38_s_wmn3_2236_500')

$json = $response | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri 'https://gestion-team-e-default-rtdb.firebaseio.com/state/autoWarmupNotified.json' -Method Put -Body $json -ContentType 'application/json'
Write-Host 'Deleted keys successfully.'
