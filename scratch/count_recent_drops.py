import urllib.request
import json
import time

url = "https://gestion-team-e-default-rtdb.firebaseio.com/warmupData.json"
start = time.time()
try:
    with urllib.request.urlopen(url) as response:
        data = response.read()
        parsed = json.loads(data.decode('utf-8'))
        print(f"Total records in warmupData: {len(parsed)}")
        print(f"Downloaded size: {len(data) / 1024:.2f} KB")
        
        now_ms = time.time() * 1000
        one_day_ms = 24 * 60 * 60 * 1000
        cutoff = now_ms - one_day_ms
        
        recent_count = 0
        for k, v in parsed.items():
            if isinstance(v, dict) and 'timestamp' in v:
                if v['timestamp'] >= cutoff:
                    recent_count += 1
        print(f"Records in the last 24 hours: {recent_count}")
except Exception as e:
    print("Error:", e)
