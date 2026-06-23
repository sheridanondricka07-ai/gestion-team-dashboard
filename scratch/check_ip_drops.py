import urllib.request
import json
import ssl
from datetime import datetime

DB_URL = "https://gestion-team-e-default-rtdb.firebaseio.com"
context = ssl._create_unverified_context()

req = urllib.request.Request(f"{DB_URL}/warmupData.json")
with urllib.request.urlopen(req, context=context) as response:
    all_data = json.loads(response.read().decode()) or {}

ip_records = []
for r in all_data.values():
    if r.get("ip") == "5.135.98.35":
        ip_records.append(r)

print(f"Total records found for 5.135.98.35: {len(ip_records)}")
ip_records = sorted(ip_records, key=lambda x: x.get("timestamp", 0), reverse=True)
for r in ip_records[:10]:
    t = r.get("timestamp", 0)
    time_str = datetime.fromtimestamp(t/1000).strftime('%Y-%m-%d %H:%M:%S')
    print(f"  Domain: {r.get('domain')}, Server: {r.get('server')}, IN={r.get('inVal')}, OUT={r.get('outVal')}, Time={time_str}")
