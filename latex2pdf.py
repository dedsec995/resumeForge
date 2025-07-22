import os
import subprocess
import argparse

def compile_latex(input_path, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    file_name = os.path.basename(input_path)
    job_name = os.path.splitext(file_name)[0]

    command = [
        "pdflatex",
        "-output-directory",
        output_dir,
        "-jobname",
        job_name,
        input_path,
    ]

    try:
        subprocess.run(command, check=True, capture_output=True, text=True)
        print(f"Successfully compiled {input_path} to {os.path.join(output_dir, job_name)}.pdf")
    except subprocess.CalledProcessError as e:
        print(f"Error compiling {input_path}:")
        print(e.stdout)
        print(e.stderr)

def main():
    parser = argparse.ArgumentParser(description="Compile a LaTeX file to a PDF.")
    parser.add_argument("input_file", type=str, help="Path to the input .tex file.")
    args = parser.parse_args()

    compile_latex(args.input_file, "output")

if __name__ == "__main__":
    main()
