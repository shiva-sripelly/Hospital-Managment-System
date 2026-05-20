from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.staff import PayrollGenerate, PayrollRead
from app.services.staff_service import generate_payroll, get_payroll, list_payroll

router = APIRouter(prefix="/payroll", tags=["Payroll Management"], dependencies=[Depends(get_current_user)])


@router.post("/generate", response_model=PayrollRead, status_code=status.HTTP_201_CREATED)
def create_payroll(data: PayrollGenerate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> PayrollRead:
    if current_user.role.value != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can generate payroll")
    try:
        return generate_payroll(db, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("", response_model=list[PayrollRead])
def read_payroll(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=200), month: str | None = Query(None, pattern=r"^\d{4}-\d{2}$"), db: Session = Depends(get_db)) -> list[PayrollRead]:
    return list_payroll(db, skip=skip, limit=limit, month=month)


@router.get("/{payroll_id}", response_model=PayrollRead)
def read_payroll_record(payroll_id: int, db: Session = Depends(get_db)) -> PayrollRead:
    payroll = get_payroll(db, payroll_id)
    if payroll is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll record not found")
    return payroll
