import csv
import json
import re
from datetime import datetime

with open(r'database_backup.json', encoding='utf-8') as f:
    db = json.load(f)

# Build domain -> IP lookup map from domainChangeHistory
ip_map = {}
for item in db.get('state', {}).get('domainChangeHistory', []):
    if 'newDomain' in item and 'ip' in item:
        ip_map[item['newDomain'].lower().strip()] = item['ip'].strip()

# Build domain -> IP lookup map from autoWarmupNotified keys
auto_warmup = db.get('state', {}).get('autoWarmupNotified', {})
for k in auto_warmup.keys():
    if '_sh_wmn3_' in k:
        continue
    m = re.search(r'(\d+_\d+_\d+_\d+)', k)
    if m:
        ip_str = m.group(1).replace('_', '.')
        domain_part = re.split(r'_(?:s|sh)_wmn3_', k)[0]
        parts = domain_part.split('_')
        if len(parts) >= 2:
            possible_domain = ".".join(parts[:-1]) + "." + parts[-1]
            if possible_domain not in ip_map:
                ip_map[possible_domain] = ip_str

results = []
seen = set()

# Process CSV records strictly excluding any 'sh_' servers
with open(r'warmup_domains_report.csv', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        domain = row.get('Domain', '').strip('" ')
        server = row.get('Server', '').strip('" ')
        
        # Exclude RDNS and canceled 'sh_' servers
        if not domain or domain == '[RDNS]' or server.startswith('sh_'):
            continue

        ip = ip_map.get(domain.lower(), 'N/A')
        key = (server, ip, domain)
        if key not in seen:
            seen.add(key)
            results.append(key)

print("server;ip;domain")
for s, ip, d in sorted(results):
    print(f"{s};{ip};{d}")
