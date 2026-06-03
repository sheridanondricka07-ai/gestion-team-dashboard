import json
import urllib.request
import ssl
import time

BOT_TOKEN = "8277348945:AAGd4UVlLqxKiQUF4wdVMTs_VonGoMfEgfk"

# Ignore SSL checks
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def get_updates(offset=None):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates"
    if offset:
        url += f"?offset={offset}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        return {"ok": False, "error": str(e)}

print("Starting real-time Telegram Bot updates polling...")
print("Please send a message to the bot or the group it is in, and we will see if it appears here.")
print("Press Ctrl+C to stop.\n")

last_offset = 0

while True:
    res = get_updates(offset=last_offset)
    if res.get("ok"):
        updates = res.get("result", [])
        for update in updates:
            update_id = update["update_id"]
            last_offset = update_id + 1
            
            msg = update.get("message") or update.get("edited_message") or update.get("channel_post")
            if msg:
                chat = msg.get("chat", {})
                chat_title = chat.get("title", "Private Chat")
                chat_id = chat.get("id")
                from_user = msg.get("from", {}).get("username", "Unknown")
                text = msg.get("text", "")
                
                print(f"\n--- NEW UPDATE RECEIVED (Update ID: {update_id}) ---")
                print(f"Chat: {chat_title} (ID: {chat_id})")
                print(f"Sender: @{from_user}")
                print(f"Text Content:\n{text}")
                print("-" * 40)
    else:
        print("API Error:", res.get("error"))
        
    time.sleep(2)
