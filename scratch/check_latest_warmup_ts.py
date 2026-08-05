import requests
import json
from datetime import datetime

DB_URL = "https://gestion-team-c-01-default-rtdb.firebaseio.com"

r = requests.get(f"{DB_URL}/warmupData.json?orderBy=\"timestamp\"&limitToLast=20").json()
if isinstance(r, dict):
    recs = [v for v in r.values() if isinstance(v, dict)]
    recs.sort(key=lambda x: int(x.get('timestamp', 0) or 0))
    print(f"Fetched {len(recs)} valid records ordered by timestamp:")
    for rec in recs:
        ts = int(rec.get('timestamp', 0) or 0)
        dt = datetime.fromtimestamp(ts / 1000.0) if ts > 1e11 else datetime.fromtimestamp(ts)
        print(f"Timestamp: {ts} -> Date: {dt} | Server: {rec.get('server')} | Domain: {rec.get('domain')} | MsgId: {rec.get('messageId')}")
