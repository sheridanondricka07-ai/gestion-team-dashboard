import urllib.request
import json
import ssl

DB_URL = "https://gestion-team-e-default-rtdb.firebaseio.com"
context = ssl._create_unverified_context()

req = urllib.request.Request(f"{DB_URL}/warmupData.json")
with urllib.request.urlopen(req, context=context) as response:
    all_data = json.loads(response.read().decode()) or {}

for k, r in all_data.items():
    if r.get("ip") == "5.135.98.35":
        print(f"Key: {k}")
        print(json.dumps(r, indent=2))
