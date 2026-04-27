import re

path = r"c:\My Projects\Mulyankan-Spars-System\spars_frontend\src\pages\teacher\Dashboard.jsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# General tag checker
all_tags = re.finditer(r'<([/a-zA-Z0-9]+)(?:\s+[^>]*?)?(/?)>', content)

stack = []
ignored_tags = {'img', 'br', 'hr', 'input', 'link', 'meta'}

for match in all_tags:
    raw_name = match.group(1)
    is_closing = raw_name.startswith('/')
    is_self_closing = match.group(2) == '/'
    tag_name = raw_name[1:] if is_closing else raw_name

    if tag_name.lower() in ignored_tags or is_self_closing:
        continue
    
    line_num = content.count('\n', 0, match.start()) + 1
    full_text = match.group(0)

    if is_closing:
        if not stack:
            print(f"Excess closing tag at line {line_num}: {full_text}")
        else:
            last_tag, last_line = stack.pop()
            if last_tag != tag_name:
                print(f"Mismatch: <{last_tag}> at line {last_line} closed by </{tag_name}> at line {line_num}")
    else:
        stack.append((tag_name, line_num))

if stack:
    print("Unclosed tags:")
    for tag, line in stack:
        print(f"Line {line}: <{tag}>")
else:
    print("All tags balanced")
