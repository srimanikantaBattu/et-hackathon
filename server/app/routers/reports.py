import csv
import io
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.agents.base import log_agent_action
from app.agents.tools import get_consolidation_summary
from app.database import get_db
from app.email.sender import send_email_now
from app.models.agent_log import AgentLog
from app.models.alert import Alert, IntercompanyTransaction
from app.models.workflow_run import WorkflowRun
from app.workflows.state import RedisWorkflowState

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _get_selected_run(db: Session, period: str, run_id: Optional[int] = None) -> Optional[WorkflowRun]:
    if run_id:
        return db.query(WorkflowRun).filter(WorkflowRun.id == run_id).first()

    return (
        db.query(WorkflowRun)
        .filter(WorkflowRun.period == period)
        .order_by(desc(WorkflowRun.created_at))
        .first()
    )


def _get_reporting_output(db: Session, period: str, run_id: Optional[int] = None) -> tuple[Optional[str], Optional[WorkflowRun]]:
    selected_run = _get_selected_run(db, period, run_id)

    if selected_run:
        try:
            meta = RedisWorkflowState().get_workflow_meta(selected_run.id)
        except Exception:
            meta = {}

        if isinstance(meta, dict):
            output = meta.get("reporting_output")
            if output:
                return str(output), selected_run

        query = db.query(AgentLog).filter(AgentLog.agent_name == "reporting_communication")
        if selected_run.started_at:
            query = query.filter(AgentLog.created_at >= selected_run.started_at)
        if selected_run.completed_at:
            query = query.filter(AgentLog.created_at <= selected_run.completed_at)
        log_row = query.order_by(desc(AgentLog.created_at)).first()
        if log_row and log_row.details:
            return log_row.details, selected_run

    fallback_log = (
        db.query(AgentLog)
        .filter(AgentLog.agent_name == "reporting_communication")
        .order_by(desc(AgentLog.created_at))
        .first()
    )
    return (fallback_log.details if fallback_log and fallback_log.details else None), selected_run


def _build_summary_text(summary: dict, ai_text: Optional[str], period: str) -> str:
    lines = [
        f"Period: {period}",
        f"Portfolio Revenue: ${float(summary.get('total_revenue', 0)):,.0f}",
        f"EBITDA: ${float(summary.get('ebitda', 0)):,.0f} ({float(summary.get('ebitda_margin_pct', 0)):.1f}% margin)",
        f"Gross Profit: ${float(summary.get('gross_profit', 0)):,.0f} ({float(summary.get('gross_margin_pct', 0)):.1f}% margin)",
        f"Companies: {int(summary.get('portfolio_companies', 0))}",
        "",
        "AI Reporting Summary:",
        (ai_text or "No AI reporting output available for this run."),
    ]
    return "\n".join(lines)


@router.get("/summary")
def get_reports_summary(
    period: str = Query("2026-01"),
    run_id: int = Query(None),
    db: Session = Depends(get_db),
):
    summary = get_consolidation_summary(period, db)
    ai_summary, selected_run = _get_reporting_output(db, period, run_id)
    unresolved_alerts = db.query(Alert).filter(Alert.is_resolved == False).count()

    return {
        "period": period,
        "run_id": selected_run.id if selected_run else None,
        "summary": summary,
        "open_alerts": unresolved_alerts,
        "ai_summary": ai_summary,
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.post("/email")
def email_reports(
    period: str = Query("2026-01"),
    run_id: int = Query(None),
    db: Session = Depends(get_db),
):
    summary = get_consolidation_summary(period, db)
    ai_summary, selected_run = _get_reporting_output(db, period, run_id)
    summary_text = _build_summary_text(summary, ai_summary, period)

    result = send_email_now("pe_partners", period, summary_text)

    log_agent_action(
        db,
        "reporting_communication",
        "Reports page triggered partner email",
        details=f"period={period}, run_id={selected_run.id if selected_run else 'n/a'}, status={result.get('status')}",
        severity="success" if result.get("status") in ("sent", "logged") else "error",
    )

    return {
        "status": result.get("status", "unknown"),
        "period": period,
        "run_id": selected_run.id if selected_run else None,
        "provider_response": result,
    }


@router.get("/download/complete-financials.pdf")
def download_complete_financials_pdf(
    period: str = Query("2026-01"),
    run_id: int = Query(None),
    db: Session = Depends(get_db),
):
    summary = get_consolidation_summary(period, db)
    ai_summary, selected_run = _get_reporting_output(db, period, run_id)

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    y = height - 50
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(50, y, "PE Portfolio - Complete Financials")
    y -= 22

    pdf.setFont("Helvetica", 10)
    pdf.drawString(50, y, f"Period: {period}")
    y -= 14
    pdf.drawString(50, y, f"Run ID: {selected_run.id if selected_run else 'N/A'}")
    y -= 18

    lines = [
        f"Portfolio Companies: {summary.get('portfolio_companies', 0)}",
        f"Total Revenue: ${float(summary.get('total_revenue', 0)):,.0f}",
        f"Total COGS: ${float(summary.get('total_cogs', 0)):,.0f}",
        f"Gross Profit: ${float(summary.get('gross_profit', 0)):,.0f}",
        f"Gross Margin: {float(summary.get('gross_margin_pct', 0)):.1f}%",
        f"Total OpEx: ${float(summary.get('total_opex', 0)):,.0f}",
        f"EBITDA: ${float(summary.get('ebitda', 0)):,.0f}",
        f"EBITDA Margin: {float(summary.get('ebitda_margin_pct', 0)):.1f}%",
    ]

    for line in lines:
        pdf.drawString(50, y, line)
        y -= 14

    y -= 10
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(50, y, "AI Reporting Summary")
    y -= 16
    pdf.setFont("Helvetica", 9)

    summary_text = (ai_summary or "No AI reporting output available.").replace("\r", "")
    for raw_line in summary_text.split("\n"):
        line = raw_line.strip()
        while len(line) > 120:
            pdf.drawString(50, y, line[:120])
            line = line[120:]
            y -= 12
            if y < 50:
                pdf.showPage()
                pdf.setFont("Helvetica", 9)
                y = height - 50
        pdf.drawString(50, y, line)
        y -= 12
        if y < 50:
            pdf.showPage()
            pdf.setFont("Helvetica", 9)
            y = height - 50

    pdf.showPage()
    pdf.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=complete_financials_{period}.pdf"},
    )


@router.get("/download/intercompany-matrix.csv")
def download_intercompany_matrix_csv(
    period: str = Query("2026-01"),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(IntercompanyTransaction)
        .filter(IntercompanyTransaction.period == period)
        .order_by(IntercompanyTransaction.date.asc(), IntercompanyTransaction.transaction_id.asc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "transaction_id",
        "date",
        "period",
        "selling_entity_id",
        "selling_entity_name",
        "buying_entity_id",
        "buying_entity_name",
        "description",
        "amount",
        "gl_account",
        "is_eliminated",
    ])

    for row in rows:
        writer.writerow([
            row.transaction_id,
            row.date,
            row.period,
            row.selling_entity_id,
            row.selling_entity_name,
            row.buying_entity_id,
            row.buying_entity_name,
            row.description,
            row.amount,
            row.gl_account,
            row.is_eliminated,
        ])

    csv_bytes = io.BytesIO(output.getvalue().encode("utf-8"))
    return StreamingResponse(
        csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=intercompany_matrix_{period}.csv"},
    )


@router.get("/download/agent-audit.csv")
def download_agent_audit_csv(
    run_id: int = Query(None),
    limit: int = Query(2000, ge=100, le=10000),
    db: Session = Depends(get_db),
):
    query = db.query(AgentLog)

    if run_id:
        run = db.query(WorkflowRun).filter(WorkflowRun.id == run_id).first()
        if run:
            if run.started_at:
                query = query.filter(AgentLog.created_at >= run.started_at)
            if run.completed_at:
                query = query.filter(AgentLog.created_at <= run.completed_at)

    rows = query.order_by(desc(AgentLog.created_at)).limit(limit).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "created_at", "agent_name", "company_id", "severity", "action", "details"])

    for row in rows:
        writer.writerow([
            row.id,
            row.created_at.isoformat() if row.created_at else "",
            row.agent_name,
            row.company_id or "",
            row.severity,
            row.action,
            row.details or "",
        ])

    csv_bytes = io.BytesIO(output.getvalue().encode("utf-8"))
    return StreamingResponse(
        csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=agent_audit.csv"},
    )
