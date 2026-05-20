from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.billing import PaymentStatus
from app.models.pharmacy import InventoryActionType


class MedicineBase(BaseModel):
    medicine_code: str | None = Field(default=None, min_length=2, max_length=30)
    medicine_name: str = Field(..., min_length=2, max_length=160)
    category: str = Field(..., min_length=2, max_length=80)
    manufacturer: str | None = Field(default=None, max_length=120)
    stock_quantity: int = Field(default=0, ge=0)
    unit_price: Decimal = Field(default=Decimal("0"), ge=0)
    expiry_date: date | None = None


class MedicineCreate(MedicineBase):
    pass


class MedicineUpdate(BaseModel):
    medicine_code: str | None = Field(default=None, min_length=2, max_length=30)
    medicine_name: str | None = Field(default=None, min_length=2, max_length=160)
    category: str | None = Field(default=None, min_length=2, max_length=80)
    manufacturer: str | None = Field(default=None, max_length=120)
    stock_quantity: int | None = Field(default=None, ge=0)
    unit_price: Decimal | None = Field(default=None, ge=0)
    expiry_date: date | None = None


class MedicineRead(MedicineBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    medicine_code: str
    created_at: datetime


class MedicineSaleItemCreate(BaseModel):
    medicine_id: int = Field(..., ge=1)
    quantity: int = Field(..., ge=1)
    unit_price: Decimal | None = Field(default=None, ge=0)


class MedicineSaleItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sale_id: int
    medicine_id: int
    quantity: int
    unit_price: Decimal
    total_price: Decimal


class MedicineSaleCreate(BaseModel):
    patient_id: int = Field(..., ge=1)
    bill_id: int | None = Field(default=None, ge=1)
    payment_status: PaymentStatus = PaymentStatus.pending
    items: list[MedicineSaleItemCreate] = Field(..., min_length=1)


class MedicineSaleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    bill_id: int | None
    total_amount: Decimal
    payment_status: PaymentStatus
    created_at: datetime
    items: list[MedicineSaleItemRead] = []


class InventoryLogCreate(BaseModel):
    medicine_id: int = Field(..., ge=1)
    action_type: InventoryActionType
    quantity: int = Field(..., ge=1)
    remarks: str | None = Field(default=None, max_length=500)


class InventoryLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    medicine_id: int
    action_type: InventoryActionType
    quantity: int
    remarks: str | None
    created_at: datetime
