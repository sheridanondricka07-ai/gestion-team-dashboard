import json
import os

transcript_path = r'C:\Users\admin_11\.gemini\antigravity-ide\brain\0b54de57-084a-442b-8c38-2649d1560006\.system_generated\logs\transcript.jsonl'

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if 'update' in line or 'server' in line or 'txt_filename' in line:
                data = json.loads(line)
                content = data.get("content", "")
                if "update" in content and ("s_wmn" in content or "sh_wmn" in content) and "iMacros" in content:
                    print(f"Line {idx} matches:")
                    print(content[:600])
                    print("---")
