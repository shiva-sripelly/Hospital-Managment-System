from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientUpdate


def generate_patient_code(db: Session) -> str:
    latest_id = db.scalar(select(Patient.id).order_by(Patient.id.desc()).limit(1)) or 0
    return f"PAT-{latest_id + 1:06d}"


def get_patient(db: Session, patient_id: int) -> Patient | None:
    return db.get(Patient, patient_id)


def get_patient_by_code(db: Session, patient_code: str) -> Patient | None:
    return db.scalar(select(Patient).where(Patient.patient_code == patient_code))


def find_patient_by_unique_fields(
    db: Session,
    phone: str | None = None,
    email: str | None = None,
    patient_code: str | None = None,
    exclude_patient_id: int | None = None,
) -> Patient | None:
    checks = []
    if phone:
        checks.append(Patient.phone == phone)
    if email:
        checks.append(Patient.email == email)
    if patient_code:
        checks.append(Patient.patient_code == patient_code)
    if not checks:
        return None

    query = select(Patient).where(or_(*checks))
    if exclude_patient_id is not None:
        query = query.where(Patient.id != exclude_patient_id)
    return db.scalar(query)


def list_patients(db: Session, skip: int = 0, limit: int = 100, search: str | None = None) -> list[Patient]:
    query = select(Patient).order_by(Patient.created_at.desc()).offset(skip).limit(limit)
    if search:
        search_term = f"%{search.strip()}%"
        query = (
            select(Patient)
            .where(
                or_(
                    Patient.full_name.ilike(search_term),
                    Patient.patient_code.ilike(search_term),
                    Patient.phone.ilike(search_term),
                    Patient.email.ilike(search_term),
                )
            )
            .order_by(Patient.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
    return list(db.scalars(query))


def create_patient(db: Session, patient_data: PatientCreate) -> Patient:
    data = patient_data.model_dump()
    if not data.get("patient_code"):
        data["patient_code"] = generate_patient_code(db)

    patient = Patient(**data)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def update_patient(db: Session, patient: Patient, patient_data: PatientUpdate) -> Patient:
    for field, value in patient_data.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)

    db.commit()
    db.refresh(patient)
    return patient


def delete_patient(db: Session, patient: Patient) -> None:
    db.delete(patient)
    db.commit()
