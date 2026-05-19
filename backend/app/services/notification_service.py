from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.background import BackgroundTasks

from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.services.notification_ws import notification_manager, notification_payload


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: NotificationType = NotificationType.info,
    background_tasks: BackgroundTasks | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    if background_tasks is not None:
        background_tasks.add_task(
            notification_manager.send_to_user,
            notification.user_id,
            notification_payload(notification),
        )
    return notification


def create_notification_for_email(
    db: Session,
    email: str | None,
    title: str,
    message: str,
    notification_type: NotificationType = NotificationType.info,
    background_tasks: BackgroundTasks | None = None,
) -> Notification | None:
    if not email:
        return None
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        return None
    return create_notification(db, user.id, title, message, notification_type, background_tasks)


def list_notifications(db: Session, user_id: int, skip: int = 0, limit: int = 50) -> list[Notification]:
    query = (
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(db.scalars(query))


def get_notification(db: Session, notification_id: int) -> Notification | None:
    return db.get(Notification, notification_id)


def mark_notification_read(db: Session, notification: Notification) -> Notification:
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification
