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

all_data = get_firebase("warmupData") or {}
notified = get_firebase("state/autoWarmupNotified") or {}

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

LEVELS = [50, 100, 200, 300, 500, 760, 1000, 1500, 2000, 3000, 5000, 7000, 8000, 10000, 15000, 19000, 21000, 26000, 30000]

print("=== CHECKING PENDING UPGRADES ===")
for key, g in grouped.items():
    records = sorted(g["records"], key=lambda x: x.get("timestamp", 0), reverse=True)
    if len(records) < 3:
        continue
    
    success = True
    for i in range(3):
        r = records[i]
        r_in = int(r.get("inVal", 0))
        r_out = int(r.get("outVal", 0))
        if r_in <= 0 or r_out < r_in * 0.95:
            success = False
            break
            
    if success:
        latest_val = int(records[0].get("inVal", 0))
        next_target = next((l for l in LEVELS if l > latest_val), latest_val)
        
        is_rdns = not g.get("domain") or g.get("domain").lower().strip() in ["[rdns]", "rdns"]
        clean_domain = g.get("ip", "unknown") if is_rdns else (g.get("domain") or g.get("ip", "unknown"))
        safe_domain = clean_domain.replace(".", "_").replace("#", "_").replace("$", "_").replace("[", "_").replace("]", "_")
        safe_key = f"{safe_domain}_{g.get('server')}_{next_target}"
        
        if safe_key not in notified:
            print(f"Qualifies for Upgrade but NOT notified: {key}")
            print(f"  Current IN={latest_val}, Target={next_target}")
            print(f"  Expected safeKey: {safe_key}")
        else:
            print(f"Already upgraded: {key} (Target: {next_target})")
