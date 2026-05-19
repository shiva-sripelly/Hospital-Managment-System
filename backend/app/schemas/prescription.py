from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class PrescriptionItemBase(BaseModel):
    medicine_name: str = Field(..., min_length=2, max_length=120)
    dosage: str = Field(..., min_length=1, max_length=80)
    frequency: str = Field(..., min_length=1, max_length=80)
    duration: str = Field(..., min_length=1, max_length=80)


class PrescriptionItemCreate(PrescriptionItemBase):
    pass


class PrescriptionItemRead(PrescriptionItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    prescription_id: int


class PrescriptionBase(BaseModel):
    patient_id: int = Field(..., ge=1)
    doctor_id: int = Field(..., ge=1)
    appointment_id: int | None = Field(default=None, ge=1)
    symptoms: str | None = None
    diagnosis: str = Field(..., min_length=2)
    notes: str | None = None
    items: list[PrescriptionItemCreate] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_items(self):
        if not self.items:
            raise ValueError("At least one prescription item is required")
        return self


class PrescriptionCreate(PrescriptionBase):
    pass


class PrescriptionUpdate(BaseModel):
    patient_id: int | None = Field(default=None, ge=1)
    doctor_id: int | None = Field(default=None, ge=1)
    appointment_id: int | None = Field(default=None, ge=1)
    symptoms: str | None = None
    diagnosis: str | None = Field(default=None, min_length=2)
    notes: str | None = None
    items: list[PrescriptionItemCreate] | None = None

    @model_validator(mode="after")
    def validate_items(self):
        if self.items is not None and not self.items:
            raise ValueError("At least one prescription item is required")
        return self


class PrescriptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    doctor_id: int
    appointment_id: int | None
    symptoms: str | None
    diagnosis: str
    notes: str | None
    created_at: datetime
    items: list[PrescriptionItemRead]
