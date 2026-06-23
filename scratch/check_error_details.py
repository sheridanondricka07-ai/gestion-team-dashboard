import urllib.request
import json
import urllib.error

url = 'https://gestion-team-e-default-rtdb.firebaseio.com/warmupData.json?orderBy="timestamp"&limitToLast=2000'
try:
    with urllib.request.urlopen(url) as response:
        print("Success?")
except urllib.error.HTTPError as e:
    print("HTTP Error Code:", e.code)
    print("Response Body:", e.read().decode('utf-8'))
except Exception as e:
    print("Other error:", e)
