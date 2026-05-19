from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.patient import PatientCreate, PatientRead, PatientUpdate
from app.services.patient_service import (
    create_patient,
    delete_patient,
    find_patient_by_unique_fields,
    get_patient,
    list_patients,
    update_patient,
)

router = APIRouter(
    prefix="/patients",
    tags=["Patient Management"],
    dependencies=[Depends(get_current_user)],
)


@router.post("", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
def create_patient_record(
    patient_data: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PatientRead:
    if current_user.role.value not in {"admin", "receptionist"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and receptionists can add patient records",
        )

    existing_patient = find_patient_by_unique_fields(
        db,
        phone=patient_data.phone,
        email=patient_data.email,
        patient_code=patient_data.patient_code,
    )
    if existing_patient:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A patient with this phone, email, or patient code already exists",
        )
    return create_patient(db, patient_data)


@router.get("", response_model=list[PatientRead])
def read_patients(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    search: str | None = Query(default=None, max_length=120),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PatientRead]:
    patients = list_patients(db, skip=skip, limit=limit, search=search)
    if current_user.role.value == "patient":
        return [patient for patient in patients if patient.email == current_user.email]
    if current_user.role.value not in {"admin", "receptionist", "doctor"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, receptionists, and doctors can view patient records",
        )
    return patients


@router.get("/{patient_id}", response_model=PatientRead)
def read_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PatientRead:
    patient = get_patient(db, patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    if current_user.role.value == "patient" and patient.email == current_user.email:
        return patient
    if current_user.role.value not in {"admin", "receptionist", "doctor"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, receptionists, and doctors can view patient records",
        )
    return patient


@router.put("/{patient_id}", response_model=PatientRead)
def update_patient_record(
    patient_id: int,
    patient_data: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PatientRead:
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can edit patient records",
        )

    patient = get_patient(db, patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    existing_patient = find_patient_by_unique_fields(
        db,
        phone=patient_data.phone,
        email=patient_data.email,
        patient_code=patient_data.patient_code,
        exclude_patient_id=patient_id,
    )
    if existing_patient:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Another patient already uses this phone, email, or patient code",
        )

    return update_patient(db, patient, patient_data)


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient_record(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete patient records",
        )

    patient = get_patient(db, patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    delete_patient(db, patient)
