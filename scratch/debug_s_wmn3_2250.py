import urllib.request
import json

url = 'https://gestion-team-e-default-rtdb.firebaseio.com/state/servers.json'
try:
    with urllib.request.urlopen(url) as response:
        html = response.read()
        servers = json.loads(html)
        if not servers:
            print("No servers")
            exit()
        
        target = [s for s in servers if s and s.get('name') == 's_wmn3_2250']
        print("s_wmn3_2250 Details:")
        print(json.dumps(target, indent=2))
except Exception as e:
    print("Error:", e)
