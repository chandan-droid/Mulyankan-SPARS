import re

path = r"c:\My Projects\Mulyankan-Spars-System\spars_frontend\src\pages\teacher\Dashboard.jsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern for the map block inside Bar
pattern = r'\{coData\.map\(\(entry, i\) => \(\s+<Cell key=\{i\} fill=\{entry\.AvgPercentage >= 65 \? \'hsl\(168 60% 48%\)\' : entry\.AvgPercentage >= 60 \? \'hsl\(35 95% 58%\)\' : \'hsl\(0 72% 55%\)\'\} />\s+\)\)\}'

replacement = """{coData.map((entry, i) => {
                          const val = entry.AvgPercentage;
                          const fill = val >= 70 ? 'hsl(168 60% 48%)' : val >= 65 ? 'hsl(84 81% 44%)' : val >= 60 ? 'hsl(35 95% 58%)' : 'hsl(0 72% 55%)';
                          return <Cell key={i} fill={fill} />;
                        })}"""

new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Updated successfully")
