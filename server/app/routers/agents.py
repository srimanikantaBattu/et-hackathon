from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.agent_log import AgentLog, AgentState

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("/status")
def get_agent_status(db: Session = Depends(get_db)):
    states = db.query(AgentState).all()
    return [
        {
            "agent_name": s.agent_name,
            "status": s.status,
            "current_company_id": s.current_company_id,
            "tasks_completed": s.tasks_completed,
            "tasks_failed": s.tasks_failed,
            "last_run_at": s.last_run_at.isoformat() if s.last_run_at else None,
        }
        for s in states
    ]


@router.get("/logs")
def get_agent_logs(
    agent_name: str = Query(None),
    company_id: str = Query(None),
    severity: str = Query(None),
    limit: int = Query(100),
    db: Session = Depends(get_db),
):
    query = db.query(AgentLog)
    if agent_name:
        query = query.filter(AgentLog.agent_name == agent_name)
    if company_id:
        query = query.filter(AgentLog.company_id == company_id)
    if severity:
        query = query.filter(AgentLog.severity == severity)
    logs = query.order_by(desc(AgentLog.created_at)).limit(limit).all()
    return [
        {
            "id": l.id,
            "agent_name": l.agent_name,
            "company_id": l.company_id,
            "action": l.action,
            "details": l.details,
            "severity": l.severity,
            "status": l.status,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]
