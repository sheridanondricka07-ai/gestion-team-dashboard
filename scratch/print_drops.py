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
        print(f"Error: {e}")
        return None

drops = get_data("state/drops")
print("Number of drops:", len(drops) if drops else 0)
if drops:
    # Print the last 5 drops to see their schema
    for idx, d in enumerate(drops[-5:]):
        print(f"Drop {idx}:", d)
