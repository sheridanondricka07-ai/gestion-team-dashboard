import urllib.request
import os

url = "https://raw.githubusercontent.com/zer0h/top-1000000-domains/master/top-10000-domains"
dest = os.path.join(os.path.dirname(__file__), "..", "domains.txt")

try:
    print(f"Downloading top domains from {url}...")
    urllib.request.urlretrieve(url, dest)
    print(f"Successfully downloaded to {dest}")
except Exception as e:
    print(f"Error downloading list: {e}")
