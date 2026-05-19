import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class LabTestStatus(str, enum.Enum):
    requested = "requested"
    sample_collected = "sample_collected"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class LabTest(Base):
    __tablename__ = "lab_tests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), nullable=False, index=True)
    test_name: Mapped[str] = mapped_column(String(120), nullable=False)
    test_status: Mapped[LabTestStatus] = mapped_column(
        Enum(LabTestStatus, name="lab_test_status"),
        default=LabTestStatus.requested,
        nullable=False,
    )
    report_file: Mapped[str | None] = mapped_column(String(255), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    patient = relationship("Patient")
    doctor = relationship("Doctor")

    @property
    def patient_name(self) -> str | None:
        return self.patient.full_name if self.patient else None

    @property
    def doctor_name(self) -> str | None:
        return self.doctor.full_name if self.doctor else None
