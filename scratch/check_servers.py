import urllib.request
import json

url = "https://gestion-team-c-default-rtdb.firebaseio.com/state/servers.json"
try:
    with urllib.request.urlopen(url) as response:
        servers = json.loads(response.read().decode())
        if isinstance(servers, list):
            for idx, s in enumerate(servers):
                if not s:
                    print(f"Server at index {idx} is null/empty!")
                    continue
                name = s.get("name")
                ip = s.get("ip")
                mailerId = s.get("mailerId")
                print(f"Index {idx}: Name={name}, IP={ip} (type={type(ip)}), MailerId={mailerId}")
        elif isinstance(servers, dict):
            for k, s in servers.items():
                name = s.get("name")
                ip = s.get("ip")
                mailerId = s.get("mailerId")
                print(f"Key {k}: Name={name}, IP={ip} (type={type(ip)}), MailerId={mailerId}")
except Exception as e:
    print("Error:", e)
