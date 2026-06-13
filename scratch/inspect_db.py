import urllib.request
import json

url = "https://gestion-team-e-default-rtdb.firebaseio.com/state.json"
try:
    with urllib.request.urlopen(url) as response:
        state = json.loads(response.read().decode())
        rps = state.get("rps")
        print("Type of rps in Firebase:", type(rps))
        if isinstance(rps, dict):
            print("Keys:", list(rps.keys())[:10])
        elif isinstance(rps, list):
            print("Length:", len(rps))
            print("First 5 items:", rps[:5])
except Exception as e:
    print("Error:", e)
