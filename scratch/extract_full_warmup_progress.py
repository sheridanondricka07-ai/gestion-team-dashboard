import json
from datetime import datetime

with open(r'database_backup.json', encoding='utf-8') as f:
    data = json.load(f)

warmup_data = data.get('warmupData', {})

# Filter out sh_ (canceled) servers and empty/RDNS domains
filtered_records = []
seen = set()

for v in warmup_data.values():
    if not isinstance(v, dict):
        continue
    server = (v.get('server') or '').strip()
    domain = (v.get('domain') or '').strip()
    ip = (v.get('ip') or '').strip()

    if not server or server.startswith('sh_') or not domain or domain.lower() == '[rdns]':
        continue

    key = (server, ip or 'N/A', domain)
    if key not in seen:
        seen.add(key)
        filtered_records.append(key)

print(f"Total Unique Active Warmup Records from Warmup Progress: {len(filtered_records)}\n")
print("server;ip;domain")
for s, ip_val, d in sorted(filtered_records):
    print(f"{s};{ip_val};{d}")
