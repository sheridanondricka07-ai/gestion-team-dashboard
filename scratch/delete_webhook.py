import json
import urllib.request
import ssl

BOT_TOKEN = "8277348945:AAGd4UVlLqxKiQUF4wdVMTs_VonGoMfEgfk"

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

print("Deleting Webhook...")
print(json.dumps(query_api("deleteWebhook"), indent=2))

print("\nQuerying getUpdates (with no webhook active):")
print(json.dumps(query_api("getUpdates"), indent=2))
