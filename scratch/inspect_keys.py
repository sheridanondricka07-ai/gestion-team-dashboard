import json

with open(r'database_backup.json', encoding='utf-8') as f:
    data = json.load(f)

print("Top keys in database_backup.json:", list(data.keys()))
if 'state' in data:
    print("Keys in data['state']:", list(data['state'].keys())[:20])
