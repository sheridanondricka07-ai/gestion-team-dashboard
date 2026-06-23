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
            
        for key, g in grouped.items():
            if '163.172.164.206' not in key:
                continue
                
            print(f"\n--- Checking key: {key} ---")
            g['records'].sort(key=lambda x: x.get('timestamp', 0), reverse=True)
            print(f"Total records: {len(g['records'])}")
            
            success = True
            cutoff = int(time.time() * 1000) - (24 * 60 * 60 * 1000)
            
            # Print cutoff details
            print(f"Current server time (ms): {int(time.time() * 1000)}")
            print(f"Cutoff (ms): {cutoff} ({datetime.fromtimestamp(cutoff/1000.0).strftime('%Y-%m-%d %H:%M:%S')})")
            
            for i in range(min(3, len(g['records']))):
                r = g['records'][i]
                t_ms = r.get('timestamp', 0)
                dt = datetime.fromtimestamp(t_ms/1000.0).strftime('%Y-%m-%d %H:%M:%S')
                print(f"Record {i}: timestamp={t_ms} ({dt}), IN={r.get('inVal')}, OUT={r.get('outVal')}")
                
                if t_ms < cutoff:
                    print(f"FAILED timestamp check: {t_ms} < {cutoff}")
                    success = False
                    break
                
                in_val = int(r.get('inVal', 0))
                out_val = int(r.get('outVal', 0))
                if in_val <= 0 or out_val < in_val * 0.95:
                    print(f"FAILED volume check: in={in_val}, out={out_val}")
                    success = False
                    break
            
            print(f"Success result: {success}")
            
except Exception as e:
    print("Error:", e)
