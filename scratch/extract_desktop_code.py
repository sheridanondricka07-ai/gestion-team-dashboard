import json
import os

transcript_path = r'C:\Users\admin_11\.gemini\antigravity-ide\brain\0b54de57-084a-442b-8c38-2649d1560006\.system_generated\logs\transcript.jsonl'

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if idx in [709, 737, 751, 821]:
                data = json.loads(line)
                print(f"=== FOUND INDEX {idx} ===")
                content = data.get("content", "")
                if content:
                    print("Content length:", len(content))
                    # Print lines containing oldestKey or sendAt or firebase
                    lines = content.split('\n')
                    for line_no, l in enumerate(lines):
                        if 'oldestKey' in l or 'sendAt' in l or 'firebase' in l or 'delete_url' in l:
                            start = max(0, line_no - 3)
                            end = min(len(lines), line_no + 4)
                            print(f"--- Line {line_no} matches ---")
                            print("\n".join(lines[start:end]))
else:
    print("Transcript not found.")
