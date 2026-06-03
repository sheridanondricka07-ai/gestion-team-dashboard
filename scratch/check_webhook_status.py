import json
import urllib.request
import ssl

BOT_TOKEN = "8277348945:AAGd4UVlLqxKiQUF4wdVMTs_VonGoMfEgfk"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def query_api(method):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/{method}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        return {"error": str(e)}

print("Webhook Info details:")
print(json.dumps(query_api("getWebhookInfo"), indent=2))
