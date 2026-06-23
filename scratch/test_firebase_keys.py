import urllib.request
import json
import time

url = 'https://gestion-team-e-default-rtdb.firebaseio.com/warmupData.json?orderBy="$key"&limitToLast=2000'
try:
    with urllib.request.urlopen(url) as response:
        data = response.read()
        parsed = json.loads(data.decode('utf-8'))
        
        ext_count = sum(1 for k in parsed.keys() if k.startswith('ext_'))
        num_count = sum(1 for k in parsed.keys() if k.isdigit())
        other = len(parsed) - ext_count - num_count
        
        print(f"Total: {len(parsed)}")
        print(f"ext_ keys: {ext_count}")
        print(f"numeric keys: {num_count}")
        print(f"other keys: {other}")
except Exception as e:
    print("Error:", e)
