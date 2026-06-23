import json
import os

transcript_path = r'C:\Users\admin_11\.gemini\antigravity-ide\brain\0b54de57-084a-442b-8c38-2649d1560006\.system_generated\logs\transcript.jsonl'

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if idx < 3120 and 'bot_token' in line and 'iimPlayCode' in line:
                data = json.loads(line)
                # Let's check tool_calls in PLANNER_RESPONSE
                tool_calls = data.get("tool_calls", [])
                if tool_calls and tool_calls[0].get("name") in ["write_to_file", "replace_file_content"]:
                    args = tool_calls[0].get("args", {})
                    code = args.get("CodeContent") or args.get("ReplacementContent")
                    if code:
                        print(f"Found code in line {idx}")
                        with open("scratch/extracted_bot_code_2.js", "w", encoding="utf-8") as out_f:
                            out_f.write(code)
                        print("Saved to scratch/extracted_bot_code_2.js")
                        break
else:
    print("Transcript not found.")
