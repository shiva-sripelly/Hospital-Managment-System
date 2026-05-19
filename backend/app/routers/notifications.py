from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.notification import NotificationRead
from app.services.notification_service import get_notification, list_notifications, mark_notification_read
from app.services.auth_service import get_user_by_id
from app.services.notification_ws import notification_manager
from app.utils.security import decode_access_token

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


@router.get("", response_model=list[NotificationRead])
def read_notifications(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[NotificationRead]:
    return list_notifications(db, current_user.id, skip=skip, limit=limit)


@router.put("/read/{notification_id}", response_model=NotificationRead)
def read_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationRead:
    notification = get_notification(db, notification_id)
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot update this notification")
    return mark_notification_read(db, notification)


@router.websocket("/ws")
async def notifications_websocket(
    websocket: WebSocket,
    db: Session = Depends(get_db),
) -> None:
    protocols = [
        protocol.strip()
        for protocol in websocket.headers.get("sec-websocket-protocol", "").split(",")
        if protocol.strip()
    ]
    token = next((protocol for protocol in protocols if protocol != "hms-notifications"), None)
    if token is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    payload = decode_access_token(token)
    if payload is None or payload.get("sub") is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user = get_user_by_id(db, int(payload["sub"]))
    if user is None or not user.is_active:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await notification_manager.connect(user.id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        notification_manager.disconnect(user.id, websocket)
