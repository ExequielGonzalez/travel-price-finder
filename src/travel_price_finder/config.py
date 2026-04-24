from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    letsfg_api_key: str = ""
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = ["*"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
