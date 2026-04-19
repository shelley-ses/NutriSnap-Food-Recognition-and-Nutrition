import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


def _load_env_file() -> None:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        if key and key not in os.environ:
            os.environ[key] = value


@dataclass(frozen=True)
class Settings:
    clarifai_pat: str
    clarifai_model_url: str
    roboflow_api_key: str
    roboflow_model_1: str
    roboflow_model_2: str
    gemini_api_key: str
    spoonacular_api_key: str
    enable_clarifai: bool
    enable_roboflow: bool
    enable_gemini: bool
    enable_spoonacular: bool


@lru_cache
def get_settings() -> Settings:
    _load_env_file()

    return Settings(
        clarifai_pat=os.getenv("CLARIFAI_PAT", "").strip(),
        clarifai_model_url=os.getenv(
            "CLARIFAI_MODEL_URL",
            "https://clarifai.com/clarifai/main/models/food-item-recognition",
        ).strip(),
        roboflow_api_key=os.getenv("ROBOFLOW_API_KEY", "").strip(),
        roboflow_model_1=os.getenv("ROBOFLOW_MODEL_1", "").strip(),
        roboflow_model_2=os.getenv("ROBOFLOW_MODEL_2", "").strip(),
        gemini_api_key=os.getenv("GEMINI_API_KEY", "").strip(),
        spoonacular_api_key=os.getenv("SPOONACULAR_API_KEY", "").strip(),
        enable_clarifai=os.getenv("ENABLE_CLARIFAI", "true").lower() in ("true", "1", "yes"),
        enable_roboflow=os.getenv("ENABLE_ROBOFLOW", "true").lower() in ("true", "1", "yes"),
        enable_gemini=os.getenv("ENABLE_GEMINI", "true").lower() in ("true", "1", "yes"),
        enable_spoonacular=os.getenv("ENABLE_SPOONACULAR", "false").lower() in ("true", "1", "yes"),
    )