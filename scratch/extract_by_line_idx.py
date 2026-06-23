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
            if idx in [2680, 2871]:
                data = json.loads(line)
                print(f"=== LINE INDEX {idx} ===")
                print("Keys:", list(data.keys()))
                print("type:", data.get("type"))
                print("step_index:", data.get("step_index"))
                
                # If there's content, let's print a part of it
                content = data.get("content", "")
                if content:
                    print("Content length:", len(content))
                    print(content[:800])
                    print("...")
                
                # If there are tool calls
                tool_calls = data.get("tool_calls", [])
                if tool_calls:
                    print("Tool call name:", tool_calls[0].get("name"))
                    print("Tool call args:", json.dumps(tool_calls[0].get("args"), indent=2))
else:
    print("No transcript.jsonl found.")
