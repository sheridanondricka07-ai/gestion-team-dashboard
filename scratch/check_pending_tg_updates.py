import requests
import json

BOT_TOKEN = "8829852967:AAG5a8dvHMWPinQ4A7Ly7RfPpcKRpSnPxUQ"

print("1. Deleting webhook temporarily...")
requests.get(f"https://api.telegram.org/bot{BOT_TOKEN}/deleteWebhook")

print("2. Fetching updates...")
r = requests.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates").json()
print("Total updates fetched:", len(r.get('result', [])))

if r.get('result'):
    for up in r['result'][-5:]:
        msg = up.get('message') or up.get('channel_post') or up.get('edited_message') or {}
        print("Update ID:", up.get('update_id'))
        print("Chat ID:", msg.get('chat', {}).get('id'))
        print("Chat Title/Type:", msg.get('chat', {}).get('title'), msg.get('chat', {}).get('type'))
        print("Text snippet:", (msg.get('text') or '')[:100])
        print("---")

print("3. Re-enabling webhook to Vercel endpoint...")
WEBHOOK_URL = "https://gestion-team-dashboard.vercel.app/api/sync-telegram-warmup"
r_set = requests.post(f"https://api.telegram.org/bot{BOT_TOKEN}/setWebhook", json={"url": WEBHOOK_URL}).json()
print("Webhook set response:", r_set)
