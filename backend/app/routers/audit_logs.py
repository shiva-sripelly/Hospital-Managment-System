from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.audit_log import AuditLogRead
from app.services.audit_service import list_audit_logs

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[AuditLogRead])
def read_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    module_name: str | None = Query(None, max_length=80),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AuditLogRead]:
    if current_user.role.value != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can view audit logs")
    return list_audit_logs(db, skip=skip, limit=limit, module_name=module_name)
