from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def create_audit_log(
    db: Session,
    action: str,
    module_name: str,
    description: str | None = None,
    user_id: int | None = None,
) -> AuditLog:
    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        module_name=module_name,
        description=description,
    )
    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)
    return audit_log


def list_audit_logs(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    module_name: str | None = None,
) -> list[AuditLog]:
    query = select(AuditLog)
    if module_name:
        query = query.where(AuditLog.module_name.ilike(f"%{module_name.strip()}%"))
    return list(db.scalars(query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)))
