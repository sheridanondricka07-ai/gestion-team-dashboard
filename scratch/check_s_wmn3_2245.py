import urllib.request
import json
import time
from datetime import datetime

url = 'https://gestion-team-e-default-rtdb.firebaseio.com/warmupData.json'
try:
    with urllib.request.urlopen(url) as response:
        html = response.read()
        allData = json.loads(html)
        
        # Group records
        grouped = {}
        for r in allData.values():
            if not r.get('domain') and not r.get('ip') and not r.get('server'):
                continue
            key = f"{r.get('domain', '')}_{r.get('server', '')}_{r.get('ip', '')}"
            if key not in grouped:
                grouped[key] = {
                    'domain': r.get('domain'),
                    'ip': r.get('ip'),
                    'server': r.get('server'),
                    'records': []
                }
            grouped[key]['records'].append(r)
            
        print("=== Evaluating s_wmn3_2245 keys ===")
        cutoff = int(time.time() * 1000) - (24 * 60 * 60 * 1000)
        
        found_any = False
        for key, g in grouped.items():
            if g['server'] != 's_wmn3_2245':
                continue
            
            # Sort records descending by timestamp
            g['records'].sort(key=lambda x: x.get('timestamp', 0), reverse=True)
            
            # Check if has any record in the last 24 hours
            recent_records = [r for r in g['records'] if r.get('timestamp', 0) >= cutoff]
            if len(recent_records) == 0:
                continue
                
            found_any = True
            print(f"\nKey: {key}")
            print(f"Total historical records: {len(g['records'])}")
            print(f"Records in last 24h: {len(recent_records)}")
            
            # Print the top 5 records
            for i, r in enumerate(g['records'][:5]):
                dt = datetime.fromtimestamp(r.get('timestamp', 0)/1000.0).strftime('%Y-%m-%d %H:%M:%S')
                print(f"  [{i}] Date: {dt}, IN: {r.get('inVal')}, OUT: {r.get('outVal')}, Success: {int(r.get('inVal', 0)) > 0 and int(r.get('outVal', 0)) >= int(r.get('inVal', 0)) * 0.95}")
                
            # Check the 3 last drops
            success = True
            if len(g['records']) < 3:
                print("  -> FAILED: Less than 3 historical records.")
                continue
                
            for i in range(3):
                r = g['records'][i]
                if r.get('timestamp', 0) < cutoff:
                    print(f"  -> FAILED: Record {i} is older than 24h (date: {datetime.fromtimestamp(r.get('timestamp',0)/1000.0).strftime('%Y-%m-%d %H:%M:%S')})")
                    success = False
                    break
                in_val = int(r.get('inVal', 0))
                out_val = int(r.get('outVal', 0))
                if in_val <= 0 or out_val < in_val * 0.95:
                    print(f"  -> FAILED: Record {i} did not meet volume criteria (IN={in_val}, OUT={out_val})")
                    success = False
                    break
            
            if success:
                print("  -> SUCCESS: Warmup criteria met!")
                
        if not found_any:
            print("No records found for s_wmn3_2245 in the last 24 hours.")
            
except Exception as e:
    print("Error:", e)
