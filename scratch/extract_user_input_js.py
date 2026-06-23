import json
import os

transcript_path = r'C:\Users\admin_11\.gemini\antigravity-ide\brain\0b54de57-084a-442b-8c38-2649d1560006\.system_generated\logs\transcript.jsonl'

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if idx == 1934:
                data = json.loads(line)
                content = data.get("content", "")
                if content:
                    with open("scratch/extracted_user_input.txt", "w", encoding="utf-8") as out_f:
                        out_f.write(content)
                    print("Successfully extracted code from line 1934!")
                else:
                    print("No content in line 1934.")
else:
    print("Transcript not found.")
