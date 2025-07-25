import glob
import os
import subprocess
import argparse
from texoutparse import LatexLogParser

def compile_latex(input_path, output_dir):
    """
    Compiles a LaTeX file to a PDF using pdflatex. Cleans up auxiliary files.
    Returns the parsed log file data.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    file_name = os.path.basename(input_path)
    job_name = os.path.splitext(file_name)[0]

    command = [
        "pdflatex",
        "-interaction=nonstopmode",
        "-output-directory",
        output_dir,
        "-jobname",
        job_name,
        input_path,
    ]

    try:
        process = subprocess.run(command, check=True, capture_output=True, text=True, timeout=30)
        print(f"Successfully compiled {input_path} to {os.path.join(output_dir, job_name)}.pdf")
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
        print(f"Error compiling {input_path}:")
        print(e.stdout)
        print(e.stderr)
    
    log_file_path = os.path.join(output_dir, f"{job_name}.log")
    parsed_log = None
    if os.path.exists(log_file_path):
        with open(log_file_path, 'r') as f:
            parsed_log = LatexLogParser(f.read())

    output_pdf_path = os.path.join(output_dir, f"{job_name}.pdf")
    # Clean up auxiliary files
    print("Cleaning up auxiliary files...")
    for ext in ["*.aux", "*.out", "*.fls", "*.fdb_latexmk"]:
        for file in glob.glob(os.path.join(output_dir, ext)):
            os.remove(file)
    if os.path.exists(output_pdf_path):
        print(f"Successfully compiled {input_path} to {output_pdf_path}")
    else:
        print(f"Error: PDF file {output_pdf_path} not found after compilation.")
    
    return parsed_log

def main():
    parser = argparse.ArgumentParser(description="Compile a LaTeX file to a PDF.")
    parser.add_argument("input_file", type=str, help="Path to the input .tex file.")
    args = parser.parse_args()

    compile_latex(args.input_file, "output")

if __name__ == "__main__":
    main()
