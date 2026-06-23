import urllib.request
import json
import urllib.error

url = "https://gestion-team-e-default-rtdb.firebaseio.com/state/test_conditional_write.json"

def do_put(data, if_match=None):
    req = urllib.request.Request(url, method='PUT')
    req.add_header('Content-Type', 'application/json')
    if if_match:
        req.add_header('if-match', if_match)
    try:
        with urllib.request.urlopen(req, data=json.dumps(data).encode('utf-8')) as res:
            return res.status
    except urllib.error.HTTPError as e:
        return e.code

print("First PUT with if-match: null ->", do_put("test1", "null"))
print("Second PUT with if-match: null ->", do_put("test2", "null"))

req = urllib.request.Request(url, method='DELETE')
urllib.request.urlopen(req)
