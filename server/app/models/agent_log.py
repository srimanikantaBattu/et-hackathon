from sqlalchemy import Column, String, Integer, Float, DateTime, Enum
from sqlalchemy.sql import func
from app.database import Base
import enum


class AgentStatus(str, enum.Enum):
    idle = "idle"
    running = "running"
    completed = "completed"
    failed = "failed"
    waiting = "waiting"


class AgentLog(Base):
    __tablename__ = "agent_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    agent_name = Column(String, nullable=False)
    company_id = Column(String, nullable=True)  # None for orchestrator-level actions
    action = Column(String, nullable=False)
    details = Column(String, nullable=True)
    severity = Column(String, default="info")  # info | warning | error | success
    status = Column(String, default="completed")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AgentState(Base):
    __tablename__ = "agent_states"

    id = Column(Integer, primary_key=True, autoincrement=True)
    agent_name = Column(String, nullable=False, unique=True)
    status = Column(String, default="idle")
    current_company_id = Column(String, nullable=True)
    tasks_completed = Column(Integer, default=0)
    tasks_failed = Column(Integer, default=0)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
