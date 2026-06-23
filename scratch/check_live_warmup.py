import urllib.request
import json
import ssl
from datetime import datetime

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

print("=== CURRENT AUTO WARMUP QUEUE ===")
queue = get_firebase("state/autoWarmupQueue") or {}
print(json.dumps(queue, indent=2))

print("\n=== RECENT NOTIFIED STATE ===")
notified = get_firebase("state/autoWarmupNotified") or {}
print(json.dumps(notified, indent=2))

print("\n=== ACTIVE WARMUPS IN LAST 24 HOURS ===")
all_data = get_firebase("warmupData") or {}
grouped = {}
cutoff = datetime.now().timestamp() * 1000 - (24 * 60 * 60 * 1000)

for r in all_data.values():
    if not r.get("domain") and not r.get("ip") and not r.get("server"):
        continue
    t = r.get("timestamp", 0)
    if t < cutoff:
        continue
    key = f"{r.get('domain','')}_{r.get('server','')}_{r.get('ip','')}"
    if key not in grouped:
        grouped[key] = {**r, "records": []}
    grouped[key]["records"].append(r)

for key, g in grouped.items():
    records = sorted(g["records"], key=lambda x: x.get("timestamp", 0), reverse=True)
    latest = records[0]
    in_val = int(latest.get("inVal", 0))
    out_val = int(latest.get("outVal", 0))
    time_str = datetime.fromtimestamp(latest.get("timestamp", 0)/1000).strftime('%Y-%m-%d %H:%M:%S')
    print(f"- Target: {key}")
    print(f"  Latest drop: IN={in_val}, OUT={out_val}, Time={time_str}, Count={len(records)}")
    
    success = True
    if len(records) < 3:
        success = False
    else:
        for i in range(3):
            r = records[i]
            r_in = int(r.get("inVal", 0))
            r_out = int(r.get("outVal", 0))
            if r_in <= 0 or r_out < r_in * 0.95:
                success = False
                break
    print(f"  Succeed in 3 last drops: {success}")
