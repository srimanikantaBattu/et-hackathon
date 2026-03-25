"""
Custom Tools for the Month-End Close Agents
These are Python functions decorated/structured to be passed as tools= to Agno Agent.
Agno automatically converts Python functions into tool definitions for the LLM.
"""
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional
import pandas as pd
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)
DATA_DIR = Path(__file__).parent.parent.parent / "data"


# ──────────────────────────────────────────────
# Trial Balance Tools
# ──────────────────────────────────────────────

def get_trial_balance(company_id: str, period: str, db: Session) -> dict:
    """Fetch trial balance rows for a company and period. Returns dict with rows and totals."""
    from app.models.trial_balance import TrialBalance
    from sqlalchemy import and_
    rows = db.query(TrialBalance).filter(
        and_(TrialBalance.company_id == company_id, TrialBalance.period == period)
    ).all()
    if not rows:
        return {"error": f"No trial balance found for {company_id} in {period}"}
    total_debits = sum(r.debit for r in rows)
    total_credits = sum(r.credit for r in rows)
    return {
        "company_id": company_id,
        "period": period,
        "total_rows": len(rows),
        "total_debits": round(total_debits, 2),
        "total_credits": round(total_credits, 2),
        "is_balanced": abs(total_debits - total_credits) < 0.01,
        "rows": [{"account_code": r.account_code, "account_name": r.account_name, "account_type": r.account_type, "debit": r.debit, "credit": r.credit, "balance": r.balance} for r in rows]
    }


def get_budget_for_period(company_id: str, year: int, month: int, db: Session) -> dict:
    """Fetch budget data for a specific company, year, and month."""
    from app.models.trial_balance import Budget
    from sqlalchemy import and_
    rows = db.query(Budget).filter(
        and_(Budget.company_id == company_id, Budget.year == year, Budget.month == month)
    ).all()
    return {
        "company_id": company_id,
        "period": f"{year}-{str(month).zfill(2)}",
        "budget_items": [{"account_code": r.account_code, "account_name": r.account_name, "budget_amount": r.budget_amount} for r in rows]
    }


def get_accrual_schedule(company_id: str, db: Session) -> dict:
    """Load accrual schedule for a company from the CSV file."""
    accrual_file = DATA_DIR / "accrual_schedules" / "accrual_schedules.csv"
    if not accrual_file.exists():
        return {"error": "Accrual schedule file not found"}
    df = pd.read_csv(accrual_file)
    company_df = df[df["company_id"] == company_id]
    return {
        "company_id": company_id,
        "total_accruals": len(company_df),
        "monthly_total": float(company_df[company_df["frequency"] == "monthly"]["amount"].sum()),
        "accruals": company_df.to_dict(orient="records")
    }


def get_intercompany_transactions(period: str, db: Session) -> dict:
    """Get all intercompany transactions for a period."""
    from app.models.alert import IntercompanyTransaction
    txns = db.query(IntercompanyTransaction).filter(
        IntercompanyTransaction.period == period
    ).all()
    total = sum(t.amount for t in txns)
    eliminated = sum(t.amount for t in txns if t.is_eliminated)
    return {
        "period": period,
        "total_transactions": len(txns),
        "total_amount": round(total, 2),
        "amount_eliminated": round(eliminated, 2),
        "amount_uneliminated": round(total - eliminated, 2),
        "transactions": [{"id": t.id, "transaction_id": t.transaction_id, "selling_entity_id": t.selling_entity_id, "buying_entity_id": t.buying_entity_id, "description": t.description, "amount": t.amount, "is_eliminated": t.is_eliminated} for t in txns[:50]]
    }


def save_alert(
    company_id: Optional[str],
    alert_type: str,
    severity: str,
    title: str,
    description: str,
    ai_commentary: Optional[str],
    amount: Optional[float],
    account_code: Optional[int],
    db: Session,
) -> dict:
    """Persist an alert/finding to the database."""
    from app.models.alert import Alert
    from sqlalchemy import and_
    existing = db.query(Alert).filter(
        and_(Alert.company_id == company_id, Alert.title == title, Alert.is_resolved == False)
    ).first()
    if existing:
        return {"status": "already_exists", "alert_id": existing.id}
    alert = Alert(
        company_id=company_id,
        alert_type=alert_type,
        severity=severity,
        title=title,
        description=description,
        ai_commentary=ai_commentary,
        amount=amount,
        account_code=account_code,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return {"status": "created", "alert_id": alert.id}


def log_action(agent_name: str, action: str, company_id: Optional[str], details: Optional[str], severity: str, db: Session) -> dict:
    """Log an agent action to the database and emit socket event."""
    from app.models.agent_log import AgentLog
    log = AgentLog(agent_name=agent_name, company_id=company_id, action=action, details=details, severity=severity, status="completed")
    db.add(log)
    db.commit()
    db.refresh(log)
    return {"log_id": log.id, "agent": agent_name, "action": action}


def update_company_status(company_id: str, status: str, completion_pct: float, db: Session) -> dict:
    """Update the status and close completion percentage of a company."""
    from app.models.company import Company
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        return {"error": f"Company {company_id} not found"}
    company.status = status
    company.close_completion_pct = completion_pct
    db.commit()
    return {"company_id": company_id, "status": status, "completion_pct": completion_pct}


def get_consolidation_summary(period: str, db: Session) -> dict:
    """Get consolidated P&L across all 8 companies for a period."""
    from app.models.trial_balance import TrialBalance
    from app.models.company import Company
    companies = db.query(Company).all()
    tb_rows = db.query(TrialBalance).filter(TrialBalance.period == period).all()
    total_revenue = sum(abs(r.balance) for r in tb_rows if r.account_type == "Revenue")
    total_cogs = sum(r.balance for r in tb_rows if r.account_type == "COGS")
    total_opex = sum(r.balance for r in tb_rows if r.account_type == "Operating Expense")
    gross_profit = total_revenue - total_cogs
    ebitda = gross_profit - total_opex
    return {
        "period": period,
        "portfolio_companies": len(companies),
        "total_revenue": round(total_revenue, 2),
        "total_cogs": round(total_cogs, 2),
        "gross_profit": round(gross_profit, 2),
        "gross_margin_pct": round(gross_profit / total_revenue * 100, 1) if total_revenue else 0,
        "total_opex": round(total_opex, 2),
        "ebitda": round(ebitda, 2),
        "ebitda_margin_pct": round(ebitda / total_revenue * 100, 1) if total_revenue else 0,
    }
