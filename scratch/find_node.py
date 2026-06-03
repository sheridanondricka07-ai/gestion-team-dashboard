import os

paths_to_search = [
    r"C:\Program Files",
    r"C:\Program Files (x86)",
    r"C:\Users\admin_11\AppData"
]

found = []
for p in paths_to_search:
    if os.path.exists(p):
        print(f"Searching {p}...")
        for root, dirs, files in os.walk(p):
            if 'node.exe' in files:
                full_path = os.path.join(root, 'node.exe')
                print(f"Found node.exe: {full_path}")
                found.append(full_path)
            # Prevent going too deep in heavy folders
            if len(root.split(os.sep)) - len(p.split(os.sep)) > 4:
                dirs.clear() # don't recurse deeper

print("Search complete. Found paths:", found)
