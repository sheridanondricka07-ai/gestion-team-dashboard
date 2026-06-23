import json
import os

brain_dir = r'C:\Users\admin_11\.gemini\antigravity-ide\brain'
transcript_path = None
for root, dirs, files in os.walk(brain_dir):
    for f in files:
        if f == 'transcript.jsonl':
            transcript_path = os.path.join(root, f)
            break

if transcript_path:
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if "pale_moon_script.js" in line:
                data = json.loads(line)
                print(f"Line {idx} (step_index: {data.get('step_index')}, type: {data.get('type')})")
                content = data.get("content", "")
                if content:
                    print(f"Found content. Length: {len(content)}")
                    # print first 10 lines
                    print("\n".join(content.split('\n')[:15]))
                    print("...")
                else:
                    tool_calls = data.get("tool_calls", [])
                    if tool_calls:
                        print("Tool call name:", tool_calls[0].get("name"))
                        print("Arguments:", json.dumps(tool_calls[0].get("args"), indent=2))
