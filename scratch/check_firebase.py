import urllib.request
import json

DB_URL = "https://gestion-team-e-default-rtdb.firebaseio.com"

def get_data(path):
    try:
        url = f"{DB_URL}/{path}.json"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching {path}: {e}")
        return None

servers = get_data("state/servers")
print(f"Total Servers: {len(servers) if servers else 0}")
if servers:
    for idx, srv in enumerate(servers):
        print(f"Server {idx}: name={srv.get('name')}, has vmtaMap={'vmtaMap' in srv}")
        if 'vmtaMap' in srv:
            print("  vmtaMap content:", srv['vmtaMap'])
