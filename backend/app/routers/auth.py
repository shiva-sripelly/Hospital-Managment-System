from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.otp import OtpPurpose
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    MessageResponse,
    ProfileUpdate,
    RegisterOtpRequest,
    RegisterVerify,
    ResetPasswordRequest,
    Token,
    UserLogin,
    UserRead,
)
from app.services.auth_service import (
    authenticate_user,
    create_patient_user,
    get_user_by_email,
    update_user_password,
)
from app.services.email_service import EmailDeliveryError, send_notification_email, send_otp_email
from app.services.otp_service import create_otp, verify_otp
from app.services.patient_service import find_patient_by_unique_fields
from app.utils.security import create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

PROFILE_PHOTO_DIR = Path(__file__).resolve().parent.parent / "static" / "profile_photos"
ALLOWED_PROFILE_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_PROFILE_PHOTO_SIZE = 3 * 1024 * 1024


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user() -> User:
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Direct registration is disabled. Use OTP registration.",
    )


@router.post("/register/request-otp", response_model=MessageResponse)
def request_registration_otp(
    user_data: RegisterOtpRequest,
    db: Session = Depends(get_db),
) -> MessageResponse:
    existing_user = get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )
    existing_patient = find_patient_by_unique_fields(db, phone=user_data.phone, email=user_data.email)
    if existing_patient:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A patient with this phone or email already exists",
        )

    otp = create_otp(db, user_data.email, OtpPurpose.registration)
    try:
        send_otp_email(user_data.email, otp, "registration")
    except EmailDeliveryError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not send OTP email. Check SMTP settings.",
        )
    return MessageResponse(message="OTP sent to your email address")


@router.post("/register/verify", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def verify_registration(
    user_data: RegisterVerify,
    db: Session = Depends(get_db),
) -> User:
    existing_user = get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )
    existing_patient = find_patient_by_unique_fields(db, phone=user_data.phone, email=user_data.email)
    if existing_patient:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A patient with this phone or email already exists",
        )
    if not verify_otp(db, user_data.email, user_data.otp, OtpPurpose.registration):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    user = create_patient_user(db, user_data)
    send_notification_email(
        user.email,
        "Your Hospital Management System account was created",
        (
            f"Dear {user.full_name},\n\n"
            "Your account has been successfully created and verified through OTP authentication.\n\n"
            "You can now securely sign in to the Hospital Management System using the following email address:\n\n"
            f"Email: {user.email}\n"
            f"Role: {user.role.value.replace('_', ' ').title()}\n\n"
            "If you did not request this account creation or believe this activity was unauthorized, "
            "please contact the system administrator immediately.\n\n"
            "Thank you,\n"
            "Hospital Management System"
        ),
    )
    return user


@router.post("/login", response_model=Token)
def login_user(
    credentials: UserLogin,
    request: Request,
    db: Session = Depends(get_db),
) -> Token:
    user = authenticate_user(db, credentials.email, credentials.password)
    if user is None:
        existing_user = get_user_by_email(db, credentials.email)
        detail = "Invalid password" if existing_user else "No registered user found with this email"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=str(user.id), role=user.role.value)
    client_ip = request.client.host if request.client else "Unknown"
    login_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    send_notification_email(
        user.email,
        "New sign-in to your Hospital Management System account",
        (
            f"Dear {user.full_name},\n"
            "Your account was signed in successfully.\n\n"
            f"Account Email: {user.email}\n"
            f"Account Role: {user.role.value.replace('_', ' ').title()}\n"
            f"Login Time: {login_time}\n"
            f"IP Address: {client_ip}"
        ),
    )
    return Token(access_token=access_token, user=user)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    request_data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> MessageResponse:
    user = get_user_by_email(db, request_data.email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered user found with this email",
        )

    otp = create_otp(db, request_data.email, OtpPurpose.password_reset)
    try:
        send_otp_email(request_data.email, otp, "password reset")
    except EmailDeliveryError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not send password reset email. Check SMTP settings.",
        )
    return MessageResponse(message="Password reset OTP sent to your email address")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    request_data: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> MessageResponse:
    user = get_user_by_email(db, request_data.email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered user found with this email",
        )
    if not verify_otp(db, request_data.email, request_data.otp, OtpPurpose.password_reset):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    update_user_password(db, user, request_data.new_password)
    send_notification_email(
        user.email,
        "Your Hospital Management System password was reset",
        (
            f"Dear {user.full_name},\n\n"
            "Your password was reset successfully using OTP verification. You can now sign in with your new password."
        ),
    )
    return MessageResponse(message="Password reset successfully")


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    request_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    user = authenticate_user(db, current_user.email, request_data.current_password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    update_user_password(db, current_user, request_data.new_password)
    send_notification_email(
        current_user.email,
        "Your Hospital Management System password was changed",
        (
            f"Dear {current_user.full_name},\n\n"
            "Your password was changed successfully from your profile. You can continue using your account normally."
        ),
    )
    return MessageResponse(message="Password changed successfully")


@router.get("/profile", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.put("/profile", response_model=UserRead)
def update_current_user_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    existing_user = get_user_by_email(db, profile_data.email)
    if existing_user and existing_user.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Another user already uses this email",
        )

    current_user.full_name = profile_data.full_name.strip()
    current_user.email = profile_data.email
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/profile/photo", response_model=UserRead)
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    if file.content_type not in ALLOWED_PROFILE_PHOTO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Profile photo must be a JPG, PNG, or WebP image",
        )
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="File is required")

    content = await file.read()
    if len(content) > MAX_PROFILE_PHOTO_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Profile photo must be 3 MB or less")

    PROFILE_PHOTO_DIR.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename).suffix.lower()
    stored_name = f"{uuid4().hex}{suffix}"
    stored_path = PROFILE_PHOTO_DIR / stored_name
    stored_path.write_bytes(content)

    current_user.profile_photo_url = f"/static/profile_photos/{stored_name}"
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me", response_model=UserRead, include_in_schema=False)
def read_current_user_alias(current_user: User = Depends(get_current_user)) -> User:
    return current_user
