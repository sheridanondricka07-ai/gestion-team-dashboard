import json
import urllib.request
import ssl

BOT_TOKEN = "8827415405:AAH-sAnTE7rz_i4XSTFG6tjBX0g0BYPyn6E"
WEBHOOK_URL = "https://gestion-team-dashboard.vercel.app/api/sync-telegram-warmup"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def query_api(method, params=None):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/{method}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        return {"error": str(e)}

print("Setting Webhook to:", WEBHOOK_URL)
res = query_api("setWebhook", {"url": WEBHOOK_URL})
print(json.dumps(res, indent=2))

print("\nChecking Webhook Info:")
print(json.dumps(query_api("getWebhookInfo"), indent=2))
