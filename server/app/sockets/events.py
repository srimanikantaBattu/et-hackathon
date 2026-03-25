"""
Socket.io server events for real-time agent activity streaming.
Agents call `emit_agent_event` to push updates to connected clients.
"""
import socketio
import logging

logger = logging.getLogger(__name__)

# Async Socket.io server (compatible with FastAPI/ASGI)
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)


@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    await sio.emit("connected", {"message": "Connected to PE Firm Agent Feed"}, to=sid)


@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")


async def emit_agent_event(log_entry):
    """
    Emit an agent_update event to ALL connected clients.
    Called by agents after logging an action.
    """
    payload = {
        "id": log_entry.id,
        "agent_name": log_entry.agent_name,
        "company_id": log_entry.company_id,
        "action": log_entry.action,
        "details": log_entry.details,
        "severity": log_entry.severity,
        "status": log_entry.status,
        "created_at": log_entry.created_at.isoformat() if log_entry.created_at else None,
    }
    await sio.emit("agent_update", payload)
    logger.debug(f"Socket event emitted: {payload['agent_name']} - {payload['action']}")


@sio.event
async def subscribe_company(sid, data):
    """Allow client to subscribe to events for a specific company."""
    company_id = data.get("company_id")
    if company_id:
        await sio.enter_room(sid, f"company_{company_id}")
        await sio.emit("subscribed", {"company_id": company_id}, to=sid)
