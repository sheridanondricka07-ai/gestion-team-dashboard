import json

path = r'C:\Users\admin_11\.gemini\antigravity-ide\brain\0b54de57-084a-442b-8c38-2649d1560006\.system_generated\logs\transcript.jsonl'
out_path = r'c:\Users\admin_11\Documents\Gestion_Team\scratch\all_user_inputs.txt'

try:
    with open(path, 'r', encoding='utf-8') as f:
        with open(out_path, 'w', encoding='utf-8') as out_f:
            for idx, line in enumerate(f):
                data = json.loads(line)
                if data.get('type') == 'USER_INPUT':
                    content = data.get('content', '')
                    if 'iMacros' in content or 'bot_token' in content or 'firebase' in content:
                        out_f.write(f"=== USER INPUT {idx} ===\n")
                        out_f.write(content)
                        out_f.write("\n\n")
    print("Successfully wrote all matching user inputs to scratch/all_user_inputs.txt")
except Exception as e:
    print("Error:", e)
