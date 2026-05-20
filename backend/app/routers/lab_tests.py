from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.lab_test import LabTest
from app.models.notification import NotificationType
from app.models.user import User
from app.schemas.lab_test import LabTestCreate, LabTestRead, LabTestUpdate
from app.services.lab_test_service import (
    create_lab_test,
    delete_lab_test,
    get_doctor,
    get_doctor_by_email,
    get_lab_test,
    get_patient,
    get_patient_by_email,
    list_lab_tests,
    update_lab_test,
)
from app.services.notification_service import create_notification_for_email

router = APIRouter(
    prefix="/lab-tests",
    tags=["Laboratory Management"],
    dependencies=[Depends(get_current_user)],
)

LAB_REPORT_DIR = Path(__file__).resolve().parent.parent / "static" / "lab_reports"
ALLOWED_LAB_REPORT_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
MAX_LAB_REPORT_SIZE = 10 * 1024 * 1024


def role_name(user: User) -> str:
    return user.role.value


def can_access_lab_test(db: Session, current_user: User, lab_test: LabTest) -> bool:
    role = role_name(current_user)
    if role in {"admin", "lab_technician"}:
        return True
    if role == "doctor":
        doctor = get_doctor(db, lab_test.doctor_id)
        return doctor is not None and doctor.email == current_user.email
    if role == "patient":
        patient = get_patient(db, lab_test.patient_id)
        return patient is not None and patient.email == current_user.email
    return False


def validate_lab_test_references(db: Session, patient_id: int, doctor_id: int) -> None:
    if get_patient(db, patient_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    if get_doctor(db, doctor_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")


def validate_doctor_owns_request(db: Session, current_user: User, doctor_id: int) -> None:
    if role_name(current_user) != "doctor":
        return
    doctor = get_doctor(db, doctor_id)
    if doctor is None or doctor.email != current_user.email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctors can only manage their own lab requests",
        )


@router.post("", response_model=LabTestRead, status_code=status.HTTP_201_CREATED)
def create_lab_test_record(
    lab_test_data: LabTestCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LabTestRead:
    if role_name(current_user) not in {"admin", "doctor"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and doctors can create lab requests",
    )
    validate_lab_test_references(db, lab_test_data.patient_id, lab_test_data.doctor_id)
    validate_doctor_owns_request(db, current_user, lab_test_data.doctor_id)
    lab_test = create_lab_test(db, lab_test_data)
    patient = get_patient(db, lab_test.patient_id)
    create_notification_for_email(
        db,
        patient.email if patient else None,
        "Lab test requested",
        f"Your {lab_test.test_name} lab test has been requested.",
        NotificationType.lab,
        background_tasks,
    )
    return lab_test


@router.get("", response_model=list[LabTestRead])
def read_lab_tests(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    search: str | None = Query(default=None, max_length=120),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[LabTestRead]:
    role = role_name(current_user)
    if role == "doctor":
        doctor = get_doctor_by_email(db, current_user.email)
        if doctor is None:
            return []
        return list_lab_tests(db, skip=skip, limit=limit, search=search, doctor_id=doctor.id)
    if role == "patient":
        patient = get_patient_by_email(db, current_user.email)
        if patient is None:
            return []
        return list_lab_tests(db, skip=skip, limit=limit, search=search, patient_id=patient.id)
    if role in {"admin", "lab_technician"}:
        return list_lab_tests(db, skip=skip, limit=limit, search=search)
    return []


@router.get("/{lab_test_id}", response_model=LabTestRead)
def read_lab_test(
    lab_test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LabTestRead:
    lab_test = get_lab_test(db, lab_test_id)
    if lab_test is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab test not found")
    if not can_access_lab_test(db, current_user, lab_test):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot view this lab test")
    return lab_test


@router.put("/{lab_test_id}", response_model=LabTestRead)
def update_lab_test_record(
    lab_test_id: int,
    lab_test_data: LabTestUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LabTestRead:
    role = role_name(current_user)
    if role not in {"admin", "doctor", "lab_technician"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot edit lab tests")
    lab_test = get_lab_test(db, lab_test_id)
    if lab_test is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab test not found")
    if not can_access_lab_test(db, current_user, lab_test):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot edit this lab test")

    data = lab_test_data.model_dump(exclude_unset=True)
    if role == "lab_technician":
        blocked_fields = set(data) - {"test_status", "report_file", "remarks"}
        if blocked_fields:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Lab technicians can only update status, report file, and remarks",
            )
    if role == "doctor":
        blocked_fields = set(data) - {"test_name", "remarks"}
        if blocked_fields:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Doctors can only update test name and remarks",
            )

    patient_id = data.get("patient_id", lab_test.patient_id)
    doctor_id = data.get("doctor_id", lab_test.doctor_id)
    validate_lab_test_references(db, patient_id, doctor_id)
    validate_doctor_owns_request(db, current_user, doctor_id)
    lab_test = update_lab_test(db, lab_test, lab_test_data)
    if "test_status" in data or "report_file" in data:
        patient = get_patient(db, lab_test.patient_id)
        create_notification_for_email(
            db,
            patient.email if patient else None,
            "Lab report updated",
            f"Your {lab_test.test_name} status is now {lab_test.test_status.value.replace('_', ' ')}.",
            NotificationType.lab,
            background_tasks,
        )
    return lab_test


@router.post("/{lab_test_id}/report-file", response_model=LabTestRead)
async def upload_lab_report_file(
    lab_test_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    remarks: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LabTestRead:
    if role_name(current_user) not in {"admin", "lab_technician"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins and lab technicians can upload lab reports")

    lab_test = get_lab_test(db, lab_test_id)
    if lab_test is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab test not found")
    if not can_access_lab_test(db, current_user, lab_test):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot upload this lab report")
    if file.content_type not in ALLOWED_LAB_REPORT_TYPES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Report file must be a PDF, JPG, PNG, or WebP file")
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="File is required")

    content = await file.read()
    if len(content) > MAX_LAB_REPORT_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Report file must be 10 MB or less")

    LAB_REPORT_DIR.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename).suffix.lower()
    stored_name = f"{uuid4().hex}{suffix}"
    stored_path = LAB_REPORT_DIR / stored_name
    stored_path.write_bytes(content)

    lab_test.report_file = f"/static/lab_reports/{stored_name}"
    lab_test.remarks = remarks or lab_test.remarks
    db.commit()
    db.refresh(lab_test)

    patient = get_patient(db, lab_test.patient_id)
    create_notification_for_email(
        db,
        patient.email if patient else None,
        "Lab report uploaded",
        f"Your {lab_test.test_name} lab report has been uploaded.",
        NotificationType.lab,
        background_tasks,
    )
    return lab_test


@router.delete("/{lab_test_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lab_test_record(
    lab_test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if role_name(current_user) != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can delete lab tests")
    lab_test = get_lab_test(db, lab_test_id)
    if lab_test is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab test not found")
    delete_lab_test(db, lab_test)
