from sqlalchemy import String, cast, or_, select
from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.billing import Bill
from app.models.patient import Patient
from app.schemas.billing import BillCreate, BillUpdate


def generate_bill_number(db: Session) -> str:
    latest_id = db.scalar(select(Bill.id).order_by(Bill.id.desc()).limit(1)) or 0
    return f"BILL-{latest_id + 1:06d}"


def get_bill(db: Session, bill_id: int) -> Bill | None:
    return db.get(Bill, bill_id)


def get_patient(db: Session, patient_id: int) -> Patient | None:
    return db.get(Patient, patient_id)


def get_patient_by_email(db: Session, email: str) -> Patient | None:
    return db.scalar(select(Patient).where(Patient.email == email))


def get_appointment(db: Session, appointment_id: int) -> Appointment | None:
    return db.get(Appointment, appointment_id)


def find_bill_by_number(db: Session, bill_number: str | None, exclude_bill_id: int | None = None) -> Bill | None:
    if not bill_number:
        return None
    query = select(Bill).where(Bill.bill_number == bill_number)
    if exclude_bill_id is not None:
        query = query.where(Bill.id != exclude_bill_id)
    return db.scalar(query)


def list_bills(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    patient_id: int | None = None,
) -> list[Bill]:
    query = (
        select(Bill)
        .join(Patient, Bill.patient_id == Patient.id)
    )
    if patient_id is not None:
        query = query.where(Bill.patient_id == patient_id)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Bill.bill_number.ilike(search_term),
                Patient.full_name.ilike(search_term),
                Patient.patient_code.ilike(search_term),
                cast(Bill.payment_status, String).ilike(search_term),
            )
        )
    query = query.order_by(Bill.created_at.desc()).offset(skip).limit(limit)
    return list(db.scalars(query))


def create_bill(db: Session, bill_data: BillCreate) -> Bill:
    data = bill_data.model_dump()
    if not data.get("bill_number"):
        data["bill_number"] = generate_bill_number(db)
    if data.get("total_amount") is None:
        data["total_amount"] = data["consultation_fee"] + data["lab_fee"] + data["medicine_fee"]
    bill = Bill(**data)
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill


def update_bill(db: Session, bill: Bill, bill_data: BillUpdate) -> Bill:
    data = bill_data.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(bill, field, value)

    if "total_amount" not in data:
        bill.total_amount = bill.consultation_fee + bill.lab_fee + bill.medicine_fee

    db.commit()
    db.refresh(bill)
    return bill


def delete_bill(db: Session, bill: Bill) -> None:
    db.delete(bill)
    db.commit()
