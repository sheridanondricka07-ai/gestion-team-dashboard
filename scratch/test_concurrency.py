import urllib.request
import json
import ssl
import threading
import time

DB_URL = "https://gestion-team-e-default-rtdb.firebaseio.com"
context = ssl._create_unverified_context()

def delete_key(path):
    req = urllib.request.Request(f"{DB_URL}/{path}.json", method='DELETE')
    try:
        with urllib.request.urlopen(req, context=context) as response:
            print(f"Deleted {path}: {response.status}")
    except Exception as e:
        print(f"Error deleting {path}: {e}")

# Delete the notified key to reset the state
target_key = "state/autoWarmupNotified/facilityfinder_nl_s_wmn3_2249_5_135_98_91_stopped"
delete_key(target_key)

# We wait 2 seconds to make sure it is deleted
time.sleep(2)

# Now, send 3 concurrent requests to the Vercel function
url = 'https://gestion-team-dashboard.vercel.app/api/sync-telegram-warmup'

def send_request():
    req = urllib.request.Request(url, method='GET', headers={'User-Agent': 'Telegram Bot API'})
    try:
        with urllib.request.urlopen(req, context=context) as response:
            print(f"Request status: {response.status}")
    except Exception as e:
        print(f"Request error: {e}")

threads = []
for i in range(3):
    t = threading.Thread(target=send_request)
    threads.append(t)

print("Sending 3 concurrent requests...")
for t in threads:
    t.start()

for t in threads:
    t.join()

print("All requests completed. Let's wait 3 seconds and check the value in Firebase.")
time.sleep(3)

# Read the value from Firebase
req = urllib.request.Request(f"{DB_URL}/{target_key}.json")
try:
    with urllib.request.urlopen(req, context=context) as response:
        val = json.loads(response.read().decode())
        print(f"Value in Firebase for {target_key}: {val}")
except Exception as e:
    print(f"Error reading path: {e}")
