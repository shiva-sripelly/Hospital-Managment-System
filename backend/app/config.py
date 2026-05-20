import os

from app.env import load_env_file


load_env_file()


class Settings:
    project_name: str = "Hospital Management System"
    api_prefix: str = ""
    environment: str = os.getenv("APP_ENV", "development").lower()
    secret_key: str = os.getenv("SECRET_KEY", "")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    otp_expire_minutes: int = int(os.getenv("OTP_EXPIRE_MINUTES", "10"))
    cors_origins: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:5173,http://localhost:5174",
        ).split(",")
        if origin.strip()
    ]
    smtp_host: str | None = os.getenv("SMTP_HOST")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: str | None = os.getenv("SMTP_USERNAME")
    smtp_password: str | None = os.getenv("SMTP_PASSWORD")
    smtp_from_email: str = os.getenv("SMTP_FROM_EMAIL", "no-reply@hospital.local")
    smtp_use_ssl: bool = os.getenv("SMTP_USE_SSL", "false").lower() == "true"
    smtp_use_tls: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

    def validate(self) -> None:
        if not self.secret_key:
            raise RuntimeError("SECRET_KEY is required. Configure it in backend/.env.")
        if self.environment == "production":
            if (
                self.secret_key in {"change-this-secret-key", "replace-with-a-long-random-secret"}
                or self.secret_key.startswith("replace-")
            ):
                raise RuntimeError("SECRET_KEY must be changed before running in production.")


settings = Settings()
settings.validate()
