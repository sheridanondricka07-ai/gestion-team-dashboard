import urllib.request
import json
import ssl

DB_URL = "https://gestion-team-e-default-rtdb.firebaseio.com"
context = ssl._create_unverified_context()

req = urllib.request.Request(f"{DB_URL}/state/autoWarmupNotified.json")
with urllib.request.urlopen(req, context=context) as response:
    notified = json.loads(response.read().decode()) or {}

print(f"Total notified keys: {len(notified)}")
for k, v in list(notified.items())[-20:]:
    print(f"  {k}: {v}")
