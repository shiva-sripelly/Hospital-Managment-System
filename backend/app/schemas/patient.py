from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.patient import BloodGroup, Gender


def validate_email(value: EmailStr | str | None) -> str | None:
    if value is None or str(value).strip() == "":
        return None
    return str(value).strip().lower()


def validate_phone(value: str | None) -> str | None:
    if value is None:
        return value
    value = value.strip()
    if not value.isdigit():
        raise ValueError("Phone number must contain digits only")
    return value


class PatientBase(BaseModel):
    patient_code: str | None = Field(default=None, min_length=3, max_length=30)
    full_name: str = Field(..., min_length=2, max_length=120)
    gender: Gender
    dob: date
    phone: str = Field(..., min_length=7, max_length=20)
    email: EmailStr | None = Field(default=None, max_length=255)
    address: str | None = None
    blood_group: BloodGroup | None = None
    emergency_contact: str | None = Field(default=None, max_length=120)

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str) -> str:
        return validate_phone(value) or value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr | None) -> str | None:
        return validate_email(value)

    @field_validator("dob")
    @classmethod
    def validate_dob(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("Date of birth cannot be in the future")
        return value


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    patient_code: str | None = Field(default=None, min_length=3, max_length=30)
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    gender: Gender | None = None
    dob: date | None = None
    phone: str | None = Field(default=None, min_length=7, max_length=20)
    email: EmailStr | None = Field(default=None, max_length=255)
    address: str | None = None
    blood_group: BloodGroup | None = None
    emergency_contact: str | None = Field(default=None, max_length=120)

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        return validate_phone(value)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr | None) -> str | None:
        return validate_email(value)

    @field_validator("dob")
    @classmethod
    def validate_dob(cls, value: date | None) -> date | None:
        if value is not None and value > date.today():
            raise ValueError("Date of birth cannot be in the future")
        return value


class PatientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_code: str
    full_name: str
    gender: Gender
    dob: date
    phone: str
    email: str | None
    address: str | None
    blood_group: BloodGroup | None
    emergency_contact: str | None
    created_at: datetime
