import urllib.request
import json
from datetime import datetime

url = "https://gestion-team-e-default-rtdb.firebaseio.com/warmupData.json"
try:
    with urllib.request.urlopen(url) as response:
        data = json.loads(response.read().decode())
        if not data:
            print("No warmupData found")
            exit()
        
        arr = [x for x in data.values() if x and x.get('server') == 's_wmn3_2193']
        arr.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
        print(f"Total s_wmn3_2193 records: {len(arr)}")
        for x in arr[:20]:
            dt = datetime.fromtimestamp(x.get('timestamp', 0) / 1000.0).strftime('%Y-%m-%d %H:%M:%S')
            print(f"User: {x.get('user')}, Domain: {x.get('domain')}, IP: {x.get('ip')}, IN: {x.get('inVal')}, OUT: {x.get('outVal')}, Date: {dt}")
except Exception as e:
    print("Error:", e)
