import requests

WEBHOOK_URL = "https://gestion-team-dashboard.vercel.app/api/sync-telegram-warmup"

sample_text = """User: m.zaryouh
Server Deployment Summary
3000 (IN) 3000 (OUT)
s_wmn3_2193 3000 3000
energieface.com
【IP】: 57.131.4.160"""

headers = {
    "User-Agent": "TelegramBot (like TwitterBot)",
    "Content-Type": "application/json"
}

res = requests.post(WEBHOOK_URL, json={"text": sample_text}, headers=headers)
print("Status Code:", res.status_code)
if res.status_code == 200:
    print("Success response:", res.json())
else:
    print("Blocked response length:", len(res.text))
