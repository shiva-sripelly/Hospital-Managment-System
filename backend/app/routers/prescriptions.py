from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.prescription import Prescription
from app.models.user import User
from app.schemas.prescription import PrescriptionCreate, PrescriptionRead, PrescriptionUpdate
from app.models.notification import NotificationType
from app.services.prescription_service import (
    create_prescription,
    delete_prescription,
    get_appointment,
    get_doctor,
    get_doctor_by_email,
    get_patient,
    get_patient_by_email,
    get_prescription,
    list_prescriptions,
    update_prescription,
)
from app.services.notification_service import create_notification_for_email

router = APIRouter(
    prefix="/prescriptions",
    tags=["Prescription Management"],
    dependencies=[Depends(get_current_user)],
)


def role_name(user: User) -> str:
    return user.role.value


def can_access_prescription(db: Session, current_user: User, prescription: Prescription) -> bool:
    role = role_name(current_user)
    if role == "admin":
        return True
    if role == "patient":
        patient = get_patient(db, prescription.patient_id)
        return patient is not None and patient.email == current_user.email
    if role == "doctor":
        doctor = get_doctor(db, prescription.doctor_id)
        return doctor is not None and doctor.email == current_user.email
    return False


def validate_prescription_references(
    db: Session,
    patient_id: int,
    doctor_id: int,
    appointment_id: int | None,
) -> None:
    if get_patient(db, patient_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    if get_doctor(db, doctor_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    if appointment_id is None:
        return
    appointment = get_appointment(db, appointment_id)
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    if appointment.patient_id != patient_id or appointment.doctor_id != doctor_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Appointment does not match the selected patient and doctor",
        )


def validate_doctor_owns_record(db: Session, current_user: User, doctor_id: int) -> None:
    if role_name(current_user) != "doctor":
        return
    doctor = get_doctor(db, doctor_id)
    if doctor is None or doctor.email != current_user.email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctors can only manage their own prescriptions",
        )


@router.post("", response_model=PrescriptionRead, status_code=status.HTTP_201_CREATED)
def create_prescription_record(
    prescription_data: PrescriptionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PrescriptionRead:
    if role_name(current_user) not in {"admin", "doctor"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and doctors can create prescriptions",
        )
    validate_prescription_references(
        db,
        prescription_data.patient_id,
        prescription_data.doctor_id,
        prescription_data.appointment_id,
    )
    validate_doctor_owns_record(db, current_user, prescription_data.doctor_id)
    prescription = create_prescription(db, prescription_data)
    patient = get_patient(db, prescription.patient_id)
    create_notification_for_email(
        db,
        patient.email if patient else None,
        "Prescription created",
        "A new prescription has been added to your medical profile.",
        NotificationType.prescription,
        background_tasks,
    )
    return prescription


@router.get("", response_model=list[PrescriptionRead])
def read_prescriptions(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    search: str | None = Query(default=None, max_length=120),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PrescriptionRead]:
    role = role_name(current_user)
    if role == "patient":
        patient = get_patient_by_email(db, current_user.email)
        if patient is None:
            return []
        return list_prescriptions(db, skip=skip, limit=limit, search=search, patient_id=patient.id)
    if role == "doctor":
        doctor = get_doctor_by_email(db, current_user.email)
        if doctor is None:
            return []
        return list_prescriptions(db, skip=skip, limit=limit, search=search, doctor_id=doctor.id)
    if role == "admin":
        return list_prescriptions(db, skip=skip, limit=limit, search=search)
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You cannot view prescriptions",
    )


@router.get("/{prescription_id}", response_model=PrescriptionRead)
def read_prescription(
    prescription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PrescriptionRead:
    prescription = get_prescription(db, prescription_id)
    if prescription is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prescription not found")
    if not can_access_prescription(db, current_user, prescription):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot view this prescription",
        )
    return prescription


@router.put("/{prescription_id}", response_model=PrescriptionRead)
def update_prescription_record(
    prescription_id: int,
    prescription_data: PrescriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PrescriptionRead:
    if role_name(current_user) not in {"admin", "doctor"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and doctors can edit prescriptions",
        )
    prescription = get_prescription(db, prescription_id)
    if prescription is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prescription not found")
    data = prescription_data.model_dump(exclude_unset=True)
    patient_id = data.get("patient_id", prescription.patient_id)
    doctor_id = data.get("doctor_id", prescription.doctor_id)
    appointment_id = data.get("appointment_id", prescription.appointment_id)
    validate_prescription_references(db, patient_id, doctor_id, appointment_id)
    validate_doctor_owns_record(db, current_user, doctor_id)
    return update_prescription(db, prescription, prescription_data)


@router.delete("/{prescription_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prescription_record(
    prescription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if role_name(current_user) != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can delete prescriptions")
    prescription = get_prescription(db, prescription_id)
    if prescription is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prescription not found")
    delete_prescription(db, prescription)
