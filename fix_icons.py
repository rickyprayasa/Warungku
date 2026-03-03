import re

with open("src/pages/LandingPage.tsx", "r") as f:
    content = f.read()

# Pattern specifically targets material-symbols-outlined spans carrying text-[...] sizing
pattern = r'<span className="material-symbols-outlined text-\[(\d+)px\] (.*?)"\>(.*?)<\/span>'

def replace_func(match):
    size = match.group(1)
    classes = match.group(2)
    icon_name = match.group(3)
    return f'<span className="material-symbols-outlined {classes}" style={{{{ fontSize: "{size}px" }}}}>{icon_name}</span>'

new_content = re.sub(pattern, replace_func, content)

with open("src/pages/LandingPage.tsx", "w") as f:
    f.write(new_content)

print("Icons fixed!")
