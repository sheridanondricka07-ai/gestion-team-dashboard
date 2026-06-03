import urllib.request
import json

API_KEY = "LLZY3mhIByx5C3gnAoYG+iaw5UfXbZMoiAgIcN8eyqI="
BASE_URL = "https://api.cron-job.org"

payload = {
    "job": {
        "title": "Daily RP SPF Check",
        "url": "https://gestion-team-dashboard.vercel.app/api/cron-master?task=spf",
        "enabled": True,
        "saveResponses": True,
        "schedule": {
            "timezone": "UTC",
            "hours": [5],
            "minutes": [0],
            "mdays": [-1],
            "months": [-1],
            "wdays": [-1]
        },
        "requestMethod": 0,  # GET request
        "auth": {
            "enable": False
        },
        "extendedData": {
            "headers": {
                "Authorization": "Bearer internal-cron-secret"
            },
            "body": ""
        }
    }
}

req = urllib.request.Request(
    f"{BASE_URL}/jobs",
    data=json.dumps(payload).encode('utf-8'),
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    },
    method="PUT"
)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print("Success! Created Daily RP SPF Cron Job:")
        print(json.dumps(data, indent=2))
except Exception as e:
    print("Error:", e)
