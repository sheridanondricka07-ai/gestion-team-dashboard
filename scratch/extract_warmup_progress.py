import csv
import json
import re
from datetime import datetime

with open(r'database_backup.json', encoding='utf-8') as f:
    db = json.load(f)

# Extract warmupData from state
warmup_data = db.get('state', {}).get('warmupData', {})

# Build domain Change / IP lookup map
ip_map = {}
for item in db.get('state', {}).get('domainChangeHistory', []):
    if 'newDomain' in item and 'ip' in item:
        ip_map[item['newDomain'].lower().strip()] = item['ip'].strip()

# Also map IPs directly from warmupData entries
for k, entry in warmup_data.items():
    if isinstance(entry, dict):
        dom = (entry.get('domain') or '').strip().lower()
        ip = (entry.get('ip') or '').strip()
        if dom and ip and dom != '[rdns]':
            ip_map[dom] = ip

# Extract records strictly from warmupData
# Cutoff: 24/07/2026 to 27/07/2026
# Notice timestamps in JSON might be ms timestamps or date strings
results = []
seen = set()

# Process warmupData
for k, entry in warmup_data.items():
    if not isinstance(entry, dict):
        continue
    
    server = (entry.get('server') or '').strip()
    domain = (entry.get('domain') or '').strip()
    ip = (entry.get('ip') or '').strip()
    ts = entry.get('timestamp')

    # Ignore canceled sh_ servers and RDNS
    if not server or server.startswith('sh_') or domain == '[RDNS]':
        continue

    # Date check if timestamp exists
    dt = None
    if isinstance(ts, (int, float)):
        dt = datetime.fromtimestamp(ts / 1000.0 if ts > 1e11 else ts)
    elif isinstance(ts, str):
        try:
            dt = datetime.strptime(ts, '%m/%d/%Y, %I:%M:%S %p')
        except:
            pass

    # If domain missing IP, look up in ip_map
    if not ip:
        ip = ip_map.get(domain.lower(), 'N/A')

    if server and domain:
        key = (server, ip, domain)
        if key not in seen:
            seen.add(key)
            results.append(key)

print(f"Extracted {len(results)} active warmup records from Warmup Progress:\n")
print("server;ip;domain")
for s, ip, d in sorted(results):
    print(f"{s};{ip};{d}")
