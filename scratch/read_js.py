with open("scratch/desktop_client.js", "rb") as f:
    content = f.read()

# Try to decode as UTF-16LE, UTF-16, or UTF-8
for encoding in ["utf-16le", "utf-16", "utf-8", "latin-1"]:
    try:
        decoded = content.decode(encoding)
        print(f"--- SUCCESS WITH {encoding} ---")
        print(decoded)
        break
    except Exception as e:
        print(f"Failed with {encoding}: {e}")
