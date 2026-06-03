import urllib.request
import json

API_KEY = "LLZY3mhIByx5C3gnAoYG+iaw5UfXbZMoiAgIcN8eyqI="
BASE_URL = "https://api.cron-job.org"
JOB_ID = 7630561

req = urllib.request.Request(
    f"{BASE_URL}/jobs/{JOB_ID}",
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print(json.dumps(data, indent=2))
except Exception as e:
    print("Error:", e)
