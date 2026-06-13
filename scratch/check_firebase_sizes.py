import urllib.request
import json

db_url = "https://gestion-team-e-default-rtdb.firebaseio.com"

def get_size(path):
    try:
        url = f"{db_url}/{path}.json"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            size_kb = len(data) / 1024
            return size_kb, json.loads(data.decode('utf-8'))
    except Exception as e:
        print(f"Error reading {path}: {e}")
        return 0, None

# Let's inspect root keys
try:
    shallow_url = f"{db_url}/.json?shallow=true"
    req = urllib.request.Request(shallow_url)
    with urllib.request.urlopen(req) as resp:
        keys = json.loads(resp.read().decode('utf-8')).keys()
        print("Root Keys & their approximate sizes:")
        for key in keys:
            size_kb, data = get_size(key)
            if data is not None:
                item_count = len(data) if isinstance(data, (dict, list)) else 1
                print(f" - /{key}: {size_kb:.2f} KB ({item_count} items)")
                # If key is state, let's inspect subkeys
                if key == 'state' and isinstance(data, dict):
                    print("   Subkeys of /state:")
                    for subkey, val in data.items():
                        sub_size = len(json.dumps(val)) / 1024
                        sub_items = len(val) if isinstance(val, (dict, list)) else 1
                        print(f"     - /state/{subkey}: {sub_size:.2f} KB ({sub_items} items)")
except Exception as e:
    print(f"Failed to check database: {e}")
