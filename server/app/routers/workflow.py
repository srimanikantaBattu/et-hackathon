"""
Workflow trigger API router.
POST /api/workflow/trigger -> runs the full month-end close Agno workflow
"""
import asyncio
import logging
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.agents.base import update_agent_state

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/workflow", tags=["workflow"])


def _run_workflow_background(period: str, db: Session):
    """Run the full month-end close workflow in background."""
    try:
        from app.agents.orchestrator import build_orchestrator_team
        db_tools = {"db": db}

        # Update all agent states to running
        agent_names = [
            "orchestrator", "trial_balance_validator", "variance_analysis",
            "accrual_verification", "intercompany_elimination", "revenue_recognition",
            "expense_categorization", "cash_flow_reconciliation", "consolidation",
            "reporting_communication"
        ]
        for name in agent_names:
            update_agent_state(db, name, "running")

        # Build and run the orchestrator team
        orchestrator = build_orchestrator_team(db_tools, period)
        result = orchestrator.run(f"Run the complete month-end close process for period {period}.")

        # Capture and log the final markdown executive report
        from app.agents.base import log_agent_action
        final_markdown = getattr(result, "content", str(result)) if result else "Workflow executed."
        log_agent_action(
            db, 
            "orchestrator", 
            "Final Executive Report Generated", 
            details=final_markdown, 
            severity="success"
        )

        logger.info(f"Month-end close workflow completed for period {period}")
        for name in agent_names:
            update_agent_state(db, name, "idle")

    except Exception as e:
        logger.error(f"Workflow failed: {e}", exc_info=True)


@router.post("/trigger")
def trigger_workflow(period: str = "2026-01", background_tasks: BackgroundTasks = None, db: Session = Depends(get_db)):
    """Trigger the full month-end close workflow. Runs asynchronously in the background."""
    from app.agents.base import log_agent_action
    log_agent_action(db, "orchestrator", f"Month-end close workflow triggered for period {period}", severity="info")
    background_tasks.add_task(_run_workflow_background, period, db)
    return {
        "status": "started",
        "period": period,
        "message": f"Month-end close workflow started for {period}. Monitor progress via /api/agents/logs and WebSocket events."
    }


@router.get("/status")
def get_workflow_status(db: Session = Depends(get_db)):
    """Get current workflow status across all agents."""
    from app.models.agent_log import AgentState
    agents = db.query(AgentState).all()
    running = [a.agent_name for a in agents if a.status == "running"]
    return {
        "is_running": len(running) > 0,
        "running_agents": running,
        "total_tasks_completed": sum(a.tasks_completed for a in agents),
    }
