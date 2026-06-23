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

queue = get_firebase("state/autoWarmupQueue")
notified = get_firebase("state/autoWarmupNotified")

print("=== CURRENT AUTO WARMUP QUEUE ===")
if queue:
    print(json.dumps(queue, indent=2))
else:
    print("Queue is empty")

print("\n=== CURRENT AUTO WARMUP NOTIFIED STATE (Last 15 keys) ===")
if notified:
    sorted_keys = sorted(notified.keys())
    for k in sorted_keys[-15:]:
        print(f"  {k}: {notified[k]}")
else:
    print("Notified state is empty")
