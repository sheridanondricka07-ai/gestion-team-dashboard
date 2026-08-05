import requests
import json

BOT_TOKEN = "8829852967:AAG5a8dvHMWPinQ4A7Ly7RfPpcKRpSnPxUQ"
WEBHOOK_URL = "https://gestion-team-dashboard.vercel.app/api/sync-telegram-warmup"

sample_text = """User: m.zaryouh
Server Deployment Summary
3000 (IN) 3000 (OUT)
s_wmn3_2193 3000 3000
energieface.com
【IP】: 57.131.4.160"""

print("Testing direct POST to webhook endpoint...")
res = requests.post(WEBHOOK_URL, json={"text": sample_text}).json()
print("Webhook response:", json.dumps(res, indent=2))
