import json

path = r'C:\Users\admin_11\.gemini\antigravity-ide\brain\0b54de57-084a-442b-8c38-2649d1560006\.system_generated\logs\transcript.jsonl'
out_path = r'c:\Users\admin_11\Documents\Gestion_Team\scratch\desktop_client.js'

try:
    with open(path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            data = json.loads(line)
            if data.get('type') == 'USER_INPUT' and idx == 1934:
                content = data.get('content', '')
                # Find the Javascript block starting at "// ========================================================================="
                # and ending before </USER_REQUEST>
                start_marker = "// =========================================================================\n// CONFIGURATION SETUP"
                start_idx = content.find(start_marker)
                if start_idx != -1:
                    js_code = content[start_idx:]
                    if '</USER_REQUEST>' in js_code:
                        js_code = js_code.split('</USER_REQUEST>')[0]
                    with open(out_path, 'w', encoding='utf-8') as out_f:
                        out_f.write(js_code)
                    print("Successfully extracted desktop client script!")
                    break
except Exception as e:
    print("Error:", e)
