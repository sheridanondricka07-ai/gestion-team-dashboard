import json
import os

transcript_path = r'C:\Users\admin_11\.gemini\antigravity-ide\brain\0b54de57-084a-442b-8c38-2649d1560006\.system_generated\logs\transcript.jsonl'

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if 'autoWarmupQueue' in line and idx < 3120:
                data = json.loads(line)
                content = data.get("content", "")
                if content:
                    lines = content.split('\n')
                    for line_no, l in enumerate(lines):
                        if 'autoWarmupQueue' in l or 'oldestKey' in l or 'firebase_db_url' in l or 'delete_url' in l:
                            # print context around the match in the content
                            start = max(0, line_no - 15)
                            end = min(len(lines), line_no + 15)
                            print(f"\n--- MATCH IN LINE {idx} (content line {line_no}) ---")
                            print("\n".join(lines[start:end]))
                            print("---------------------------------------------")
else:
    print("Transcript not found.")
