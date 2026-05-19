from io import BytesIO

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.billing import Bill
from app.models.user import User
from app.schemas.billing import BillCreate, BillRead, BillUpdate
from app.services.billing_service import (
    create_bill,
    delete_bill,
    find_bill_by_number,
    get_appointment,
    get_bill,
    get_patient,
    get_patient_by_email,
    list_bills,
    update_bill,
)
from app.models.notification import NotificationType
from app.services.notification_service import create_notification_for_email

router = APIRouter(
    prefix="/billing",
    tags=["Billing Management"],
    dependencies=[Depends(get_current_user)],
)


def role_name(user: User) -> str:
    return user.role.value


def can_access_bill(db: Session, current_user: User, bill: Bill) -> bool:
    if role_name(current_user) in {"admin", "receptionist"}:
        return True
    patient = get_patient(db, bill.patient_id)
    return role_name(current_user) == "patient" and patient is not None and patient.email == current_user.email


def validate_bill_references(db: Session, patient_id: int, appointment_id: int | None) -> None:
    if get_patient(db, patient_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    if appointment_id is None:
        return
    appointment = get_appointment(db, appointment_id)
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    if appointment.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Appointment does not belong to the selected patient",
        )


@router.post("", response_model=BillRead, status_code=status.HTTP_201_CREATED)
def create_bill_record(
    bill_data: BillCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BillRead:
    if role_name(current_user) not in {"admin", "receptionist"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and receptionists can create bills",
        )
    validate_bill_references(db, bill_data.patient_id, bill_data.appointment_id)
    if find_bill_by_number(db, bill_data.bill_number):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bill number already exists")
    bill = create_bill(db, bill_data)
    patient = get_patient(db, bill.patient_id)
    create_notification_for_email(
        db,
        patient.email if patient else None,
        "New bill generated",
        f"Bill {bill.bill_number} for amount {bill.total_amount} has been generated.",
        NotificationType.billing,
        background_tasks,
    )
    return bill


@router.get("", response_model=list[BillRead])
def read_bills(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    search: str | None = Query(default=None, max_length=120),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[BillRead]:
    if role_name(current_user) == "patient":
        patient = get_patient_by_email(db, current_user.email)
        if patient is None:
            return []
        return list_bills(db, skip=skip, limit=limit, search=search, patient_id=patient.id)
    if role_name(current_user) in {"admin", "receptionist"}:
        return list_bills(db, skip=skip, limit=limit, search=search)
    return []


@router.get("/{bill_id}", response_model=BillRead)
def read_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BillRead:
    bill = get_bill(db, bill_id)
    if bill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")
    if not can_access_bill(db, current_user, bill):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot view this bill")
    return bill


@router.put("/{bill_id}", response_model=BillRead)
def update_bill_record(
    bill_id: int,
    bill_data: BillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BillRead:
    if role_name(current_user) not in {"admin", "receptionist"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and receptionists can edit bills",
        )
    bill = get_bill(db, bill_id)
    if bill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")
    data = bill_data.model_dump(exclude_unset=True)
    patient_id = data.get("patient_id", bill.patient_id)
    appointment_id = data.get("appointment_id", bill.appointment_id)
    validate_bill_references(db, patient_id, appointment_id)
    if find_bill_by_number(db, bill_data.bill_number, exclude_bill_id=bill_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bill number already exists")
    return update_bill(db, bill, bill_data)


@router.delete("/{bill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bill_record(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if role_name(current_user) != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can delete bills")
    bill = get_bill(db, bill_id)
    if bill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")
    delete_bill(db, bill)


@router.get("/{bill_id}/invoice")
def download_bill_invoice(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    bill = get_bill(db, bill_id)
    if bill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")
    if not can_access_bill(db, current_user, bill):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot view this bill")

    patient = get_patient(db, bill.patient_id)
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(72, height - 72, "Hospital Management System")
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(72, height - 105, f"Invoice {bill.bill_number}")
    pdf.setFont("Helvetica", 11)
    pdf.drawString(72, height - 135, f"Patient: {patient.full_name if patient else bill.patient_id}")
    pdf.drawString(72, height - 155, f"Created: {bill.created_at.date()}")
    pdf.drawString(72, height - 185, f"Consultation Fee: INR {bill.consultation_fee}")
    pdf.drawString(72, height - 205, f"Lab Fee: INR {bill.lab_fee}")
    pdf.drawString(72, height - 225, f"Medicine Fee: INR {bill.medicine_fee}")
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(72, height - 260, f"Total Amount: INR {bill.total_amount}")
    pdf.drawString(72, height - 280, f"Payment Status: {bill.payment_status.value.title()}")
    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{bill.bill_number}.pdf"'},
    )


bills_router = APIRouter(
    prefix="/bills",
    tags=["Billing Management"],
    dependencies=[Depends(get_current_user)],
)
bills_router.add_api_route("", create_bill_record, methods=["POST"], response_model=BillRead, status_code=status.HTTP_201_CREATED)
bills_router.add_api_route("", read_bills, methods=["GET"], response_model=list[BillRead])
bills_router.add_api_route("/{bill_id}", read_bill, methods=["GET"], response_model=BillRead)
bills_router.add_api_route("/{bill_id}", update_bill_record, methods=["PUT"], response_model=BillRead)
bills_router.add_api_route("/{bill_id}", delete_bill_record, methods=["DELETE"], status_code=status.HTTP_204_NO_CONTENT)
bills_router.add_api_route("/{bill_id}/invoice", download_bill_invoice, methods=["GET"])
