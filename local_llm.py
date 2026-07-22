import os
from typing import Optional

from dotenv import load_dotenv
from langchain_core.utils.utils import secret_from_env
from langchain_openai import ChatOpenAI
from pydantic import Field, SecretStr

from model_config import LOCAL_LLM_BASE_URL, LOCAL_LLM_API_KEY

load_dotenv()


class ChatLocalLLM(ChatOpenAI):
    openai_api_key: Optional[SecretStr] = Field(
        alias="api_key",
        default_factory=secret_from_env("LOCAL_LLM_API_KEY", default="not-needed"),
    )

    @property
    def lc_secrets(self) -> dict[str, str]:
        return {"openai_api_key": "LOCAL_LLM_API_KEY"}

    def __init__(self, openai_api_key: Optional[str] = None, **kwargs):
        openai_api_key = openai_api_key or os.environ.get(
            "LOCAL_LLM_API_KEY", LOCAL_LLM_API_KEY
        )
        super().__init__(
            base_url=LOCAL_LLM_BASE_URL,
            openai_api_key=openai_api_key,
            **kwargs,
        )
