import urllib.request
import json

url = "https://gestion-team-c-default-rtdb.firebaseio.com/state/mailers.json"
try:
    with urllib.request.urlopen(url) as response:
        mailers = json.loads(response.read().decode())
        print("Successfully read mailers!")
        print("Type of mailers:", type(mailers))
        if isinstance(mailers, list):
            print(f"Number of mailers (list): {len(mailers)}")
            for i, m in enumerate(mailers):
                if m:
                    print(f"  [{i}]: Name={m.get('name')}, Email={m.get('email')}, Role={m.get('role')}, ID={m.get('id')}, MailerID={m.get('mailer_id')}")
                else:
                    print(f"  [{i}]: null")
        elif isinstance(mailers, dict):
            print(f"Number of mailers (dict): {len(mailers)}")
            for k, m in mailers.items():
                print(f"  [{k}]: Name={m.get('name')}, Email={m.get('email')}, Role={m.get('role')}, ID={m.get('id')}, MailerID={m.get('mailer_id')}")
except Exception as e:
    print("Error fetching mailers:", e)
