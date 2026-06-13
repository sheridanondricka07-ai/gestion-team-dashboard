import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://gestion-team-e-default-rtdb.firebaseio.com/state/warmupRawLogs.json"
try:
    with urllib.request.urlopen(url, context=ctx) as response:
        data = json.loads(response.read().decode())
        if data:
            print("Total logs:", len(data))
            for k, v in list(data.items())[-5:]:
                print(f"\nLog {k}:")
                print(f"  Time: {v.get('timestamp')}")
                print(f"  Chat: {v.get('chat_title')} ({v.get('chat_id')})")
                print(f"  From: {v.get('from')}")
                print(f"  Text: {v.get('text')}")
        else:
            print("No raw logs found under warmupRawLogs.")
except Exception as e:
    print("Error:", e)
