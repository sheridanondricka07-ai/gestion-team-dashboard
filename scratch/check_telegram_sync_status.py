import requests
import json
from datetime import datetime

BOT_TOKEN = "8829852967:AAG5a8dvHMWPinQ4A7Ly7RfPpcKRpSnPxUQ"
DB_URL = "https://gestion-team-c-01-default-rtdb.firebaseio.com"

print("=== 1. Telegram Webhook Info ===")
info_url = f"https://api.telegram.org/bot{BOT_TOKEN}/getWebhookInfo"
r_info = requests.get(info_url).json()
print(json.dumps(r_info, indent=2))

print("\n=== 2. Checking Firebase warmupData Latest Timestamp ===")
r_db = requests.get(f"{DB_URL}/warmupData.json?orderBy=\"$key\"&limitToLast=10").json()
if r_db and isinstance(r_db, dict):
    records = list(r_db.values())
    records.sort(key=lambda x: x.get('timestamp', 0))
    print(f"Total recent records fetched: {len(records)}")
    for rec in records[-5:]:
        ts = rec.get('timestamp', 0)
        dt = datetime.fromtimestamp(ts / 1000.0) if ts > 1e11 else datetime.fromtimestamp(ts)
        print(f"ID: {rec.get('messageId')} | Server: {rec.get('server')} | Domain: {rec.get('domain')} | Date: {dt}")
else:
    print("Could not fetch warmupData:", r_db)
