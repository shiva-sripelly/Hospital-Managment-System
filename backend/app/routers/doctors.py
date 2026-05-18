from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.doctor import DoctorCreate, DoctorRead, DoctorUpdate
from app.services.doctor_service import (
    create_doctor,
    delete_doctor,
    find_doctor_by_unique_fields,
    get_doctor,
    list_doctors,
    update_doctor,
)

router = APIRouter(
    prefix="/doctors",
    tags=["Doctor Management"],
    dependencies=[Depends(get_current_user)],
)


@router.post("", response_model=DoctorRead, status_code=status.HTTP_201_CREATED)
def create_doctor_record(
    doctor_data: DoctorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DoctorRead:
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can add doctor records",
        )

    existing_doctor = find_doctor_by_unique_fields(
        db,
        phone=doctor_data.phone,
        email=doctor_data.email,
        doctor_code=doctor_data.doctor_code,
    )
    if existing_doctor:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A doctor with this phone, email, or doctor code already exists",
        )
    return create_doctor(db, doctor_data)


@router.get("", response_model=list[DoctorRead])
def read_doctors(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    search: str | None = Query(default=None, max_length=120),
    db: Session = Depends(get_db),
) -> list[DoctorRead]:
    return list_doctors(db, skip=skip, limit=limit, search=search)


@router.get("/{doctor_id}", response_model=DoctorRead)
def read_doctor(doctor_id: int, db: Session = Depends(get_db)) -> DoctorRead:
    doctor = get_doctor(db, doctor_id)
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    return doctor


@router.put("/{doctor_id}", response_model=DoctorRead)
def update_doctor_record(
    doctor_id: int,
    doctor_data: DoctorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DoctorRead:
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can edit doctor records",
        )

    doctor = get_doctor(db, doctor_id)
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    existing_doctor = find_doctor_by_unique_fields(
        db,
        phone=doctor_data.phone,
        email=doctor_data.email,
        doctor_code=doctor_data.doctor_code,
        exclude_doctor_id=doctor_id,
    )
    if existing_doctor:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Another doctor already uses this phone, email, or doctor code",
        )

    return update_doctor(db, doctor, doctor_data)


@router.delete("/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor_record(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete doctor records",
        )

    doctor = get_doctor(db, doctor_id)
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    delete_doctor(db, doctor)
