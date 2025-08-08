import re
import json
import os
import tempfile
import shutil


def clean_the_text(content):
    latex_match = re.search(r"```latex(.*)```", content, re.DOTALL)
    if not latex_match:
        print("No LaTeX content found.")
        return
    latex_content = latex_match.group(1)
    return latex_content


def extract_and_parse_json(text: str):
    """
    Extracts a JSON object or array from a string and parses it.
    The JSON data can be enclosed in `````` or ``````,
    or present as raw JSON array/object text.
    """
    # Pattern to match JSON array or object inside markdown code fences with language identifier
    match = re.search(r"``````", text, re.DOTALL)
    if match:
        json_str = match.group(1)
    else:
        # Pattern to match JSON array or object inside markdown code fences without language identifier
        match = re.search(r"``````", text, re.DOTALL)
        if match:
            json_str = match.group(1)
        else:
            # Attempt to extract the first JSON array or object from raw text
            # Find first [ and matching ] or first { and matching }
            array_start = text.find("[")
            object_start = text.find("{")
            if array_start != -1 and (object_start == -1 or array_start < object_start):
                # Extract JSON array
                # Find corresponding closing bracket for array (could use stack parser for robustness)
                array_end = text.rfind("]")
                if array_end != -1 and array_end > array_start:
                    json_str = text[array_start : array_end + 1]
                else:
                    return None
            elif object_start != -1:
                # Extract JSON object
                object_end = text.rfind("}")
                if object_end != -1 and object_end > object_start:
                    json_str = text[object_start : object_end + 1]
                else:
                    return None
            else:
                return None

    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        return None


def parse_keywords_from_json(text: str) -> str:
    """
    Extracts keywords from a JSON object string and returns them as a comma-separated string.
    The JSON is expected to have a "keywords" key with a list of strings.
    """
    data = extract_and_parse_json(text)
    if data and "keywords" in data and isinstance(data["keywords"], list):
        return ", ".join(data["keywords"])
    return ""


def safe_write_file(file_path: str, content: str, encoding: str = "utf-8") -> bool:
    """
    Safely write content to a file, handling permission issues and creating directories if needed.
    Returns True if successful, False otherwise.
    """
    try:
        # Ensure the directory exists
        directory = os.path.dirname(file_path)
        if directory and not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)

        # Try to write the file directly
        with open(file_path, "w", encoding=encoding) as f:
            f.write(content)
        return True

    except PermissionError:
        print(
            f"Permission denied writing to {file_path}, trying alternative approach..."
        )
        try:
            # Try writing to a temporary file first, then moving it
            temp_dir = tempfile.gettempdir()
            temp_file = os.path.join(temp_dir, os.path.basename(file_path))

            with open(temp_file, "w", encoding=encoding) as f:
                f.write(content)

            # Try to move the file to the target location
            shutil.move(temp_file, file_path)
            return True

        except Exception as e:
            print(f"Failed to write file {file_path}: {e}")
            return False

    except Exception as e:
        print(f"Error writing file {file_path}: {e}")
        return False
