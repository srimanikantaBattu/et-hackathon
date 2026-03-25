"""
Celery app + scheduled tasks for autonomous agent operation.
Runs without any manual trigger — Schedule: daily 9AM + hourly during close week.
"""
import json
from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "apex_capital",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        # Daily 9 AM UTC — initiate month-end close
        "daily-month-end-close": {
            "task": "app.tasks.celery_app.run_month_end_close",
            "schedule": crontab(hour=9, minute=0),
            "args": ("2026-01",),
        },
        # Hourly during business hours — check for data changes
        "hourly-close-monitor": {
            "task": "app.tasks.celery_app.monitor_close_progress",
            "schedule": crontab(minute=0, hour="8-18"),
        },
        # Daily 7 AM — send executive summary email
        "daily-executive-email": {
            "task": "app.tasks.celery_app.send_daily_executive_email",
            "schedule": crontab(hour=7, minute=0),
            "args": ("2026-01",),
        },
        # Every 15 minutes - monitor agent health
        "agent-health-check": {
            "task": "app.tasks.celery_app.agent_health_check",
            "schedule": crontab(minute="*/15"),
        },
    },
)


@celery_app.task(bind=True, max_retries=3)
def run_month_end_close(self, period: str):
    """Autonomous task: trigger full month-end close workflow."""
    try:
        from app.database import SessionLocal
        from app.models.workflow_run import WorkflowRun
        from app.workflows.engine import execute_workflow_run
        from app.agents.base import log_agent_action

        db = SessionLocal()
        try:
            run = WorkflowRun(period=period, status="queued", current_group="queued", progress_pct=0.0)
            db.add(run)
            db.commit()
            db.refresh(run)

            log_agent_action(
                db,
                "orchestrator",
                "Autonomous schedule started workflow",
                details=f"run_id={run.id}, period={period}",
                severity="info",
            )

            result = execute_workflow_run(run.id, period)
            return {"status": "completed", "period": period, "run_id": run.id, "result": result}
        finally:
            db.close()
    except Exception as exc:
        wait_time = 60 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=wait_time)


@celery_app.task
def monitor_close_progress():
    """Check for new data and trigger agents if needed."""
    from app.database import SessionLocal
    from app.models.company import Company
    from app.models.trial_balance import TrialBalance
    import redis

    db = SessionLocal()
    try:
        pending = db.query(Company).filter(Company.status == "pending").count()

        tb_count = db.query(TrialBalance).count()
        total_balance = db.query(TrialBalance).with_entities(TrialBalance.balance).all()
        balance_checksum = round(sum(r[0] for r in total_balance), 2) if total_balance else 0.0
        fingerprint = json.dumps({"tb_count": tb_count, "balance_checksum": balance_checksum}, sort_keys=True)

        redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
        last_fingerprint = redis_client.get("workflow:data:fingerprint")
        redis_client.set("workflow:data:fingerprint", fingerprint)

        if pending > 0 or fingerprint != last_fingerprint:
            run_month_end_close.delay("2026-01")
            return {
                "action": "triggered",
                "pending_companies": pending,
                "data_changed": fingerprint != last_fingerprint,
            }
        return {"action": "none", "message": "No pending entities and no source-data changes detected"}
    finally:
        db.close()


@celery_app.task
def send_daily_executive_email(period: str):
    """Send daily executive summary email to PE partners."""
    from app.database import SessionLocal
    from app.email.sender import send_email_now
    from app.agents.tools import get_consolidation_summary
    db = SessionLocal()
    summary = get_consolidation_summary(period, db)
    summary_text = f"""Daily Close Update - {period}

Portfolio Revenue: ${summary['total_revenue']:,.0f}
EBITDA: ${summary['ebitda']:,.0f} ({summary['ebitda_margin_pct']}% margin)
Gross Profit: ${summary['gross_profit']:,.0f} ({summary['gross_margin_pct']}% margin)

Companies in portfolio: {summary['portfolio_companies']}
Close Status: Automated agents running
"""
    send_email_now("pe_partners", period, summary_text)
    db.close()
    return {"status": "sent", "period": period}


@celery_app.task
def agent_health_check():
    """Detect agents stuck in running state beyond threshold and emit alerts."""
    from datetime import datetime, timedelta, timezone
    from app.database import SessionLocal
    from app.models.agent_log import AgentState
    from app.agents.base import log_agent_action

    db = SessionLocal()
    try:
        threshold = datetime.now(timezone.utc) - timedelta(hours=2)
        stale_agents = db.query(AgentState).filter(
            AgentState.status == "running",
            AgentState.last_run_at != None,
            AgentState.last_run_at < threshold,
        ).all()

        if not stale_agents:
            return {"status": "healthy", "stale_agents": 0}

        for agent in stale_agents:
            agent.status = "failed"
            log_agent_action(
                db,
                "orchestrator",
                "Agent health check detected stale runner",
                details=f"agent={agent.agent_name}, last_run_at={agent.last_run_at}",
                severity="warning",
            )

        db.commit()
        return {"status": "degraded", "stale_agents": len(stale_agents)}
    finally:
        db.close()
