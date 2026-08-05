import requests
import json
from datetime import datetime

BOT_TOKEN = "8829852967:AAG5a8dvHMWPinQ4A7Ly7RfPpcKRpSnPxUQ"

url = f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates"
r = requests.get(url).json()
print("getUpdates response:", json.dumps(r, indent=2))
