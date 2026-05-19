from sqlalchemy import String, cast, or_, select
from sqlalchemy.orm import Session

from app.models.medical_record import MedicalRecord
from app.models.patient import Patient


def get_medical_record(db: Session, record_id: int) -> MedicalRecord | None:
    return db.get(MedicalRecord, record_id)


def get_patient(db: Session, patient_id: int) -> Patient | None:
    return db.get(Patient, patient_id)


def get_patient_by_email(db: Session, email: str) -> Patient | None:
    return db.scalar(select(Patient).where(Patient.email == email))


def list_medical_records(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    patient_id: int | None = None,
    file_type: str | None = None,
) -> list[MedicalRecord]:
    query = select(MedicalRecord).join(Patient, MedicalRecord.patient_id == Patient.id)
    if patient_id is not None:
        query = query.where(MedicalRecord.patient_id == patient_id)
    if file_type:
        query = query.where(MedicalRecord.file_type.ilike(f"%{file_type.strip()}%"))
    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                MedicalRecord.file_name.ilike(search_term),
                MedicalRecord.file_type.ilike(search_term),
                Patient.full_name.ilike(search_term),
                Patient.patient_code.ilike(search_term),
                cast(MedicalRecord.created_at, String).ilike(search_term),
            )
        )
    query = query.order_by(MedicalRecord.created_at.desc()).offset(skip).limit(limit)
    return list(db.scalars(query))


def create_medical_record(
    db: Session,
    patient_id: int,
    file_name: str,
    file_type: str,
    file_path: str,
    uploaded_by: int,
) -> MedicalRecord:
    record = MedicalRecord(
        patient_id=patient_id,
        file_name=file_name,
        file_type=file_type,
        file_path=file_path,
        uploaded_by=uploaded_by,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def delete_medical_record(db: Session, record: MedicalRecord) -> None:
    db.delete(record)
    db.commit()
