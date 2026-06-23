import json
import re

path = r'C:\Users\admin_11\.gemini\antigravity-ide\brain\0b54de57-084a-442b-8c38-2649d1560006\.system_generated\logs\transcript.jsonl'
out_path = r'c:\Users\admin_11\Documents\Gestion_Team\scratch\pale_moon_script.js'

try:
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            data = json.loads(line)
            if data.get('type') == 'USER_INPUT' and 'bot_token' in data.get('content', ''):
                content = data['content']
                # Let's extract the JS part. It usually starts with // or var or function and ends before </USER_REQUEST>
                # But we can just write the whole content or strip out HTML tags
                clean_content = content
                if '<USER_REQUEST>' in clean_content:
                    m = re.search(r'<USER_REQUEST>(.*?)</USER_REQUEST>', clean_content, re.DOTALL)
                    if m:
                        clean_content = m.group(1)
                
                with open(out_path, 'w', encoding='utf-8') as out_f:
                    out_f.write(clean_content)
                print("Successfully extracted script to scratch/pale_moon_script.js")
                break
except Exception as e:
    print("Error:", e)
