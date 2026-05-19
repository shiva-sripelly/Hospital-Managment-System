import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from app.config import settings


class EmailDeliveryError(RuntimeError):
    pass


def send_email(to_email: str, subject: str, body: str) -> None:
    if not settings.smtp_host or not settings.smtp_username or not settings.smtp_password:
        print(
            "[EMAIL DEV MODE - SMTP NOT CONFIGURED]\n"
            f"To: {to_email}\nSubject: {subject}\n"
        )
        raise EmailDeliveryError("SMTP is not configured")

    message = EmailMessage()
    message["From"] = formataddr(("Hospital Management System", settings.smtp_from_email))
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    try:
        server_class = smtplib.SMTP_SSL if settings.smtp_use_ssl else smtplib.SMTP
        with server_class(settings.smtp_host, settings.smtp_port, timeout=20) as server:
            if settings.smtp_use_tls and not settings.smtp_use_ssl:
                server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
    except (OSError, smtplib.SMTPException) as error:
        print(
            f"[EMAIL SEND FAILED] To: {to_email}\n"
            f"Subject: {subject}\n"
            f"Reason: {error}\n"
            "Check SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL, "
            "SMTP_USE_TLS, and SMTP_USE_SSL in backend/.env.\n"
        )
        raise EmailDeliveryError(str(error)) from error


def send_otp_email(to_email: str, otp: str, purpose: str) -> None:
    subject = f"Your Hospital Management System OTP for {purpose}"
    body = (
        "Hello,\n\n"
        f"Use the following one-time password to continue with your {purpose} request:\n\n"
        f"OTP: {otp}\n\n"
        f"This code expires in {settings.otp_expire_minutes} minutes. For your security, do not share this code with anyone.\n\n"
        "If you did not request this code, you can safely ignore this email.\n\n"
        "Regards,\n"
        "Hospital Management System"
    )
    send_email(to_email, subject, body)


def send_notification_email(to_email: str, subject: str, message: str) -> None:
    body = (
        "Hello,\n\n"
        f"{message}\n\n"
        "If this activity was not performed by you, please contact the administrator immediately.\n\n"
        "Regards,\n"
        "Hospital Management System"
    )
    send_email(to_email, subject, body)
