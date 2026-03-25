# Shared utilities for all agents
import json
import logging
import asyncio
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.models.agent_log import AgentLog, AgentState
from app.models.company import Company
from agno.models.groq import Groq
from agno.db.postgres import PostgresDb
from app.config import settings

logger = logging.getLogger(__name__)


def log_agent_action(
    db: Session,
    agent_name: str,
    action: str,
    company_id: Optional[str] = None,
    details: Optional[str] = None,
    severity: str = "info",
    emit_socket=None,
):
    """Log an agent action to DB and optionally emit a socket event."""
    log = AgentLog(
        agent_name=agent_name,
        company_id=company_id,
        action=action,
        details=details,
        severity=severity,
        status="completed",
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    if emit_socket:
        try:
            emit_socket(log)
        except Exception as e:
            logger.warning(f"Socket emit failed: {e}")
    else:
        try:
            from app.sockets.events import emit_agent_event
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = None

            if loop and loop.is_running():
                loop.create_task(emit_agent_event(log))
            else:
                asyncio.run(emit_agent_event(log))
        except Exception as e:
            logger.warning(f"Default socket emit failed: {e}")

    logger.info(f"[{agent_name}] {action} | {company_id or 'global'} | {severity}")
    return log


def update_agent_state(db: Session, agent_name: str, status: str, company_id: Optional[str] = None):
    state = db.query(AgentState).filter(AgentState.agent_name == agent_name).first()
    if state:
        state.status = status
        state.current_company_id = company_id
        if status in ("completed", "idle"):
            state.tasks_completed += 1
        elif status == "failed":
            state.tasks_failed += 1
        state.last_run_at = datetime.utcnow()
        db.commit()


def get_groq_client():
    from groq import Groq
    from app.config import settings
    return Groq(api_key=settings.GROQ_API_KEY)


def call_llm(prompt: str, system: str = "You are a financial analysis AI for a private equity firm.", max_tokens: int = 500) -> str:
    """Call Groq LLM and return the response text."""
    try:
        from app.config import settings
        client = get_groq_client()
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            max_tokens=max_tokens,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        return f"Analysis unavailable: {str(e)}"

def get_groq_model(model_id: Optional[str] = None) -> Groq:
    return Groq(
        id=model_id or settings.GROQ_MODEL,
        api_key=settings.GROQ_API_KEY,
    )

def get_postgres_db() -> PostgresDb:
    return PostgresDb(db_url=settings.DATABASE_URL)
