import urllib.request
import json

DB_URL = "https://gestion-team-e-default-rtdb.firebaseio.com"

# Fetch existing data
try:
    req = urllib.request.Request(f"{DB_URL}/state/statuses.json")
    with urllib.request.urlopen(req) as response:
        statuses = json.loads(response.read().decode('utf-8'))
        print("Successfully read statuses. Keys:", len(statuses.keys()))
except Exception as e:
    print("Error reading:", e)
    statuses = {}

# Try updating a key for today
test_ip = "104_206_145_34"
today = "2026-05-28"
if test_ip not in statuses:
    statuses[test_ip] = {}
statuses[test_ip][today] = "rdns"

print("Attempting to write test status...")
try:
    data_bytes = json.dumps(statuses).encode('utf-8')
    req = urllib.request.Request(
        f"{DB_URL}/state/statuses.json",
        data=data_bytes,
        headers={'Content-Type': 'application/json'},
        method='PUT'
    )
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode('utf-8'))
        print("Successfully wrote back! Response keys count:", len(res.keys()))
except Exception as e:
    print("Error writing:", e)
