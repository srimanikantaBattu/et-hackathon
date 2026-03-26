"""
FastAPI main application entry point.
Mounts all routers, integrates Socket.io for real-time agent events, and initialises the DB.
"""
import logging
import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import companies, agents, financials, workflow, reports
from app.sockets.events import sio

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")
logger = logging.getLogger(__name__)

# ── FastAPI app ──────────────────────────────────────────────────
fastapi_app = FastAPI(
    title=settings.APP_NAME,
    description="Autonomous multi-agent platform for month-end close orchestration across 8 PE portfolio companies.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ─────────────────────────────────────────────
fastapi_app.include_router(companies.router)
fastapi_app.include_router(agents.router)
fastapi_app.include_router(financials.router)
fastapi_app.include_router(workflow.router)
fastapi_app.include_router(reports.router)


@fastapi_app.on_event("startup")
async def on_startup():
    logger.info("🚀 PE Firm Month-End Close Platform starting up...")
    init_db()
    logger.info("✅ Database tables verified")


@fastapi_app.get("/health")
def health_check():
    return {"status": "healthy", "service": settings.APP_NAME}


# ── Wrap with Socket.io ASGI app ─────────────────────────────────
# python-socketio wraps the FastAPI ASGI app for real-time WebSocket support
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)
