from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.pharmacy import InventoryLogCreate, InventoryLogRead, MedicineRead
from app.services.pharmacy_service import create_inventory_log, list_inventory_logs, list_low_stock

router = APIRouter(prefix="/inventory", tags=["Inventory Management"], dependencies=[Depends(get_current_user)])


@router.get("/logs", response_model=list[InventoryLogRead])
def read_inventory_logs(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=200), db: Session = Depends(get_db)) -> list[InventoryLogRead]:
    return list_inventory_logs(db, skip=skip, limit=limit)


@router.post("/logs", response_model=InventoryLogRead, status_code=status.HTTP_201_CREATED)
def create_log(data: InventoryLogCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> InventoryLogRead:
    if current_user.role.value not in {"admin", "receptionist"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins and receptionists can update inventory")
    try:
        return create_inventory_log(db, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/low-stock", response_model=list[MedicineRead])
def read_low_stock(threshold: int = Query(10, ge=0, le=1000), db: Session = Depends(get_db)) -> list[MedicineRead]:
    return list_low_stock(db, threshold=threshold)
