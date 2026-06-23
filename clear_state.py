import urllib.request
import json

db_url = "https://gestion-dashboard-13dc5-default-rtdb.firebaseio.com"

# Fetch notified state
req = urllib.request.Request(f"{db_url}/state/autoWarmupNotified.json")
try:
    with urllib.request.urlopen(req) as response:
        notified_state = json.loads(response.read().decode())
        
    keys_to_delete = []
    for key in notified_state:
        if "104_206_145_37" in key:
            keys_to_delete.append(key)
            
    if keys_to_delete:
        for key in keys_to_delete:
            print(f"Deleting {key}")
            del_req = urllib.request.Request(f"{db_url}/state/autoWarmupNotified/{key}.json", method='DELETE')
            urllib.request.urlopen(del_req)
        print("Keys deleted! The next drop will trigger the upgrade alert.")
    else:
        print("No notified state found for 104.206.145.37")
except Exception as e:
    print(e)
