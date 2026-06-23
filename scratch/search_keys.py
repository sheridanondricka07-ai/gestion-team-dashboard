import urllib.request
import json
import ssl

DB_URL = "https://gestion-team-e-default-rtdb.firebaseio.com"
context = ssl._create_unverified_context()

def get_firebase(path):
    req = urllib.request.Request(f"{DB_URL}/{path}.json")
    try:
        with urllib.request.urlopen(req, context=context) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"Error reading {path}: {e}")
        return None

notified = get_firebase("state/autoWarmupNotified") or {}

print("=== SEARCHING KEYS IN NOTIFIED STATE ===")
found_keys = []
for k in notified:
    if "2236" in k or "104_206_145" in k or "ghazzali" in k:
        print(f"  {k}: {notified[k]}")
        found_keys.append(k)

if not found_keys:
    print("No matching keys found.")
