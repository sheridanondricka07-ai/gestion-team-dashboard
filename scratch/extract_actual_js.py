import json
import os

transcript_path = r'C:\Users\admin_11\.gemini\antigravity-ide\brain\0b54de57-084a-442b-8c38-2649d1560006\.system_generated\logs\transcript.jsonl'

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if 'iimPlayCode' in line and ('desktop_client.js' in line or 'pale_moon_script.js' in line):
                data = json.loads(line)
                if data.get("type") == "VIEW_FILE":
                    content = data.get("content", "")
                    if content and "httpGet" in content and "truncated" not in content:
                        print(f"Found clean content in line {idx} (VIEW_FILE)")
                        with open("scratch/extracted_bot_code_2.js", "w", encoding="utf-8") as out_f:
                            out_f.write(content)
                        print("Saved to scratch/extracted_bot_code_2.js")
                        break
else:
    print("Transcript not found.")
