import json
import urllib.request
import urllib.parse
import ssl

ORIGINAL_BOT_TOKEN = "8277348945:AAGd4UVlLqxKiQUF4wdVMTs_VonGoMfEgfk"
CHAT_ID = "-1003727758817"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def send_message(text):
    url = f"https://api.telegram.org/bot{ORIGINAL_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": CHAT_ID,
        "text": text
    }
    data = urllib.parse.urlencode(payload).encode('utf-8')
    try:
        req = urllib.request.Request(url, data=data, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        return {"error": str(e)}

mock_message = """👤 User: test.agent
---------------------------------
📋 Server Deployment Summary

1500 (IN) 1500 (OUT)
s_wmn3_2233 1500 1500
testdomain.com

---------------------------------
【IP】: 162.210.173.216"""

print("Sending message from original bot to group...")
res = send_message(mock_message)
print(json.dumps(res, indent=2))
