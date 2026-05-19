from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.medical_record import MedicalRecord
from app.models.notification import NotificationType
from app.models.user import User
from app.schemas.medical_record import MedicalRecordRead
from app.services.medical_record_service import (
    create_medical_record,
    delete_medical_record,
    get_medical_record,
    get_patient,
    get_patient_by_email,
    list_medical_records,
)
from app.services.notification_service import create_notification_for_email

router = APIRouter(
    prefix="/medical-records",
    tags=["Medical Records"],
    dependencies=[Depends(get_current_user)],
)

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "static" / "medical_records"
MAX_FILE_SIZE = 10 * 1024 * 1024


def role_name(user: User) -> str:
    return user.role.value


def can_access_record(db: Session, current_user: User, record: MedicalRecord) -> bool:
    if role_name(current_user) == "admin":
        return True
    return False


def normalize_file_type(file: UploadFile, suffix: str) -> str:
    if file.content_type:
        return file.content_type
    return suffix.lstrip(".").lower() or "unknown"


@router.post("/upload", response_model=MedicalRecordRead, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=MedicalRecordRead, status_code=status.HTTP_201_CREATED)
async def upload_medical_record(
    background_tasks: BackgroundTasks,
    patient_id: int = Query(..., ge=1),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MedicalRecordRead:
    if role_name(current_user) != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can upload medical records",
        )
    if get_patient(db, patient_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="File is required")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File must be 10 MB or less")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    original_name = Path(file.filename).name
    suffix = Path(original_name).suffix.lower()
    stored_name = f"{uuid4().hex}{suffix}"
    stored_path = UPLOAD_DIR / stored_name
    stored_path.write_bytes(content)

    record = create_medical_record(
        db,
        patient_id=patient_id,
        file_name=original_name,
        file_type=normalize_file_type(file, suffix),
        file_path=f"/static/medical_records/{stored_name}",
        uploaded_by=current_user.id,
    )
    patient = get_patient(db, patient_id)
    create_notification_for_email(
        db,
        patient.email if patient else None,
        "Medical record uploaded",
        f"A new medical record was uploaded: {record.file_name}.",
        NotificationType.medical_record,
        background_tasks,
    )
    return record


@router.get("", response_model=list[MedicalRecordRead])
def read_medical_records(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    search: str | None = Query(default=None, max_length=120),
    file_type: str | None = Query(default=None, max_length=80),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MedicalRecordRead]:
    if role_name(current_user) == "admin":
        return list_medical_records(db, skip=skip, limit=limit, search=search, file_type=file_type)
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can view medical records")


@router.get("/{record_id}", response_model=MedicalRecordRead)
def read_medical_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MedicalRecordRead:
    record = get_medical_record(db, record_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical record not found")
    if not can_access_record(db, current_user, record):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot view this medical record")
    return record


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medical_record_item(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if role_name(current_user) != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can delete medical records")
    record = get_medical_record(db, record_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical record not found")
    file_path = Path(__file__).resolve().parent.parent / Path(record.file_path.lstrip("/"))
    delete_medical_record(db, record)
    if file_path.exists() and file_path.is_file():
        file_path.unlink()
