from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.patient import validate_email, validate_phone


class DoctorBase(BaseModel):
    doctor_code: str | None = Field(default=None, min_length=3, max_length=30)
    full_name: str = Field(..., min_length=2, max_length=120)
    specialization: str = Field(..., min_length=2, max_length=120)
    experience: int = Field(..., ge=0, le=80)
    phone: str = Field(..., min_length=7, max_length=20)
    email: EmailStr = Field(..., max_length=255)
    consultation_fee: float = Field(..., ge=0)
    available_days: str = Field(..., min_length=2, max_length=255)

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str) -> str:
        return validate_phone(value) or value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        normalized = validate_email(value)
        if normalized is None:
            raise ValueError("Email is required")
        return normalized


class DoctorCreate(DoctorBase):
    pass


class DoctorUpdate(BaseModel):
    doctor_code: str | None = Field(default=None, min_length=3, max_length=30)
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    specialization: str | None = Field(default=None, min_length=2, max_length=120)
    experience: int | None = Field(default=None, ge=0, le=80)
    phone: str | None = Field(default=None, min_length=7, max_length=20)
    email: EmailStr | None = Field(default=None, max_length=255)
    consultation_fee: float | None = Field(default=None, ge=0)
    available_days: str | None = Field(default=None, min_length=2, max_length=255)

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        return validate_phone(value)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr | None) -> str | None:
        return validate_email(value)


class DoctorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    doctor_code: str
    full_name: str
    specialization: str
    experience: int
    phone: str
    email: str
    consultation_fee: float
    available_days: str
    created_at: datetime
