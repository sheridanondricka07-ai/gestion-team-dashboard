import requests

WEBHOOK_URL = "https://gestion-team-dashboard.vercel.app/api/sync-telegram-warmup"

sample_text = """User: m.zaryouh
Server Deployment Summary
3000 (IN) 3000 (OUT)
s_wmn3_2193 3000 3000
energieface.com
【IP】: 57.131.4.160"""

res = requests.post(WEBHOOK_URL, json={"text": sample_text})
print("Status Code:", res.status_code)
print("Response Text:", res.text[:500])
