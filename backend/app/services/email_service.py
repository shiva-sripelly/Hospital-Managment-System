import smtplib
from email.message import EmailMessage

from app.config import settings


def send_email(to_email: str, subject: str, body: str) -> None:
    if not settings.smtp_host or not settings.smtp_username or not settings.smtp_password:
        print(f"[EMAIL DEV MODE] To: {to_email}\nSubject: {subject}\n{body}\n")
        return

    message = EmailMessage()
    message["From"] = settings.smtp_from_email
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
    except (OSError, smtplib.SMTPException) as error:
        print(
            f"[EMAIL SEND FAILED] To: {to_email}\n"
            f"Subject: {subject}\n"
            f"Reason: {error}\n"
            f"{body}\n"
        )


def send_otp_email(to_email: str, otp: str, purpose: str) -> None:
    subject = "Hospital Management System OTP"
    body = (
        f"Your OTP for {purpose} is {otp}.\n\n"
        f"This OTP expires in {settings.otp_expire_minutes} minutes."
    )
    send_email(to_email, subject, body)


def send_notification_email(to_email: str, subject: str, message: str) -> None:
    send_email(to_email, subject, message)
