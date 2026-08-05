import json
from datetime import datetime

with open(r'database_backup.json', encoding='utf-8') as f:
    data = json.load(f)

warmup_data = data.get('warmupData', {})
print(f"Total entries in warmupData: {len(warmup_data)}")

# Sample entry structure
sample_keys = list(warmup_data.keys())[:5]
for k in sample_keys:
    print(k, "=>", warmup_data[k])
