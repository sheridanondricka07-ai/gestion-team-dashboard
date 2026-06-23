import urllib.request
import json

notifToken = "8975320309:AAFQmIeTKMbxQMv4c8_UHSczUYYZ9mcJ8FA"
notifChatId = "-5317343683"

text = (
    "🚀 <b>Warmup Upgrade</b>\n\n"
    "🖥 Server: <b>s_wmn3_2182</b>\n"
    "📌 IP: <code>1.2.3.4</code>\n"
    "🌐 Domain: <b>xohgotesninagigz.net</b>\n"
    "📈 Send Size: <code>1000</code> ➡️ <b>2000</b>\n\n"
    "💬 Reason: Last 3 drops succeeded (OUT >= 95% of IN)."
)

url = f"https://api.telegram.org/bot{notifToken}/sendMessage"
req = urllib.request.Request(
    url,
    data=json.dumps({
        "chat_id": notifChatId,
        "text": text,
        "parse_mode": "HTML"
    }).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

import ssl
context = ssl._create_unverified_context()
try:
    with urllib.request.urlopen(req, context=context) as response:
        print(response.read().decode())
except Exception as e:
    print(e)
