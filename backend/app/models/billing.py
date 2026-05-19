import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    cancelled = "cancelled"


class PaymentMethod(str, enum.Enum):
    cash = "cash"
    card = "card"
    upi = "upi"
    insurance = "insurance"


class Bill(Base):
    __tablename__ = "bills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    bill_number: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"), nullable=True, index=True)
    consultation_fee: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    lab_fee: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    medicine_fee: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    payment_status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status"),
        default=PaymentStatus.pending,
        nullable=False,
    )
    payment_method: Mapped[PaymentMethod | None] = mapped_column(
        Enum(PaymentMethod, name="payment_method"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    patient = relationship("Patient")
    appointment = relationship("Appointment")
