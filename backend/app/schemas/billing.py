from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.billing import PaymentMethod, PaymentStatus


class BillBase(BaseModel):
    bill_number: str | None = Field(default=None, min_length=3, max_length=30)
    patient_id: int = Field(..., ge=1)
    appointment_id: int | None = Field(default=None, ge=1)
    consultation_fee: Decimal = Field(default=Decimal("0"), ge=0)
    lab_fee: Decimal = Field(default=Decimal("0"), ge=0)
    medicine_fee: Decimal = Field(default=Decimal("0"), ge=0)
    total_amount: Decimal | None = Field(default=None, ge=0)
    payment_status: PaymentStatus = PaymentStatus.pending
    payment_method: PaymentMethod | None = None

    @model_validator(mode="after")
    def fill_total_amount(self):
        calculated_total = self.consultation_fee + self.lab_fee + self.medicine_fee
        if self.total_amount is None:
            self.total_amount = calculated_total
        return self


class BillCreate(BillBase):
    pass


class BillUpdate(BaseModel):
    bill_number: str | None = Field(default=None, min_length=3, max_length=30)
    patient_id: int | None = Field(default=None, ge=1)
    appointment_id: int | None = Field(default=None, ge=1)
    consultation_fee: Decimal | None = Field(default=None, ge=0)
    lab_fee: Decimal | None = Field(default=None, ge=0)
    medicine_fee: Decimal | None = Field(default=None, ge=0)
    total_amount: Decimal | None = Field(default=None, ge=0)
    payment_status: PaymentStatus | None = None
    payment_method: PaymentMethod | None = None


class BillRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    bill_number: str
    patient_id: int
    appointment_id: int | None
    consultation_fee: Decimal
    lab_fee: Decimal
    medicine_fee: Decimal
    total_amount: Decimal
    payment_status: PaymentStatus
    payment_method: PaymentMethod | None
    created_at: datetime
