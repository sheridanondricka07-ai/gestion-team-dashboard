import urllib.request
import json

url = 'https://gestion-team-dashboard.vercel.app/api/sync-telegram-warmup'
payload = {
    'text': "User: h.ghazzali\nServer Deployment Summary\n200 (IN) 200 (OUT)\ns_wmn3_2236 200 200\n104.206.145.37\n【IP】: 104.206.145.37"
}
data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json', 'User-Agent': 'Telegram Bot API'})

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except Exception as e:
    print(e)
