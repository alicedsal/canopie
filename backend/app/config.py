from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # backend/ is the working directory; the shared .env sits at the repo root.
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    database_url: str = "postgresql://canopy:canopy@localhost:5432/canopy"
    frontend_origin: str = "http://localhost:5173"
    sender_hash_salt: str = "change-me"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    snowflake_account_url: str = ""
    snowflake_pat: str = ""
    snowflake_model: str = "claude-sonnet-4-5"


settings = Settings()
