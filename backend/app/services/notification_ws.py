from fastapi import WebSocket

from app.models.notification import Notification


def notification_payload(notification: Notification) -> dict:
    return {
        "id": notification.id,
        "user_id": notification.user_id,
        "title": notification.title,
        "message": notification.message,
        "notification_type": notification.notification_type.value,
        "is_read": notification.is_read,
        "created_at": notification.created_at.isoformat(),
    }


class NotificationConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept(subprotocol="hms-notifications")
        self.active_connections.setdefault(user_id, []).append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        connections = self.active_connections.get(user_id, [])
        if websocket in connections:
            connections.remove(websocket)
        if not connections and user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_to_user(self, user_id: int, payload: dict) -> None:
        stale_connections = []
        for websocket in self.active_connections.get(user_id, []):
            try:
                await websocket.send_json(payload)
            except RuntimeError:
                stale_connections.append(websocket)

        for websocket in stale_connections:
            self.disconnect(user_id, websocket)


notification_manager = NotificationConnectionManager()
