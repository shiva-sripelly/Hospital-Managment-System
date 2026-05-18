import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.otp import OtpPurpose, OtpVerification
from app.utils.security import hash_password, verify_password


def generate_otp() -> str:
    return f"{random.randint(100000, 999999)}"


def create_otp(db: Session, email: str, purpose: OtpPurpose) -> str:
    otp = generate_otp()
    verification = OtpVerification(
        email=email,
        otp_hash=hash_password(otp),
        purpose=purpose,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.otp_expire_minutes),
    )
    db.add(verification)
    db.commit()
    return otp


def verify_otp(db: Session, email: str, otp: str, purpose: OtpPurpose) -> bool:
    verification = db.scalar(
        select(OtpVerification)
        .where(
            OtpVerification.email == email,
            OtpVerification.purpose == purpose,
            OtpVerification.is_used.is_(False),
        )
        .order_by(OtpVerification.created_at.desc())
    )
    if verification is None:
        return False

    expires_at = verification.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return False
    if not verify_password(otp, verification.otp_hash):
        return False

    verification.is_used = True
    db.commit()
    return True
