import urllib.request
import json
from datetime import datetime

url = 'https://gestion-team-e-default-rtdb.firebaseio.com/warmupData.json'
try:
    with urllib.request.urlopen(url) as response:
        html = response.read()
        data = json.loads(html)
        if not data:
            print("No data")
            exit()
        
        arr = [x for x in data.values() if x.get('domain') == 'winability.info']
        print(f"winability.info matching records count: {len(arr)}")
        
        # Sort by timestamp desc
        arr.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
        
        for x in arr[:15]:
            dt = datetime.fromtimestamp(x.get('timestamp', 0) / 1000.0).strftime('%Y-%m-%d %H:%M:%S')
            print(f"User: {x.get('user')}, Server: {x.get('server')}, Domain: {x.get('domain')}, IP: {x.get('ip')}, IN: {x.get('inVal')}, OUT: {x.get('outVal')}, Date: {dt}, Timestamp: {x.get('timestamp')}")
except Exception as e:
    print("Error:", e)
