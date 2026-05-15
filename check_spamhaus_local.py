import socket
import json
import urllib.request
import urllib.parse
import time
import os
import ssl
from datetime import datetime, timedelta

# CONFIGURATION
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(BASE_DIR, "spamhaus_scan.log")
DB_URL = "https://gestion-team-c-default-rtdb.firebaseio.com/state"
SERVERS_URL = f"{DB_URL}/servers.json"
PROGRESS_URL = f"{DB_URL}/spamhausProgress.json"
HISTORY_URL = f"{DB_URL}/spamhausHistory.json"

# TELEGRAM CONFIGURATION
TG_TOKEN = "8854626437:AAETvyVLsi_NWbiUkeZxqs-r74VoTVGb4KE"
TG_CHAT_ID = "-5109098387"

def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line)
    try:
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
    except:
        pass

def send_telegram(message):
    log("Sending Telegram notification...")
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        url = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"
        data = urllib.parse.urlencode({
            "chat_id": TG_CHAT_ID,
            "text": message,
            "parse_mode": "HTML"
        }).encode("utf-8")
        req = urllib.request.Request(url, data=data)
        with urllib.request.urlopen(req, context=ctx) as resp:
            return resp.read()
    except Exception as e:
        log(f"Telegram failed: {e}")

def get_db_data(path):
    try:
        url = f"{DB_URL}/{path}.json"
        with urllib.request.urlopen(url) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        return None

def update_db(path, data):
    url = f"{DB_URL}/{path}.json" if path else f"{DB_URL}.json"
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), method='PATCH')
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.read()
    except Exception as e:
        log(f"Update failed for {path}: {e}")

def set_db(path, data):
    url = f"{DB_URL}/{path}.json"
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), method='PUT')
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.read()
    except Exception as e:
        log(f"Set failed for {path}: {e}")

def check_spamhaus(ip):
    try:
        parts = ip.split('.')
        query = f"{parts[3]}.{parts[2]}.{parts[1]}.{parts[0]}.zen.spamhaus.org"
        addr = socket.gethostbyname(query)
        if addr == "127.0.0.2": return "SBL", addr
        if addr == "127.0.0.3": return "CSS", addr
        return None, addr
    except:
        return None, None

def run_scan():
    log("=== STARTING SPAMHAUS SCAN WITH COMPARISON ===")
    servers = get_db_data("servers")
    if not servers:
        log("No servers found. Aborting.")
        return

    all_ips = []
    for s in servers:
        if s and 'allIps' in s:
            all_ips.extend(s['allIps'])
    
    unique_ips = list(set(all_ips))
    total = len(unique_ips)
    log(f"Unique IPs to check: {total}")

    results = {}
    listed_count = 0
    now_iso = datetime.now().isoformat() + "Z"
    
    update_db("spamhausProgress", {"status": "scanning", "total": total, "current": 0})

    for i, ip in enumerate(unique_ips):
        ip_key = ip.replace('.', '_')
        list_name, code = check_spamhaus(ip)
        if list_name:
            results[ip_key] = {
                "status": "listed",
                "list": list_name,
                "listedDate": datetime.now().strftime("%Y-%m-%d"),
                "timestamp": now_iso
            }
            listed_count += 1
        else:
            results[ip_key] = {"status": "clean", "timestamp": now_iso}
        
        if i % 20 == 0:
            update_db("spamhausProgress", {"current": i + 1})

    # COMPARISON LOGIC
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    yesterday_data = get_db_data(f"spamhausHistory/{yesterday}")
    
    newly_listed = []
    newly_cleaned = []
    
    if yesterday_data and 'results' in yesterday_data:
        y_results = yesterday_data['results']
        for ip_key, current_res in results.items():
            ip = ip_key.replace('_', '.')
            prev_res = y_results.get(ip_key)
            
            # New Listing: Clean yesterday, listed today
            if current_res['status'] == 'listed' and (not prev_res or prev_res['status'] != 'listed'):
                newly_listed.append(f"🔴 {ip} ({current_res.get('list', 'LISTED')})")
            
            # New Cleaning: Listed yesterday, clean today
            if current_res['status'] == 'clean' and prev_res and prev_res['status'] == 'listed':
                newly_cleaned.append(f"🟢 {ip}")

    # Save Results
    set_db("spamhaus", results)
    history_key = datetime.now().strftime("%Y-%m-%d")
    final_data = {
        "summary": {
            "total": total,
            "listed": listed_count,
            "clean": total - listed_count,
            "timestamp": int(time.time() * 1000)
        },
        "results": results,
        "timestamp": int(time.time() * 1000)
    }
    set_db(f"spamhausHistory/{history_key}", final_data)
    
    update_db("", {
        "spamhausLastUpdate": datetime.now().strftime("%m/%d/%Y, %I:%M:%S %p"),
        "spamhausProgress": {
            "status": "idle", 
            "total": total, 
            "current": total,
            "listed": listed_count,
            "clean": total - listed_count
        }
    })

    # TELEGRAM REPORT
    tg_msg = f"🛡️ <b>Spamhaus Daily Report</b>\n"
    tg_msg += f"📅 <i>{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</i>\n\n"
    tg_msg += f"📊 <b>Global Stats:</b>\n"
    tg_msg += f"• Total Checked: {total}\n"
    tg_msg += f"• 🔴 Listed IPs: <b>{listed_count}</b>\n"
    tg_msg += f"• 🟢 Clean IPs: <b>{total - listed_count}</b>\n\n"
    
    # Comparison Summary
    if newly_listed or newly_cleaned:
        tg_msg += f"🔄 <b>Daily Changes:</b>\n"
        if newly_listed:
            tg_msg += f"🔥 <b>Newly Listed ({len(newly_listed)}):</b>\n"
            tg_msg += "\n".join(newly_listed[:10]) + "\n"
        if newly_cleaned:
            tg_msg += f"✨ <b>Newly Cleaned ({len(newly_cleaned)}):</b>\n"
            tg_msg += "\n".join(newly_cleaned[:10]) + "\n"
        tg_msg += "\n"
    
    if listed_count > 0:
        tg_msg += f"⚠️ <b>Status Alert:</b> {listed_count} listings currently active."
    else:
        tg_msg += f"✅ <b>Status Clear:</b> All IPs are clean."
    
    tg_msg += f"\n\n🔗 <a href='https://gestion-team-dashboard.vercel.app/'>Open Dashboard</a>"
    send_telegram(tg_msg)

    log(f"=== SCAN COMPLETE: {listed_count} LISTED, {len(newly_listed)} NEW, {len(newly_cleaned)} CLEANED ===")

if __name__ == "__main__":
    run_scan()
