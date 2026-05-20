from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.staff import Payroll, Staff
from app.schemas.staff import PayrollGenerate, StaffCreate, StaffUpdate


def generate_employee_code(db: Session) -> str:
    latest_id = db.scalar(select(Staff.id).order_by(Staff.id.desc()).limit(1)) or 0
    return f"EMP-{latest_id + 1:06d}"


def get_staff_member(db: Session, staff_id: int) -> Staff | None:
    return db.get(Staff, staff_id)


def find_staff_by_unique_fields(
    db: Session,
    employee_code: str | None = None,
    phone: str | None = None,
    email: str | None = None,
    exclude_id: int | None = None,
) -> Staff | None:
    checks = []
    if employee_code:
        checks.append(Staff.employee_code == employee_code)
    if phone:
        checks.append(Staff.phone == phone)
    if email:
        checks.append(Staff.email == email)
    if not checks:
        return None
    query = select(Staff).where(or_(*checks))
    if exclude_id is not None:
        query = query.where(Staff.id != exclude_id)
    return db.scalar(query)


def list_staff(db: Session, skip: int = 0, limit: int = 100, search: str | None = None) -> list[Staff]:
    query = select(Staff)
    if search:
        term = f"%{search.strip()}%"
        query = query.where(or_(
            Staff.employee_code.ilike(term),
            Staff.full_name.ilike(term),
            Staff.role.ilike(term),
            Staff.department.ilike(term),
            Staff.phone.ilike(term),
            Staff.email.ilike(term),
        ))
    return list(db.scalars(query.order_by(Staff.full_name.asc()).offset(skip).limit(limit)))


def create_staff_member(db: Session, data: StaffCreate) -> Staff:
    payload = data.model_dump()
    if not payload.get("employee_code"):
        payload["employee_code"] = generate_employee_code(db)
    staff = Staff(**payload)
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff


def update_staff_member(db: Session, staff: Staff, data: StaffUpdate) -> Staff:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(staff, field, value)
    db.commit()
    db.refresh(staff)
    return staff


def delete_staff_member(db: Session, staff: Staff) -> None:
    db.delete(staff)
    db.commit()


def generate_payroll(db: Session, data: PayrollGenerate) -> Payroll:
    staff = get_staff_member(db, data.employee_id)
    if staff is None:
        raise ValueError("Staff member not found")
    final_salary = staff.salary + data.bonus - data.deductions
    payroll = Payroll(
        employee_id=staff.id,
        month=data.month,
        basic_salary=staff.salary,
        bonus=data.bonus,
        deductions=data.deductions,
        final_salary=final_salary,
        payment_status=data.payment_status,
    )
    db.add(payroll)
    db.commit()
    db.refresh(payroll)
    return payroll


def get_payroll(db: Session, payroll_id: int) -> Payroll | None:
    return db.get(Payroll, payroll_id)


def list_payroll(db: Session, skip: int = 0, limit: int = 100, month: str | None = None) -> list[Payroll]:
    query = select(Payroll)
    if month:
        query = query.where(Payroll.month == month)
    return list(db.scalars(query.order_by(Payroll.generated_at.desc()).offset(skip).limit(limit)))
