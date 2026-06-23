import urllib.request
import json

db_url = "https://gestion-team-e-default-rtdb.firebaseio.com"

try:
    url = f"{db_url}/.settings/rules.json"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        rules = json.loads(resp.read().decode('utf-8'))
        print("Successfully retrieved Firebase rules:")
        print(json.dumps(rules, indent=2))
except Exception as e:
    print(f"Could not retrieve rules directly: {e}")
    print("This is normal if the rules path is protected. We will check query headers or examine where queries are made instead.")
