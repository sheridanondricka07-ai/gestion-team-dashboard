import requests
import json

DB_URL = "https://gestion-team-c-01-default-rtdb.firebaseio.com"

r = requests.get(f"{DB_URL}/warmupData.json?shallow=true").json()
if isinstance(r, dict):
    keys = list(r.keys())
    print(f"Total keys in warmupData: {len(keys)}")
    print("Sample keys:", keys[:10])
    print("Tail keys:", keys[-10:])

# Let's inspect the last 5 full objects by key
r_last = requests.get(f"{DB_URL}/warmupData.json?orderBy=\"$key\"&limitToLast=5").json()
print("\nLast 5 items by key:")
print(json.dumps(r_last, indent=2))
