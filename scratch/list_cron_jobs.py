import urllib.request
import json

API_KEY = "LLZY3mhIByx5C3gnAoYG+iaw5UfXbZMoiAgIcN8eyqI="
BASE_URL = "https://api.cron-job.org"

req = urllib.request.Request(
    f"{BASE_URL}/jobs",
    headers={
        "Authorization": f"Bearer {API_KEY}"
    },
    method="GET"
)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print("Success! Jobs on cron-job.org:")
        for job in data.get("jobs", []):
            print(f"- ID: {job.get('jobId')} | Title: {job.get('title')} | URL: {job.get('url')} | Enabled: {job.get('enabled')}")
except Exception as e:
    print("Error:", e)
