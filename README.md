# ResumeForge AI Agent

This project is an AI agent that tailors a LaTeX resume to a specific job description using Langgraph and Groq.

## Setup

1.  **Install LaTeX:** You need to have a LaTeX distribution installed on your system. You can use a tool like TeX Live, MiKTeX, or MacTeX.
2.  **Install Python Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
3.  **Set up Groq API Key:**
    Create a `.env` file in the root of the project and add your Groq API key:
    ```
    GROQ_API_KEY=your_api_key_here
    ```

## Usage

```bash
python main.py --resume path/to/your/resume.tex --job-description "Your job description here"
```
