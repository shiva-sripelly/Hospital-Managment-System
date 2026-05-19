from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Prescription(Base):
    __tablename__ = "prescriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), nullable=False, index=True)
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"), nullable=True, index=True)
    symptoms: Mapped[str | None] = mapped_column(Text, nullable=True)
    diagnosis: Mapped[str] = mapped_column(Text, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    patient = relationship("Patient")
    doctor = relationship("Doctor")
    appointment = relationship("Appointment")
    items = relationship(
        "PrescriptionItem",
        cascade="all, delete-orphan",
        back_populates="prescription",
    )


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    prescription_id: Mapped[int] = mapped_column(ForeignKey("prescriptions.id"), nullable=False, index=True)
    medicine_name: Mapped[str] = mapped_column(String(120), nullable=False)
    dosage: Mapped[str] = mapped_column(String(80), nullable=False)
    frequency: Mapped[str] = mapped_column(String(80), nullable=False)
    duration: Mapped[str] = mapped_column(String(80), nullable=False)

    prescription = relationship("Prescription", back_populates="items")
