from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.staff import StaffCreate, StaffRead, StaffUpdate
from app.services.staff_service import (
    create_staff_member,
    delete_staff_member,
    find_staff_by_unique_fields,
    get_staff_member,
    list_staff,
    update_staff_member,
)

router = APIRouter(prefix="/staff", tags=["Staff Management"], dependencies=[Depends(get_current_user)])


def require_admin(user: User) -> None:
    if user.role.value != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can manage staff")


@router.post("", response_model=StaffRead, status_code=status.HTTP_201_CREATED)
def create_staff(data: StaffCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> StaffRead:
    require_admin(current_user)
    if find_staff_by_unique_fields(db, data.employee_code, data.phone, data.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee code, phone, or email already exists")
    return create_staff_member(db, data)


@router.get("", response_model=list[StaffRead])
def read_staff(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=200), search: str | None = Query(None, max_length=120), db: Session = Depends(get_db)) -> list[StaffRead]:
    return list_staff(db, skip=skip, limit=limit, search=search)


@router.get("/{staff_id}", response_model=StaffRead)
def read_staff_member(staff_id: int, db: Session = Depends(get_db)) -> StaffRead:
    staff = get_staff_member(db, staff_id)
    if staff is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")
    return staff


@router.put("/{staff_id}", response_model=StaffRead)
def update_staff(staff_id: int, data: StaffUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> StaffRead:
    require_admin(current_user)
    staff = get_staff_member(db, staff_id)
    if staff is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")
    if find_staff_by_unique_fields(db, data.employee_code, data.phone, data.email, exclude_id=staff_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee code, phone, or email already exists")
    return update_staff_member(db, staff, data)


@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_staff(staff_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> None:
    require_admin(current_user)
    staff = get_staff_member(db, staff_id)
    if staff is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")
    delete_staff_member(db, staff)
