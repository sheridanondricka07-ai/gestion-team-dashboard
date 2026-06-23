import re

with open('api/sync-telegram-warmup.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

count = 0
for i, line in enumerate(lines):
    for char in line:
        if char == '{':
            count += 1
        elif char == '}':
            count -= 1
    if count < 0:
        print(f"Extra closing brace at line {i+1}: {line.strip()}")
        break
print(f"Final count: {count}")
