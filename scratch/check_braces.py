import os

def check_file(filename):
    print(f"Checking {filename}...")
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    braces = 0
    brackets = 0
    parentheses = 0
    line_no = 1
    col_no = 0
    
    for i, char in enumerate(content):
        if char == '\n':
            line_no += 1
            col_no = 0
        else:
            col_no += 1
            
        if char == '{': braces += 1
        elif char == '}': braces -= 1
        elif char == '[': brackets += 1
        elif char == ']': brackets -= 1
        elif char == '(': parentheses += 1
        elif char == ')': parentheses -= 1
        
        if braces < 0:
            print(f"Excess closed brace '}}' at line {line_no}, col {col_no}")
            braces = 0
        if brackets < 0:
            print(f"Excess closed bracket ']' at line {line_no}, col {col_no}")
            brackets = 0
        if parentheses < 0:
            print(f"Excess closed parenthesis ')' at line {line_no}, col {col_no}")
            parentheses = 0
            
    print(f"Finished: braces={braces}, brackets={brackets}, parentheses={parentheses}\n")

check_file('api/ai-agent.js')
check_file('components.js')
check_file('app.js')
