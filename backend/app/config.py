import os

from app.env import load_env_file


load_env_file()


class Settings:
    project_name: str = "Hospital Management System"
    api_prefix: str = ""
    secret_key: str = os.getenv("SECRET_KEY", "change-this-secret-key")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    otp_expire_minutes: int = int(os.getenv("OTP_EXPIRE_MINUTES", "10"))
    smtp_host: str | None = os.getenv("SMTP_HOST")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: str | None = os.getenv("SMTP_USERNAME")
    smtp_password: str | None = os.getenv("SMTP_PASSWORD")
    smtp_from_email: str = os.getenv("SMTP_FROM_EMAIL", "no-reply@hospital.local")
    smtp_use_ssl: bool = os.getenv("SMTP_USE_SSL", "false").lower() == "true"
    smtp_use_tls: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"


settings = Settings()
