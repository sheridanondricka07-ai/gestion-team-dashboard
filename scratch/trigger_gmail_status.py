"""
Trigger the gmail-status cron task manually to fill today's statuses.
We call the deployed Vercel endpoint with task=gmail-status.
"""
import urllib.request
import json

# Call the cron-master endpoint with gmail-status task
url = "https://gestion-team-dashboard.vercel.app/api/cron-master?task=gmail-status"
try:
    req = urllib.request.Request(url, method='GET')
    req.add_header('Authorization', 'Bearer internal-cron-secret')
    with urllib.request.urlopen(req, timeout=120) as response:
        data = json.loads(response.read().decode('utf-8'))
        print("Cron response:", json.dumps(data, indent=2))
except Exception as e:
    print("Error:", e)
