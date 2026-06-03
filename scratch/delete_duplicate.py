import urllib.request
import json

url_get = "https://gestion-team-c-default-rtdb.firebaseio.com/state/rps.json"
try:
    # 1. Fetch rps
    with urllib.request.urlopen(url_get) as response:
        rps = json.loads(response.read().decode())
        
    print(f"Loaded {len(rps)} RPs from database.")
    
    # 2. Deduplicate rps
    seen = {}
    deduped = []
    removed_count = 0
    for rp in rps:
        if not rp:
            continue
        domain = rp.get("domain", "").strip().lower()
        if domain in seen:
            print(f"Removing duplicate RP: {rp}")
            removed_count += 1
            # If the duplicate is active and the existing one isn't, keep the active one
            if rp.get("serverId") and not seen[domain].get("serverId"):
                seen[domain] = rp
        else:
            seen[domain] = rp
            
    deduped = list(seen.values())
    print(f"New RPs count: {len(deduped)} (removed {removed_count} duplicates)")
    
    # 3. Write back using PUT request
    url_put = "https://gestion-team-c-default-rtdb.firebaseio.com/state/rps.json"
    req = urllib.request.Request(
        url_put, 
        data=json.dumps(deduped).encode('utf-8'), 
        headers={'Content-Type': 'application/json'},
        method='PUT'
    )
    with urllib.request.urlopen(req) as response:
        print("Successfully wrote deduplicated RPs to Firebase!")
        print("Response:", response.read().decode())
        
except Exception as e:
    print("Error:", e)
