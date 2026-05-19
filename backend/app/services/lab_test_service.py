from sqlalchemy import String, cast, or_, select
from sqlalchemy.orm import Session

from app.models.doctor import Doctor
from app.models.lab_test import LabTest
from app.models.patient import Patient
from app.schemas.lab_test import LabTestCreate, LabTestUpdate


def get_lab_test(db: Session, lab_test_id: int) -> LabTest | None:
    return db.get(LabTest, lab_test_id)


def get_patient(db: Session, patient_id: int) -> Patient | None:
    return db.get(Patient, patient_id)


def get_patient_by_email(db: Session, email: str) -> Patient | None:
    return db.scalar(select(Patient).where(Patient.email == email))


def get_doctor(db: Session, doctor_id: int) -> Doctor | None:
    return db.get(Doctor, doctor_id)


def get_doctor_by_email(db: Session, email: str) -> Doctor | None:
    return db.scalar(select(Doctor).where(Doctor.email == email))


def list_lab_tests(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    patient_id: int | None = None,
    doctor_id: int | None = None,
) -> list[LabTest]:
    query = (
        select(LabTest)
        .join(Patient, LabTest.patient_id == Patient.id)
        .join(Doctor, LabTest.doctor_id == Doctor.id)
    )
    if patient_id is not None:
        query = query.where(LabTest.patient_id == patient_id)
    if doctor_id is not None:
        query = query.where(LabTest.doctor_id == doctor_id)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                LabTest.test_name.ilike(search_term),
                Patient.full_name.ilike(search_term),
                Patient.patient_code.ilike(search_term),
                Doctor.full_name.ilike(search_term),
                Doctor.doctor_code.ilike(search_term),
                cast(LabTest.test_status, String).ilike(search_term),
            )
        )
    query = query.order_by(LabTest.created_at.desc()).offset(skip).limit(limit)
    return list(db.scalars(query))


def create_lab_test(db: Session, lab_test_data: LabTestCreate) -> LabTest:
    lab_test = LabTest(**lab_test_data.model_dump())
    db.add(lab_test)
    db.commit()
    db.refresh(lab_test)
    return lab_test


def update_lab_test(db: Session, lab_test: LabTest, lab_test_data: LabTestUpdate) -> LabTest:
    for field, value in lab_test_data.model_dump(exclude_unset=True).items():
        setattr(lab_test, field, value)
    db.commit()
    db.refresh(lab_test)
    return lab_test


def delete_lab_test(db: Session, lab_test: LabTest) -> None:
    db.delete(lab_test)
    db.commit()
