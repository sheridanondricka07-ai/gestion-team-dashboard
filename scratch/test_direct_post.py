import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://gestion-team-dashboard.vercel.app/api/sync-telegram-warmup"
log_payload = {
    "text": """👤 User: a.zeggaf
---------------------------------
📋 Server Deployment Summary

1500 (IN) 1500 (OUT)
s_wmn3_2233 1500 1500
lodoguide.com

---------------------------------
【IP】: 162.210.173.216"""
}

try:
    req = urllib.request.Request(
        url,
        data=json.dumps(log_payload).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, context=ctx) as response:
        res = json.loads(response.read().decode('utf-8'))
        print("API Response:", json.dumps(res, indent=2))
except Exception as e:
    print("Error:", e)
