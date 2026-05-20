from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.pharmacy import MedicineCreate, MedicineRead, MedicineUpdate
from app.services.pharmacy_service import (
    create_medicine,
    delete_medicine,
    find_medicine_by_code,
    get_medicine,
    list_medicines,
    update_medicine,
)

router = APIRouter(prefix="/medicines", tags=["Pharmacy Management"], dependencies=[Depends(get_current_user)])


def require_pharmacy_access(user: User) -> None:
    if user.role.value not in {"admin", "receptionist"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins and receptionists can manage medicines")


@router.post("", response_model=MedicineRead, status_code=status.HTTP_201_CREATED)
def create_medicine_record(data: MedicineCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> MedicineRead:
    require_pharmacy_access(current_user)
    if find_medicine_by_code(db, data.medicine_code):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Medicine code already exists")
    try:
        return create_medicine(db, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("", response_model=list[MedicineRead])
def read_medicines(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=200), search: str | None = Query(None, max_length=120), db: Session = Depends(get_db)) -> list[MedicineRead]:
    return list_medicines(db, skip=skip, limit=limit, search=search)


@router.get("/{medicine_id}", response_model=MedicineRead)
def read_medicine(medicine_id: int, db: Session = Depends(get_db)) -> MedicineRead:
    medicine = get_medicine(db, medicine_id)
    if medicine is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found")
    return medicine


@router.put("/{medicine_id}", response_model=MedicineRead)
def update_medicine_record(medicine_id: int, data: MedicineUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> MedicineRead:
    require_pharmacy_access(current_user)
    medicine = get_medicine(db, medicine_id)
    if medicine is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found")
    if find_medicine_by_code(db, data.medicine_code, exclude_id=medicine_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Medicine code already exists")
    try:
        return update_medicine(db, medicine, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.delete("/{medicine_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medicine_record(medicine_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> None:
    if current_user.role.value != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can delete medicines")
    medicine = get_medicine(db, medicine_id)
    if medicine is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found")
    delete_medicine(db, medicine)
