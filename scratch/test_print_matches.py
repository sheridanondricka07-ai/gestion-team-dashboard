import json
import os

transcript_path = r'C:\Users\admin_11\.gemini\antigravity-ide\brain\0b54de57-084a-442b-8c38-2649d1560006\.system_generated\logs\transcript.jsonl'

if os.path.exists(transcript_path):
    print(f"Reading from {transcript_path}")
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if 'firebase_db_url' in line or 'autoWarmupQueue' in line:
                data = json.loads(line)
                print(f"\nLine {idx} matches! Type: {data.get('type')}")
                # Print content if present
                content = data.get("content", "")
                if content:
                    print("Content length:", len(content))
                    print(content[:500])
                # Print tool_calls if present
                tool_calls = data.get("tool_calls", [])
                if tool_calls:
                    print("Tool call name:", tool_calls[0].get("name"))
                    print("Args keys:", list(tool_calls[0].get("args", {}).keys()))
                    content_arg = tool_calls[0].get("args", {}).get("CodeContent") or tool_calls[0].get("args", {}).get("Content")
                    if content_arg:
                        print("Content arg length:", len(content_arg))
                        print(content_arg[:500])
else:
    print(f"Path not found: {transcript_path}")
