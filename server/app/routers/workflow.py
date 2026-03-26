"""
Workflow trigger API router.
POST /api/workflow/trigger -> runs the full month-end close Agno workflow
"""
import logging
import json
from fastapi import APIRouter, Depends, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.agents.base import log_agent_action
from app.models.workflow_run import WorkflowRun
from app.models.workflow_handoff import WorkflowHandoff
from app.workflows.engine import execute_workflow_run
from app.workflows.state import RedisWorkflowState

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/workflow", tags=["workflow"])


def _run_workflow_background(workflow_run_id: int, period: str):
    """Run the full month-end close workflow in background."""
    try:
        result = execute_workflow_run(workflow_run_id=workflow_run_id, period=period)
        from app.database import SessionLocal
        db = SessionLocal()
        try:
            log_agent_action(
                db,
                "orchestrator",
                "Workflow run completed",
                details=f"run_id={workflow_run_id}, period={period}, status={result.get('status')}",
                severity="success",
            )
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Workflow failed: {e}", exc_info=True)
        from app.database import SessionLocal
        db = SessionLocal()
        try:
            run = db.query(WorkflowRun).filter(WorkflowRun.id == workflow_run_id).first()
            if run:
                run.status = "failed"
                run.error_message = str(e)
                db.commit()
            log_agent_action(
                db,
                "orchestrator",
                "Workflow run failed",
                details=f"run_id={workflow_run_id}, error={str(e)}",
                severity="error",
            )
        finally:
            db.close()


@router.post("/trigger")
def trigger_workflow(period: str = "2026-01", background_tasks: BackgroundTasks = None, db: Session = Depends(get_db)):
    """Trigger the full month-end close workflow. Runs asynchronously in the background."""
    run = WorkflowRun(period=period, status="pending", current_group="queued", progress_pct=0.0)
    db.add(run)
    db.commit()
    db.refresh(run)

    log_agent_action(
        db,
        "orchestrator",
        f"Month-end close workflow queued for period {period}",
        details=f"run_id={run.id}",
        severity="info",
    )

    background_tasks.add_task(_run_workflow_background, run.id, period)
    return {
        "status": "started",
        "run_id": run.id,
        "period": period,
        "message": f"Month-end close workflow started for {period}. Monitor progress via /api/agents/logs and WebSocket events."
    }


@router.get("/status")
def get_workflow_status(db: Session = Depends(get_db)):
    """Get current workflow status across all agents."""
    from app.models.agent_log import AgentState
    agents = db.query(AgentState).all()
    running = [a.agent_name for a in agents if a.status == "running"]
    latest_run = db.query(WorkflowRun).order_by(desc(WorkflowRun.created_at)).first()
    return {
        "is_running": len(running) > 0,
        "running_agents": running,
        "total_tasks_completed": sum(a.tasks_completed for a in agents),
        "latest_run": {
            "id": latest_run.id,
            "period": latest_run.period,
            "status": latest_run.status,
            "current_group": latest_run.current_group,
            "progress_pct": latest_run.progress_pct,
            "started_at": latest_run.started_at.isoformat() if latest_run and latest_run.started_at else None,
            "completed_at": latest_run.completed_at.isoformat() if latest_run and latest_run.completed_at else None,
            "error_message": latest_run.error_message,
        } if latest_run else None,
    }


@router.get("/runs")
def list_workflow_runs(limit: int = 20, db: Session = Depends(get_db)):
    runs = db.query(WorkflowRun).order_by(desc(WorkflowRun.created_at)).limit(limit).all()
    return [
        {
            "id": run.id,
            "period": run.period,
            "status": run.status,
            "current_group": run.current_group,
            "progress_pct": run.progress_pct,
            "error_message": run.error_message,
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
            "created_at": run.created_at.isoformat() if run.created_at else None,
        }
        for run in runs
    ]


@router.get("/handoffs/{company_id}")
def get_company_handoffs(
    company_id: str,
    run_id: int = Query(None),
    db: Session = Depends(get_db),
):
    selected_run = None
    if run_id:
        selected_run = db.query(WorkflowRun).filter(WorkflowRun.id == run_id).first()
    else:
        latest_handoff = db.query(WorkflowHandoff).filter(
            WorkflowHandoff.company_id == company_id
        ).order_by(desc(WorkflowHandoff.workflow_run_id)).first()

        if latest_handoff:
            selected_run = db.query(WorkflowRun).filter(WorkflowRun.id == latest_handoff.workflow_run_id).first()
        else:
            selected_run = db.query(WorkflowRun).order_by(desc(WorkflowRun.created_at)).first()

    if not selected_run:
        return {"company_id": company_id, "run_id": None, "handoffs": {"group1": [], "group2": []}}

    redis_state = RedisWorkflowState()

    def _parse_payload(raw: str):
        try:
            return json.loads(raw)
        except Exception:
            return raw

    def _read_stage(stage: str):
        row = db.query(WorkflowHandoff).filter(
            WorkflowHandoff.workflow_run_id == selected_run.id,
            WorkflowHandoff.company_id == company_id,
            WorkflowHandoff.stage == stage,
        ).first()
        if row:
            parsed = _parse_payload(row.payload)
            return parsed if isinstance(parsed, list) else [str(parsed)]

        fallback = redis_state.get_handoff(selected_run.id, company_id, stage)
        if isinstance(fallback, list):
            return fallback
        if fallback is None:
            return []
        return [str(fallback)]

    group1 = _read_stage("group1")
    group2 = _read_stage("group2")

    def _to_snippet_items(items, stage: str):
        stage_agent_order = {
            "group1": [
                "trial_balance_validator",
                "variance_analysis",
                "cash_flow_reconciliation",
            ],
            "group2": [
                "accrual_verification",
                "revenue_recognition",
                "expense_categorization",
            ],
        }
        labels = stage_agent_order.get(stage, [])
        snippet_items = []
        for index, item in enumerate(items):
            text = str(item) if item is not None else ""
            snippet_items.append({
                "agent_name": labels[index] if index < len(labels) else f"{stage}_agent_{index + 1}",
                "snippet": text[:500],
                "full_response": text,
                "has_more": len(text) > 500,
            })
        return snippet_items

    return {
        "company_id": company_id,
        "run_id": selected_run.id,
        "period": selected_run.period,
        "status": selected_run.status,
        "current_group": selected_run.current_group,
        "progress_pct": selected_run.progress_pct,
        "handoffs": {
            "group1": _to_snippet_items(group1, "group1"),
            "group2": _to_snippet_items(group2, "group2"),
        },
    }
