import urllib.request
import json
import ssl

DB_URL = "https://gestion-team-e-default-rtdb.firebaseio.com"
context = ssl._create_unverified_context()

req = urllib.request.Request(f"{DB_URL}/state/autoWarmupNotified.json")
with urllib.request.urlopen(req, context=context) as response:
    notified = json.loads(response.read().decode()) or {}

print("=== ALL STOPPED ALERTS IN NOTIFIED STATE ===")
for k, v in notified.items():
    if "stopped" in k:
        print(f"  {k}: {v}")
