from datetime import date, datetime, time

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.appointment import Appointment
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentRead, AppointmentUpdate
from app.services.appointment_service import (
    create_appointment,
    delete_appointment,
    doctor_exists,
    find_doctor_slot,
    get_appointment,
    get_doctor_by_email,
    get_doctor_for_appointment,
    get_patient_by_email,
    get_patient_for_appointment,
    list_appointments,
    patient_exists,
    update_appointment,
)
from app.services.email_service import send_notification_email

router = APIRouter(
    prefix="/appointments",
    tags=["Appointment Management"],
    dependencies=[Depends(get_current_user)],
)


def validate_appointment_references(db: Session, patient_id: int, doctor_id: int) -> None:
    if not patient_exists(db, patient_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    if not doctor_exists(db, doctor_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")


def validate_appointment_schedule(appointment_date: date, appointment_time: time) -> None:
    today = date.today()
    now = datetime.now().time().replace(second=0, microsecond=0)
    normalized_time = appointment_time.replace(second=0, microsecond=0)

    if appointment_date < today:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Appointment date cannot be in the past",
        )
    if appointment_date == today and normalized_time < now:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Appointment time cannot be in the past",
        )


def role_name(user: User) -> str:
    return user.role.value


def can_access_appointment(db: Session, current_user: User, appointment: Appointment) -> bool:
    role = role_name(current_user)
    if role in {"admin", "receptionist"}:
        return True

    if role == "patient":
        patient = get_patient_for_appointment(db, appointment.patient_id)
        return patient is not None and patient.email == current_user.email

    return False


@router.post("", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED)
def create_appointment_record(
    appointment_data: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AppointmentRead:
    if role_name(current_user) not in {"admin", "receptionist", "patient"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, receptionists, and patients can create appointments",
        )

    validate_appointment_references(db, appointment_data.patient_id, appointment_data.doctor_id)
    if role_name(current_user) == "patient":
        patient = get_patient_for_appointment(db, appointment_data.patient_id)
        if patient is None or patient.email != current_user.email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Patients can only book appointments for their own profile",
            )

    validate_appointment_schedule(appointment_data.appointment_date, appointment_data.appointment_time)

    existing_slot = find_doctor_slot(
        db,
        appointment_data.doctor_id,
        appointment_data.appointment_date,
        appointment_data.appointment_time,
    )
    if existing_slot:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Doctor already has an appointment at this date and time",
        )
    appointment = create_appointment(db, appointment_data)
    patient = get_patient_for_appointment(db, appointment.patient_id)
    doctor = get_doctor_for_appointment(db, appointment.doctor_id)
    if patient and patient.email:
        send_notification_email(
            patient.email,
            "Your appointment has been booked",
            (
                f"Dear {patient.full_name},\n\n"
                f"Your appointment with {doctor.full_name if doctor else 'the doctor'} has been booked successfully.\n\n"
                f"Appointment date: {appointment.appointment_date}\n"
                f"Appointment time: {appointment.appointment_time}\n"
                f"Status: {appointment.status.value.title()}\n\n"
                "Please arrive a few minutes before your scheduled time and carry any relevant medical documents."
            ),
        )
    if doctor:
        send_notification_email(
            doctor.email,
            "New patient appointment assigned",
            (
                f"Dear {doctor.full_name},\n\n"
                f"A new appointment has been booked with {patient.full_name if patient else 'a patient'}.\n\n"
                f"Appointment date: {appointment.appointment_date}\n"
                f"Appointment time: {appointment.appointment_time}\n"
                f"Status: {appointment.status.value.title()}"
            ),
        )
    return appointment


@router.get("", response_model=list[AppointmentRead])
def read_appointments(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    search: str | None = Query(default=None, max_length=120),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AppointmentRead]:
    role = role_name(current_user)
    if role == "patient":
        patient = get_patient_by_email(db, current_user.email)
        if patient is None:
            return []
        return list_appointments(db, skip=skip, limit=limit, search=search, patient_id=patient.id)
    if role in {"admin", "receptionist"}:
        return list_appointments(db, skip=skip, limit=limit, search=search)
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot view appointments")


@router.get("/{appointment_id}", response_model=AppointmentRead)
def read_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AppointmentRead:
    appointment = get_appointment(db, appointment_id)
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    if not can_access_appointment(db, current_user, appointment):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot view this appointment",
        )
    return appointment


@router.put("/{appointment_id}", response_model=AppointmentRead)
def update_appointment_record(
    appointment_id: int,
    appointment_data: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AppointmentRead:
    appointment = get_appointment(db, appointment_id)
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    data = appointment_data.model_dump(exclude_unset=True)
    role = role_name(current_user)
    if role not in {"admin", "receptionist"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and receptionists can edit appointments",
        )

    patient_id = data.get("patient_id", appointment.patient_id)
    doctor_id = data.get("doctor_id", appointment.doctor_id)
    appointment_date = data.get("appointment_date", appointment.appointment_date)
    appointment_time = data.get("appointment_time", appointment.appointment_time)

    validate_appointment_references(db, patient_id, doctor_id)
    validate_appointment_schedule(appointment_date, appointment_time)
    existing_slot = find_doctor_slot(
        db,
        doctor_id,
        appointment_date,
        appointment_time,
        exclude_appointment_id=appointment_id,
    )
    if existing_slot:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Doctor already has an appointment at this date and time",
        )

    return update_appointment(db, appointment, appointment_data)


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment_record(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if role_name(current_user) != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete appointments",
        )

    appointment = get_appointment(db, appointment_id)
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    delete_appointment(db, appointment)
