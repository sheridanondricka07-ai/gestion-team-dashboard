import urllib.request
import json

url = "https://gestion-team-dashboard.vercel.app/api/sync-telegram-warmup"
try:
    print(f"Triggering URL: {url}")
    with urllib.request.urlopen(url) as response:
        status = response.getcode()
        body = response.read().decode('utf-8')
        print(f"Status: {status}")
        print("Response body:")
        print(body)
except Exception as e:
    print("Error:", e)
