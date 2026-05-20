from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.billing import PaymentStatus
from app.models.staff import StaffStatus


class StaffBase(BaseModel):
    employee_code: str | None = Field(default=None, min_length=2, max_length=30)
    full_name: str = Field(..., min_length=2, max_length=120)
    role: str = Field(..., min_length=2, max_length=80)
    department: str = Field(..., min_length=2, max_length=80)
    phone: str = Field(..., min_length=7, max_length=20)
    email: str | None = Field(default=None, max_length=255)
    salary: Decimal = Field(default=Decimal("0"), ge=0)
    joining_date: date
    status: StaffStatus = StaffStatus.active


class StaffCreate(StaffBase):
    pass


class StaffUpdate(BaseModel):
    employee_code: str | None = Field(default=None, min_length=2, max_length=30)
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    role: str | None = Field(default=None, min_length=2, max_length=80)
    department: str | None = Field(default=None, min_length=2, max_length=80)
    phone: str | None = Field(default=None, min_length=7, max_length=20)
    email: str | None = Field(default=None, max_length=255)
    salary: Decimal | None = Field(default=None, ge=0)
    joining_date: date | None = None
    status: StaffStatus | None = None


class StaffRead(StaffBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_code: str


class PayrollGenerate(BaseModel):
    employee_id: int = Field(..., ge=1)
    month: str = Field(..., pattern=r"^\d{4}-\d{2}$")
    bonus: Decimal = Field(default=Decimal("0"), ge=0)
    deductions: Decimal = Field(default=Decimal("0"), ge=0)
    payment_status: PaymentStatus = PaymentStatus.pending


class PayrollRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    month: str
    basic_salary: Decimal
    bonus: Decimal
    deductions: Decimal
    final_salary: Decimal
    payment_status: PaymentStatus
    generated_at: datetime
