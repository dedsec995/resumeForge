import re

def clean_the_text(content):
    latex_match = re.search(r"```latex(.*)```", content, re.DOTALL)
    if not latex_match:
        print("No LaTeX content found.")
        return
    latex_content = latex_match.group(1)
    return latex_content
