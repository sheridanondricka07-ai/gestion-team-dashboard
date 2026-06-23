import urllib.request
import json

UPGRADE_BOT_TOKEN = "8975320309:AAFQmIeTKMbxQMv4c8_UHSczUYYZ9mcJ8FA"
notifChatId = "-5317343683"

text = "🚀 <b>Warmup Upgrade</b>\n\n🖥 Server: <b>s_wmn3_2236</b>\n👤 User: <b>h.ghazzali</b>\n📌 IP: <code>104.206.145.37</code>\n🌐 Domain: <b>104.206.145.37</b>\n📈 Send Size: <code>101</code> ➡️ <b>200</b>\n\n💬 Reason: Last 3 drops succeeded (OUT >= 95% of IN)."

url = f"https://api.telegram.org/bot{UPGRADE_BOT_TOKEN}/sendMessage"

payload = {
    'chat_id': notifChatId,
    'text': text,
    'parse_mode': 'HTML'
}

req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except Exception as e:
    print(e)
