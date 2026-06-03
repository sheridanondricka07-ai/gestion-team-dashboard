import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://gestion-team-c-default-rtdb.firebaseio.com/state/warmupRawLogs.json"
try:
    with urllib.request.urlopen(url, context=ctx) as response:
        data = json.loads(response.read().decode())
        if data:
            for k, v in data.items():
                print(f"\n--- LOG {k} ---")
                raw_str = v.get("raw", "{}")
                try:
                    raw_obj = json.loads(raw_str)
                    print(json.dumps(raw_obj, indent=2))
                except:
                    print("Raw string is invalid JSON:", raw_str)
        else:
            print("No raw logs found.")
except Exception as e:
    print("Error:", e)
