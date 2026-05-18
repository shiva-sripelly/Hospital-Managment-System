from sqlalchemy import String, and_, cast, or_, select
from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate


def get_appointment(db: Session, appointment_id: int) -> Appointment | None:
    return db.get(Appointment, appointment_id)


def patient_exists(db: Session, patient_id: int) -> bool:
    return db.get(Patient, patient_id) is not None


def doctor_exists(db: Session, doctor_id: int) -> bool:
    return db.get(Doctor, doctor_id) is not None


def get_patient_for_appointment(db: Session, patient_id: int) -> Patient | None:
    return db.get(Patient, patient_id)


def get_doctor_for_appointment(db: Session, doctor_id: int) -> Doctor | None:
    return db.get(Doctor, doctor_id)


def find_doctor_slot(
    db: Session,
    doctor_id: int,
    appointment_date,
    appointment_time,
    exclude_appointment_id: int | None = None,
) -> Appointment | None:
    query = select(Appointment).where(
        and_(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date == appointment_date,
            Appointment.appointment_time == appointment_time,
        )
    )
    if exclude_appointment_id is not None:
        query = query.where(Appointment.id != exclude_appointment_id)
    return db.scalar(query)


def list_appointments(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
) -> list[Appointment]:
    query = (
        select(Appointment)
        .join(Patient, Appointment.patient_id == Patient.id)
        .join(Doctor, Appointment.doctor_id == Doctor.id)
        .order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc())
        .offset(skip)
        .limit(limit)
    )
    if search:
        search_term = f"%{search.strip()}%"
        query = (
            select(Appointment)
            .join(Patient, Appointment.patient_id == Patient.id)
            .join(Doctor, Appointment.doctor_id == Doctor.id)
            .where(
                or_(
                    Patient.full_name.ilike(search_term),
                    Patient.patient_code.ilike(search_term),
                    Doctor.full_name.ilike(search_term),
                    Doctor.doctor_code.ilike(search_term),
                    cast(Appointment.appointment_date, String).ilike(search_term),
                    cast(Appointment.status, String).ilike(search_term),
                )
            )
            .order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc())
            .offset(skip)
            .limit(limit)
        )
    return list(db.scalars(query))


def create_appointment(db: Session, appointment_data: AppointmentCreate) -> Appointment:
    appointment = Appointment(**appointment_data.model_dump())
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


def update_appointment(
    db: Session,
    appointment: Appointment,
    appointment_data: AppointmentUpdate,
) -> Appointment:
    for field, value in appointment_data.model_dump(exclude_unset=True).items():
        setattr(appointment, field, value)

    db.commit()
    db.refresh(appointment)
    return appointment


def delete_appointment(db: Session, appointment: Appointment) -> None:
    db.delete(appointment)
    db.commit()
