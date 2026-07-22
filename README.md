# ResumeForge AI Agent

This project tailors a LaTeX resume to a job description using LangGraph and **Google Gemini** (for the **Google** / non–Chat-GPT provider path).

## Workflow

The agent runs a multi-step pipeline (extract company info, edit sections, score, keywords). See `graph.gif` in the repo for a visual.

## Setup

1. **Install LaTeX** (TeX Live, MiKTeX, or MacTeX).
2. **Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Environment variables** (see `model_config.py` for optional `GEMINI_MODEL_*` and `LOCAL_LLM_*` overrides):
   - **Google provider (hosted / ADMI):** set `GOOGLE_API_KEY` in `.env` for server-side keys.
   - **OpenAI path:** `OPENAI_API_KEY` / user-stored OpenAI key for the **Chat-GPT** provider option.
   - **OpenRouter** (only if you use the **openai** provider for judging): `OPENROUTER_API_KEY`.
   - **Local LLM (ADMI / hosted):** set `LOCAL_LLM_BASE_URL`, `LOCAL_LLM_MODEL`, and optional `LOCAL_LLM_MAX_TOKENS` for an OpenAI-compatible vLLM server.

## Usage

```bash
python main.py --resume path/to/your/resume.tex --job-description "Your job description here"
```

(If your entrypoint differs, use the same pattern as your current `app.py` / CLI.)
