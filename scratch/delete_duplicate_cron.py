import urllib.request

API_KEY = "LLZY3mhIByx5C3gnAoYG+iaw5UfXbZMoiAgIcN8eyqI="
BASE_URL = "https://api.cron-job.org"
job_id = 7889834

req = urllib.request.Request(
    f"{BASE_URL}/jobs/{job_id}",
    headers={
        "Authorization": f"Bearer {API_KEY}"
    },
    method="DELETE"
)

try:
    with urllib.request.urlopen(req) as resp:
        print("Response status:", resp.status)
        print("Response content:", resp.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
