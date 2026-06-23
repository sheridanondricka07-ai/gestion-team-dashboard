import urllib.request

url = "https://gestion-team-e-default-rtdb.firebaseio.com/state/test_etag_empty.json"

req = urllib.request.Request(url, method='GET')
req.add_header('X-Firebase-ETag', 'true')
try:
    with urllib.request.urlopen(req) as res:
        print("Status:", res.status)
        print("ETag header:", res.headers.get('ETag'))
        print("Body:", res.read())
except Exception as e:
    print(e)
