import requests

BOT_TOKEN = "8829852967:AAG5a8dvHMWPinQ4A7Ly7RfPpcKRpSnPxUQ"
WEBHOOK_URL = "https://gestion-team-dashboard.vercel.app/api/sync-telegram-warmup"

# 1. Set webhook to point to Vercel api endpoint
url = f"https://api.telegram.org/bot{BOT_TOKEN}/setWebhook"
r = requests.post(url, json={"url": WEBHOOK_URL})
print("Set Webhook Response:", r.json())

# 2. Get Webhook Info to verify
info_url = f"https://api.telegram.org/bot{BOT_TOKEN}/getWebhookInfo"
r_info = requests.get(info_url)
print("Webhook Info:", r_info.json())
