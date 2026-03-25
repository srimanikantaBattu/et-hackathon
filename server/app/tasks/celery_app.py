"""
Celery app + scheduled tasks for autonomous agent operation.
Runs without any manual trigger — Schedule: daily 9AM + hourly during close week.
"""
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
    },
)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def run_month_end_close(self, period: str):
    """Autonomous task: trigger full month-end close workflow."""
    try:
        from app.database import SessionLocal
        from app.agents.orchestrator import build_orchestrator_team
        db = SessionLocal()
        db_tools = {"db": db}
        orchestrator = build_orchestrator_team(db_tools, period)
        orchestrator.run(f"Run the complete month-end close process for period {period}.")
        db.close()
        return {"status": "completed", "period": period}
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task
def monitor_close_progress():
    """Check for new data and trigger agents if needed."""
    from app.database import SessionLocal
    from app.models.company import Company
    db = SessionLocal()
    pending = db.query(Company).filter(Company.status == "pending").count()
    db.close()
    if pending > 0:
        run_month_end_close.delay("2026-01")
        return {"action": "triggered", "pending_companies": pending}
    return {"action": "none", "message": "All companies already processed"}


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
