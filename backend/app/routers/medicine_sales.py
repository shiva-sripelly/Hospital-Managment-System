from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.pharmacy import MedicineSaleCreate, MedicineSaleRead
from app.services.pharmacy_service import create_sale, get_bill, get_patient, get_sale, list_sales

router = APIRouter(prefix="/medicine-sales", tags=["Pharmacy Management"], dependencies=[Depends(get_current_user)])


@router.post("", response_model=MedicineSaleRead, status_code=status.HTTP_201_CREATED)
def create_medicine_sale(data: MedicineSaleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> MedicineSaleRead:
    if current_user.role.value not in {"admin", "receptionist"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins and receptionists can create medicine sales")
    if get_patient(db, data.patient_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    if data.bill_id is not None and get_bill(db, data.bill_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")
    try:
        return create_sale(db, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("", response_model=list[MedicineSaleRead])
def read_medicine_sales(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=200), db: Session = Depends(get_db)) -> list[MedicineSaleRead]:
    return list_sales(db, skip=skip, limit=limit)


@router.get("/{sale_id}", response_model=MedicineSaleRead)
def read_medicine_sale(sale_id: int, db: Session = Depends(get_db)) -> MedicineSaleRead:
    sale = get_sale(db, sale_id)
    if sale is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine sale not found")
    return sale
