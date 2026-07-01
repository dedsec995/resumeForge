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
