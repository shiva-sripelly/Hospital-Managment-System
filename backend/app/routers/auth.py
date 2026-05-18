from fastapi import APIRouter, Depends, HTTPException, status
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
    UserCreate,
    UserLogin,
    UserRead,
)
from app.services.auth_service import (
    authenticate_user,
    create_user,
    get_user_by_email,
    update_user_password,
)
from app.services.email_service import send_notification_email, send_otp_email
from app.services.otp_service import create_otp, verify_otp
from app.utils.security import create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)) -> User:
    existing_user = get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )
    user = create_user(db, user_data)
    send_notification_email(
        user.email,
        "Registration successful",
        f"Hello {user.full_name}, your Hospital Management System account has been registered.",
    )
    return user


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

    otp = create_otp(db, user_data.email, OtpPurpose.registration)
    send_otp_email(user_data.email, otp, "registration")
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
    if not verify_otp(db, user_data.email, user_data.otp, OtpPurpose.registration):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    user = create_user(db, user_data)
    send_notification_email(
        user.email,
        "Registration successful",
        f"Hello {user.full_name}, your Hospital Management System account has been registered.",
    )
    return user


@router.post("/login", response_model=Token)
def login_user(credentials: UserLogin, db: Session = Depends(get_db)) -> Token:
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
    send_notification_email(
        user.email,
        "Login notification",
        f"Hello {user.full_name}, your account was logged in successfully.",
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
    send_otp_email(request_data.email, otp, "password reset")
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
        "Password changed",
        "Your Hospital Management System password was changed successfully.",
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
        "Password changed",
        "Your Hospital Management System password was changed successfully.",
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


@router.get("/me", response_model=UserRead, include_in_schema=False)
def read_current_user_alias(current_user: User = Depends(get_current_user)) -> User:
    return current_user
