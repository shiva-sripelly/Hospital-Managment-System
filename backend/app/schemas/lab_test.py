from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.lab_test import LabTestStatus


class LabTestBase(BaseModel):
    patient_id: int = Field(..., ge=1)
    doctor_id: int = Field(..., ge=1)
    test_name: str = Field(..., min_length=2, max_length=120)
    test_status: LabTestStatus = LabTestStatus.requested
    report_file: str | None = Field(default=None, max_length=255)
    remarks: str | None = None


class LabTestCreate(LabTestBase):
    pass


class LabTestUpdate(BaseModel):
    patient_id: int | None = Field(default=None, ge=1)
    doctor_id: int | None = Field(default=None, ge=1)
    test_name: str | None = Field(default=None, min_length=2, max_length=120)
    test_status: LabTestStatus | None = None
    report_file: str | None = Field(default=None, max_length=255)
    remarks: str | None = None


class LabTestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    doctor_id: int
    test_name: str
    test_status: LabTestStatus
    report_file: str | None
    remarks: str | None
    created_at: datetime
    patient_name: str | None = None
    doctor_name: str | None = None
