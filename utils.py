import re
import json

def clean_the_text(content):
    latex_match = re.search(r"```latex(.*)```", content, re.DOTALL)
    if not latex_match:
        print("No LaTeX content found.")
        return
    latex_content = latex_match.group(1)
    return latex_content

def extract_and_parse_json(text: str):
    """
    Extracts a JSON object from a string and parses it.
    The JSON object can be enclosed in ```json ... ``` or ``` ... ```,
    or be a raw JSON object in the text.
    """
    # Case 1: JSON is in a markdown code block with "json" language identifier
    match = re.search(r"```json\s*({.*})\s*```", text, re.DOTALL)
    if match:
        json_str = match.group(1)
    else:
        # Case 2: JSON is in a markdown code block without language identifier
        match = re.search(r"```\s*({.*})\s*```", text, re.DOTALL)
        if match:
            json_str = match.group(1)
        else:
            # Case 3: Raw JSON object in the text
            start_index = text.find('{')
            end_index = text.rfind('}')
            if start_index != -1 and end_index != -1 and end_index > start_index:
                json_str = text[start_index:end_index+1]
            else:
                return None # No JSON object found

    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        return None