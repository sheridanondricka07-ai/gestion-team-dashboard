import json
from datetime import datetime

with open(r'database_backup.json', encoding='utf-8') as f:
    data = json.load(f)

warmup_data = data.get('warmupData', {})

burst_records = []
for k, v in warmup_data.items():
    if isinstance(v, dict) and (v.get('domain') == 'burstinterface.com' or 'burstinterface' in (v.get('domain') or '')):
        burst_records.append(v)

burst_records.sort(key=lambda x: x.get('timestamp', 0))
print(f"Total drops for burstinterface.com: {len(burst_records)}")
if burst_records:
    first = burst_records[0]
    last = burst_records[-1]
    first_ts = first.get('timestamp')
    last_ts = last.get('timestamp')
    print("First drop:", first, "-> Date:", datetime.fromtimestamp(first_ts / 1000.0 if first_ts > 1e11 else first_ts))
    print("Last drop:", last, "-> Date:", datetime.fromtimestamp(last_ts / 1000.0 if last_ts > 1e11 else last_ts))

# Check warmupStats for burstinterface
warmup_stats = data.get('state', {}).get('warmupStats', {})
print("\nWarmupStats entries matching burstinterface:")
for k, v in warmup_stats.items():
    if 'burstinterface' in k:
        print(k, "=>", v)
