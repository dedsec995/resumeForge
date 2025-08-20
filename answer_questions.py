import os
import json
from typing import Dict, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


def get_user_api_keys(user_id: str, user_tier: str) -> Dict[str, Optional[str]]:
    if user_tier == "FREE":
        try:
            from database_operations import dbOps

            api_data = dbOps.getUserApiConfig(user_id)
            if api_data:
                return {
                    "openai": api_data.get("openAiKey"),
                    "groq": api_data.get("groqKey"),
                    "google": api_data.get("googleGenAiKey"),
                }
            return {"openai": None, "groq": None, "google": None}
        except Exception:
            return {"openai": None, "groq": None, "google": None}
    elif user_tier == "ADMI":
        return {
            "openai": OPENAI_API_KEY,
            "groq": GROQ_API_KEY,
            "google": GOOGLE_API_KEY,
        }
    return {"openai": None, "groq": None, "google": None}


def answer_question(
    job_description: str,
    resume: dict,
    question: str,
    user_id: str = "",
    user_tier: str = "FREE",
    selected_provider: str = "openai",
) -> str:
    api_keys = get_user_api_keys(user_id, user_tier)
    prompt = f"""Based on this job description: "{job_description}" and this resume: {json.dumps(resume)}, please answer the following question in maximum 4 lines: {question}"""

    if selected_provider == "openai" and api_keys["openai"]:
        model = ChatOpenAI(
            model="gpt-3.5-turbo", max_tokens=200, api_key=api_keys["openai"]
        )
        response = model.invoke(prompt)
        return response.content.strip()

    else:
        model = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash", max_output_tokens=200, api_key=api_keys["google"]
        )
        response = model.invoke(prompt)
        return response.content.strip()

