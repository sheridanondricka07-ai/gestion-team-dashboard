import json
import os

other_transcript = r'C:\Users\admin_11\.gemini\antigravity-ide\brain\8d0b3438-e1c2-42d1-b300-25d641354cac\.system_generated\logs\transcript.jsonl'

longest_code = ""
longest_idx = -1

if os.path.exists(other_transcript):
    with open(other_transcript, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if 'iimPlayCode' in line and 'httpGet' in line:
                data = json.loads(line)
                # Check content
                content = data.get("content", "")
                if content and "truncated" not in content and len(content) > len(longest_code):
                    longest_code = content
                    longest_idx = idx
                # Check tool calls
                tool_calls = data.get("tool_calls", [])
                if tool_calls and tool_calls[0].get("name") in ["write_to_file", "replace_file_content"]:
                    args = tool_calls[0].get("args", {})
                    code = args.get("CodeContent") or args.get("ReplacementContent")
                    if code and "truncated" not in code and len(code) > len(longest_code):
                        longest_code = code
                        longest_idx = idx
                        
    if longest_code:
        print(f"Found longest code in line {longest_idx} of other transcript (length: {len(longest_code)})")
        with open("scratch/clean_bot_code.js", "w", encoding="utf-8") as out_f:
            out_f.write(longest_code)
        print("Saved to scratch/clean_bot_code.js")
    else:
        print("No code found.")
else:
    print("Other transcript not found.")
