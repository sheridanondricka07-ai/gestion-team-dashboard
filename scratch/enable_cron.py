import urllib.request
import json

API_KEY = "LLZY3mhIByx5C3gnAoYG+iaw5UfXbZMoiAgIcN8eyqI="
BASE_URL = "https://api.cron-job.org"

# Let's try to enable job 7892241 first
job_id = 7892241

# According to cron-job.org API, to edit a job we send a PATCH request to /jobs/{jobId}
# with the fields we want to update under the "job" key.
payload = {
    "job": {
        "enabled": True
    }
}

req = urllib.request.Request(
    f"{BASE_URL}/jobs/{job_id}",
    data=json.dumps(payload).encode('utf-8'),
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    },
    method="PATCH"
)

try:
    with urllib.request.urlopen(req) as resp:
        print("Response status:", resp.status)
        print("Response content:", resp.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
