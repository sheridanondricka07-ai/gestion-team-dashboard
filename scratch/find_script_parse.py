import json

path = r'C:\Users\admin_11\.gemini\antigravity-ide\brain\0b54de57-084a-442b-8c38-2649d1560006\.system_generated\logs\transcript.jsonl'

try:
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            data = json.loads(line)
            if data.get('type') == 'USER_INPUT' and 'bot_token' in data.get('content', ''):
                content = data['content']
                for c_line in content.split('\n'):
                    if 'update' in c_line.lower() or 'match' in c_line.lower() or 'replace' in c_line.lower() or 'split' in c_line.lower():
                        print(c_line)
                break
except Exception as e:
    print("Error:", e)
