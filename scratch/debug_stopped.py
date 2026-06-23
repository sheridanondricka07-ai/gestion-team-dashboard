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

# Simulate stopped check logic
six_hours_ago = datetime.now().timestamp() * 1000 - (6 * 60 * 60 * 1000)
twenty_four_hours_ago = datetime.now().timestamp() * 1000 - (24 * 60 * 60 * 1000)

absolute_latest = {}
for r in all_data.values():
    if not r.get("domain") and not r.get("ip") and not r.get("server"):
        continue
    key = f"{r.get('domain','')}_{r.get('server','')}_{r.get('ip','')}"
    if key not in absolute_latest or r.get("timestamp", 0) > absolute_latest[key].get("timestamp", 0):
        absolute_latest[key] = r

print(f"Current Time (Local): {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"6 Hours Ago (UTC/millis): {six_hours_ago} ({datetime.fromtimestamp(six_hours_ago/1000).strftime('%Y-%m-%d %H:%M:%S')})")
print(f"24 Hours Ago (UTC/millis): {twenty_four_hours_ago} ({datetime.fromtimestamp(twenty_four_hours_ago/1000).strftime('%Y-%m-%d %H:%M:%S')})")

print("\n=== EVALUATING 5.135.98.35 TARGETS ===")
for key in absolute_latest:
    latest_drop = absolute_latest[key]
    if latest_drop.get("ip") != "5.135.98.35":
        continue

    actual_server = latest_drop.get("server") or 'Unknown'
    actual_domain = latest_drop.get("domain") or 'N/A'
    
    if "." in actual_server or (not actual_server.startswith('sh_') and not actual_server.startswith('s_')):
        actual_domain = actual_server
        actual_server = 'Unknown'
    
    if (actual_server == 'Unknown' or not actual_server) and latest_drop.get("ip"):
        srv = next((s for s in servers if latest_drop.get("ip") in ([s.get("ip"), s.get("mainIp")] + s.get("allIps", []))), None)
        if srv:
            actual_server = srv.get("name")

    clean_domain = latest_drop.get("ip", "unknown") if (not actual_domain or actual_domain.lower().strip() in ["[rdns]", "rdns"]) else (actual_domain or latest_drop.get("ip", "unknown"))
    safe_domain = clean_domain.replace(".", "_").replace("#", "_").replace("$", "_").replace("[", "_").replace("]", "_")
    safe_key = f"{safe_domain}_{actual_server}"
    stopped_notif_key = f"{safe_key}_stopped"

    ts = latest_drop.get("timestamp", 0)
    ts_str = datetime.fromtimestamp(ts/1000).strftime('%Y-%m-%d %H:%M:%S')
    
    print(f"\nGroup Key: {key}")
    print(f"  Parsed values -> Server: {actual_server}, Domain: {actual_domain}, IP: {latest_drop.get('ip')}")
    print(f"  Timestamp: {ts} ({ts_str})")
    print(f"  Is > 6h ago: {ts <= six_hours_ago}")
    print(f"  Is > 24h ago: {ts <= twenty_four_hours_ago}")
    print(f"  stopped_notif_key: {stopped_notif_key}")
    print(f"  Notified state value: {auto_notified_state.get(stopped_notif_key)}")
