import urllib.request
import json
import time

url = 'https://gestion-team-e-default-rtdb.firebaseio.com/warmupData.json?orderBy="$key"&limitToLast=2000'
start = time.time()
try:
    with urllib.request.urlopen(url) as response:
        data = response.read()
        parsed = json.loads(data.decode('utf-8'))
        print(f"Fetched {len(parsed)} records in {time.time() - start:.2f} seconds")
        print(f"Size: {len(data) / 1024:.2f} KB")
except Exception as e:
    print("Error:", e)
