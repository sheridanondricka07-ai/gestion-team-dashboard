import json
from datetime import datetime

with open(r'database_backup.json', encoding='utf-8') as f:
    data = json.load(f)

warmup_data = data.get('warmupData', {})

timestamps = [v['timestamp'] for v in warmup_data.values() if isinstance(v, dict) and 'timestamp' in v]
if timestamps:
    min_ts = min(timestamps)
    max_ts = max(timestamps)
    print("Min timestamp:", min_ts, "->", datetime.fromtimestamp(min_ts / 1000.0 if min_ts > 1e11 else min_ts))
    print("Max timestamp:", max_ts, "->", datetime.fromtimestamp(max_ts / 1000.0 if max_ts > 1e11 else max_ts))

# Let's count records in the last 72 hours relative to max_ts
max_dt = datetime.fromtimestamp(max_ts / 1000.0 if max_ts > 1e11 else max_ts)
cutoff_72h = max_dt.replace(day=max_dt.day-3)

results = []
seen = set()

for v in warmup_data.values():
    if not isinstance(v, dict):
        continue
    server = (v.get('server') or '').strip()
    domain = (v.get('domain') or '').strip()
    ip = (v.get('ip') or '').strip()
    ts = v.get('timestamp')

    # Ignore canceled sh_ servers and empty/RDNS placeholders
    if not server or server.startswith('sh_') or not domain or domain.lower() == '[rdns]':
        continue

    dt = datetime.fromtimestamp(ts / 1000.0 if ts > 1e11 else ts)
    if dt >= cutoff_72h:
        key = (server, ip or 'N/A', domain)
        if key not in seen:
            seen.add(key)
            results.append(key)

print(f"\nExtracted {len(results)} UNIQUE (server;ip;domain) records from Warmup Progress:\n")
print("server;ip;domain")
for s, ip_val, d in sorted(results):
    print(f"{s};{ip_val};{d}")
