import sys

def convert(in_path, out_path):
    try:
        with open(in_path, 'r', encoding='utf-16le') as f:
            content = f.read()
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Successfully converted {in_path} to {out_path}")
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    if len(sys.argv) >= 3:
        convert(sys.argv[1], sys.argv[2])
    else:
        # Default convert old_sync.js
        convert(r'c:\Users\admin_11\Documents\Gestion_Team\old_sync.js', r'c:\Users\admin_11\Documents\Gestion_Team\scratch\old_sync_utf8.js')
