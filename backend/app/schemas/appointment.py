from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.appointment import AppointmentStatus


class AppointmentBase(BaseModel):
    patient_id: int = Field(..., ge=1)
    doctor_id: int = Field(..., ge=1)
    appointment_date: date
    appointment_time: time
    status: AppointmentStatus = AppointmentStatus.scheduled
    notes: str | None = None

    @model_validator(mode="after")
    def validate_schedule(self):
        today = date.today()
        now = datetime.now().time().replace(second=0, microsecond=0)
        appointment_time = self.appointment_time.replace(second=0, microsecond=0)

        if self.appointment_date < today:
            raise ValueError("Appointment date cannot be in the past")
        if self.appointment_date == today and appointment_time < now:
            raise ValueError("Appointment time cannot be in the past")
        return self


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    patient_id: int | None = Field(default=None, ge=1)
    doctor_id: int | None = Field(default=None, ge=1)
    appointment_date: date | None = None
    appointment_time: time | None = None
    status: AppointmentStatus | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_schedule(self):
        if self.appointment_date is None or self.appointment_time is None:
            return self

        today = date.today()
        now = datetime.now().time().replace(second=0, microsecond=0)
        appointment_time = self.appointment_time.replace(second=0, microsecond=0)

        if self.appointment_date < today:
            raise ValueError("Appointment date cannot be in the past")
        if self.appointment_date == today and appointment_time < now:
            raise ValueError("Appointment time cannot be in the past")
        return self


class AppointmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    doctor_id: int
    appointment_date: date
    appointment_time: time
    status: AppointmentStatus
    notes: str | None
    created_at: datetime
