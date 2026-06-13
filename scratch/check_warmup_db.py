import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://gestion-team-e-default-rtdb.firebaseio.com/state/warmupData.json"
try:
    with urllib.request.urlopen(url, context=ctx) as response:
        data = json.loads(response.read().decode())
        print("warmupData in Firebase:", data)
        if data:
            print("Total records:", len(data))
            print("Records keys:", list(data.keys()))
        else:
            print("warmupData is empty or null.")
except Exception as e:
    print("Error:", e)
