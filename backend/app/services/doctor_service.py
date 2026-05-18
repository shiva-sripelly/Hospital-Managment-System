from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.doctor import Doctor
from app.schemas.doctor import DoctorCreate, DoctorUpdate


def generate_doctor_code(db: Session) -> str:
    latest_id = db.scalar(select(Doctor.id).order_by(Doctor.id.desc()).limit(1)) or 0
    return f"DOC-{latest_id + 1:06d}"


def get_doctor(db: Session, doctor_id: int) -> Doctor | None:
    return db.get(Doctor, doctor_id)


def find_doctor_by_unique_fields(
    db: Session,
    phone: str | None = None,
    email: str | None = None,
    doctor_code: str | None = None,
    exclude_doctor_id: int | None = None,
) -> Doctor | None:
    checks = []
    if phone:
        checks.append(Doctor.phone == phone)
    if email:
        checks.append(Doctor.email == email)
    if doctor_code:
        checks.append(Doctor.doctor_code == doctor_code)
    if not checks:
        return None

    query = select(Doctor).where(or_(*checks))
    if exclude_doctor_id is not None:
        query = query.where(Doctor.id != exclude_doctor_id)
    return db.scalar(query)


def list_doctors(db: Session, skip: int = 0, limit: int = 100, search: str | None = None) -> list[Doctor]:
    query = select(Doctor).order_by(Doctor.created_at.desc()).offset(skip).limit(limit)
    if search:
        search_term = f"%{search.strip()}%"
        query = (
            select(Doctor)
            .where(
                or_(
                    Doctor.full_name.ilike(search_term),
                    Doctor.doctor_code.ilike(search_term),
                    Doctor.specialization.ilike(search_term),
                    Doctor.phone.ilike(search_term),
                    Doctor.email.ilike(search_term),
                )
            )
            .order_by(Doctor.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
    return list(db.scalars(query))


def create_doctor(db: Session, doctor_data: DoctorCreate) -> Doctor:
    data = doctor_data.model_dump()
    if not data.get("doctor_code"):
        data["doctor_code"] = generate_doctor_code(db)

    doctor = Doctor(**data)
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


def update_doctor(db: Session, doctor: Doctor, doctor_data: DoctorUpdate) -> Doctor:
    for field, value in doctor_data.model_dump(exclude_unset=True).items():
        setattr(doctor, field, value)

    db.commit()
    db.refresh(doctor)
    return doctor


def delete_doctor(db: Session, doctor: Doctor) -> None:
    db.delete(doctor)
    db.commit()
