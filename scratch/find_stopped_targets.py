import urllib.request
import json
import ssl
from datetime import datetime

DB_URL = "https://gestion-team-e-default-rtdb.firebaseio.com"
context = ssl._create_unverified_context()

def get_firebase(path):
    req = urllib.request.Request(f"{DB_URL}/{path}.json")
    try:
        with urllib.request.urlopen(req, context=context) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"Error reading {path}: {e}")
        return None

all_data = get_firebase("warmupData") or {}
auto_notified_state = get_firebase("state/autoWarmupNotified") or {}
servers = get_firebase("state/servers") or []

six_hours_ago = datetime.now().timestamp() * 1000 - (6 * 60 * 60 * 1000)
twenty_four_hours_ago = datetime.now().timestamp() * 1000 - (24 * 60 * 60 * 1000)

absolute_latest = {}
for r in all_data.values():
    if not r.get("domain") and not r.get("ip") and not r.get("server"):
        continue
        
    actual_server = r.get("server") or 'Unknown'
    actual_domain = r.get("domain") or 'N/A'
    
    if "." in actual_server or (not actual_server.startswith('sh_') and not actual_server.startswith('s_')):
        actual_domain = actual_server
        actual_server = 'Unknown'
    
    if (actual_server == 'Unknown' or not actual_server) and r.get("ip"):
        srv = next((s for s in servers if r.get("ip") in ([s.get("ip"), s.get("mainIp")] + s.get("allIps", []))), None)
        if srv:
            actual_server = srv.get("name")

    clean_domain = r.get("ip", "unknown") if (not actual_domain or actual_domain.lower().strip() in ["[rdns]", "rdns", "n/a"]) else (actual_domain or r.get("ip", "unknown"))
    safe_domain = clean_domain.replace(".", "_").replace("#", "_").replace("$", "_").replace("[", "_").replace("]", "_").replace("/", "_")
    safe_ip = (r.get("ip") or 'unknown').replace(".", "_").replace(":", "_").replace("/", "_")
    
    safe_key = f"{safe_domain}_{actual_server}_{safe_ip}"
    
    if safe_key not in absolute_latest or r.get("timestamp", 0) > absolute_latest[safe_key].get("timestamp", 0):
        absolute_latest[safe_key] = {
            "record": r,
            "actual_server": actual_server,
            "actual_domain": actual_domain,
            "clean_domain": clean_domain,
            "safe_domain": safe_domain,
            "safe_ip": safe_ip,
            "safe_key": safe_key,
            "stopped_notif_key": f"{safe_key}_stopped"
        }

print("=== CURRENTLY STOPPED TARGETS ===")
count = 0
for skey, data in absolute_latest.items():
    r = data["record"]
    ts = r.get("timestamp", 0)
    if ts <= six_hours_ago and ts > twenty_four_hours_ago:
        ts_str = datetime.fromtimestamp(ts/1000).strftime('%Y-%m-%d %H:%M:%S')
        print(f"\nsafe_key: {skey}")
        print(f"  stopped_notif_key: {data['stopped_notif_key']}")
        print(f"  Server: {data['actual_server']}, Domain: {data['actual_domain']}, IP: {r.get('ip')}")
        print(f"  Last Drop: {ts_str} ({int((datetime.now().timestamp() * 1000 - ts) / 3600000)} hours ago)")
        print(f"  Notified state value: {auto_notified_state.get(data['stopped_notif_key'])}")
        count += 1

print(f"\nTotal stopped targets: {count}")
