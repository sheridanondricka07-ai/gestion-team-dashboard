import urllib.request
import json

urls = {
    'queue': 'https://gestion-team-e-default-rtdb.firebaseio.com/state/autoWarmupQueue.json',
    'notified': 'https://gestion-team-e-default-rtdb.firebaseio.com/state/autoWarmupNotified.json'
}

for name, url in urls.items():
    try:
        with urllib.request.urlopen(url) as response:
            html = response.read()
            data = json.loads(html)
            print(f"=== {name} ===")
            print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Error {name}:", e)
