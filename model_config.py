"""
Central model IDs for resume workflows (Google Gemini via AI Studio).

Override via environment variables without code changes.
Docs: https://ai.google.dev/gemini-api/docs/models
"""
import os

# Fast / cheap tasks: extraction, keywords, quality judge
GEMINI_FLASH = os.getenv("GEMINI_MODEL_FLASH", "gemini-2.0-flash")

# Heavier resume JSON edits: summary, skills, experience, projects
GEMINI_RESUME_EDITOR = os.getenv("GEMINI_MODEL_RESUME_EDITOR", "gemini-2.0-flash")

# Local OpenAI-compatible LLM (vLLM, etc.)
LOCAL_LLM_BASE_URL = os.getenv("LOCAL_LLM_BASE_URL", "")
LOCAL_LLM_MODEL = os.getenv("LOCAL_LLM_MODEL", "")
LOCAL_LLM_MAX_TOKENS = int(os.getenv("LOCAL_LLM_MAX_TOKENS", "8192"))
LOCAL_LLM_API_KEY = os.getenv("LOCAL_LLM_API_KEY", "not-needed")
LOCAL_LLM_ENABLED = os.getenv(
    "LOCAL_LLM_ENABLED", "true" if LOCAL_LLM_BASE_URL and LOCAL_LLM_MODEL else "false"
).lower() in ("1", "true", "yes")


def is_local_llm_configured() -> bool:
    return LOCAL_LLM_ENABLED and bool(LOCAL_LLM_BASE_URL) and bool(LOCAL_LLM_MODEL)
