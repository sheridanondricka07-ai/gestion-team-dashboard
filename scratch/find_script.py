import json

path = r'C:\Users\admin_11\.gemini\antigravity-ide\brain\0b54de57-084a-442b-8c38-2649d1560006\.system_generated\logs\transcript.jsonl'

try:
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            data = json.loads(line)
            if data.get('type') == 'USER_INPUT' and 'bot_token' in data.get('content', ''):
                print("FOUND SCRIPT:")
                print(data['content'])
                break
except Exception as e:
    print("Error:", e)
