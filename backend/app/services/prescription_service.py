from sqlalchemy import String, cast, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.prescription import Prescription, PrescriptionItem
from app.schemas.prescription import PrescriptionCreate, PrescriptionUpdate


def get_prescription(db: Session, prescription_id: int) -> Prescription | None:
    return db.scalar(
        select(Prescription)
        .options(selectinload(Prescription.items))
        .where(Prescription.id == prescription_id)
    )


def get_patient(db: Session, patient_id: int) -> Patient | None:
    return db.get(Patient, patient_id)


def get_patient_by_email(db: Session, email: str) -> Patient | None:
    return db.scalar(select(Patient).where(Patient.email == email))


def get_doctor(db: Session, doctor_id: int) -> Doctor | None:
    return db.get(Doctor, doctor_id)


def get_doctor_by_email(db: Session, email: str) -> Doctor | None:
    return db.scalar(select(Doctor).where(Doctor.email == email))


def get_appointment(db: Session, appointment_id: int) -> Appointment | None:
    return db.get(Appointment, appointment_id)


def list_prescriptions(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    patient_id: int | None = None,
    doctor_id: int | None = None,
) -> list[Prescription]:
    query = (
        select(Prescription)
        .options(selectinload(Prescription.items))
        .join(Patient, Prescription.patient_id == Patient.id)
        .join(Doctor, Prescription.doctor_id == Doctor.id)
    )
    if patient_id is not None:
        query = query.where(Prescription.patient_id == patient_id)
    if doctor_id is not None:
        query = query.where(Prescription.doctor_id == doctor_id)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Patient.full_name.ilike(search_term),
                Patient.patient_code.ilike(search_term),
                Doctor.full_name.ilike(search_term),
                Doctor.doctor_code.ilike(search_term),
                Prescription.diagnosis.ilike(search_term),
                cast(Prescription.created_at, String).ilike(search_term),
            )
        )
    query = query.order_by(Prescription.created_at.desc()).offset(skip).limit(limit)
    return list(db.scalars(query))


def create_prescription(db: Session, prescription_data: PrescriptionCreate) -> Prescription:
    data = prescription_data.model_dump()
    item_data = data.pop("items")
    prescription = Prescription(**data)
    prescription.items = [PrescriptionItem(**item) for item in item_data]
    db.add(prescription)
    db.commit()
    db.refresh(prescription)
    return get_prescription(db, prescription.id) or prescription


def update_prescription(
    db: Session,
    prescription: Prescription,
    prescription_data: PrescriptionUpdate,
) -> Prescription:
    data = prescription_data.model_dump(exclude_unset=True)
    item_data = data.pop("items", None)
    for field, value in data.items():
        setattr(prescription, field, value)

    if item_data is not None:
        prescription.items = [PrescriptionItem(**item) for item in item_data]

    db.commit()
    db.refresh(prescription)
    return get_prescription(db, prescription.id) or prescription


def delete_prescription(db: Session, prescription: Prescription) -> None:
    db.delete(prescription)
    db.commit()
