import json
import os

other_transcript = r'C:\Users\admin_11\.gemini\antigravity-ide\brain\8d0b3438-e1c2-42d1-b300-25d641354cac\.system_generated\logs\transcript.jsonl'

if os.path.exists(other_transcript):
    print("Reading other transcript...")
    with open(other_transcript, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if 'iimPlayCode' in line and 'httpGet' in line:
                # This matches Javascript bot code!
                data = json.loads(line)
                content = data.get("content", "")
                if content and "truncated" not in content and len(content) > 2000:
                    print(f"Found clean code in line {idx} of other transcript (length: {len(content)})")
                    with open("scratch/clean_bot_code.js", "w", encoding="utf-8") as out_f:
                        out_f.write(content)
                    print("Saved to scratch/clean_bot_code.js")
                    break
                else:
                    # check tool calls
                    tool_calls = data.get("tool_calls", [])
                    if tool_calls and tool_calls[0].get("name") in ["write_to_file", "replace_file_content"]:
                        args = tool_calls[0].get("args", {})
                        code = args.get("CodeContent") or args.get("ReplacementContent")
                        if code and "httpGet" in code and "truncated" not in code:
                            print(f"Found clean code in tool args in line {idx}")
                            with open("scratch/clean_bot_code.js", "w", encoding="utf-8") as out_f:
                                out_f.write(code)
                            print("Saved to scratch/clean_bot_code.js")
                            break
else:
    print("Other transcript not found.")
