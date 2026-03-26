from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.models.company import Company

router = APIRouter(prefix="/api/companies", tags=["companies"])


@router.get("")
def list_companies(db: Session = Depends(get_db)):
    companies = db.query(Company).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "industry": c.industry,
            "revenue_annual": c.revenue_annual,
            "employees": c.employees,
            "gross_margin": c.gross_margin,
            "growth_rate": c.growth_rate,
            "status": c.status,
            "close_completion_pct": c.close_completion_pct,
        }
        for c in companies
    ]


@router.get("/{company_id}")
def get_company(company_id: str, db: Session = Depends(get_db)):
    c = db.query(Company).filter(Company.id == company_id).first()
    if not c:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Company not found")
    return {
        "id": c.id,
        "name": c.name,
        "industry": c.industry,
        "revenue_annual": c.revenue_annual,
        "employees": c.employees,
        "gross_margin": c.gross_margin,
        "growth_rate": c.growth_rate,
        "status": c.status,
        "close_completion_pct": c.close_completion_pct,
    }


@router.get("/{company_id}/financials")
def get_company_financials(company_id: str, period: str = "2026-01", db: Session = Depends(get_db)):
    from app.models.trial_balance import TrialBalance, Budget, PriorYear
    from app.models.agent_log import AgentLog
    from sqlalchemy import and_

    def _to_float(value, default: float = 0.0) -> float:
        try:
            return float(value) if value is not None else default
        except (TypeError, ValueError):
            return default

    def _previous_period(current_period: str) -> str:
        dt = datetime.strptime(current_period, "%Y-%m")
        if dt.month == 1:
            return f"{dt.year - 1}-12"
        return f"{dt.year}-{str(dt.month - 1).zfill(2)}"

    def _impact_label(account_type: str, variance_amount: float) -> str:
        if abs(variance_amount) < 0.005:
            return "neutral"
        if account_type == "Revenue":
            return "favorable" if variance_amount > 0 else "unfavorable"
        if account_type in ("COGS", "Operating Expense"):
            return "favorable" if variance_amount < 0 else "unfavorable"
        return "neutral"

    # Current period trial balance
    tb_rows = db.query(TrialBalance).filter(
        and_(TrialBalance.company_id == company_id, TrialBalance.period == period)
    ).all()

    prior_month_period = _previous_period(period)
    prior_month_rows = db.query(TrialBalance).filter(
        and_(TrialBalance.company_id == company_id, TrialBalance.period == prior_month_period)
    ).all()

    # Budget for same month
    period_parts = period.split("-")
    year, month = int(period_parts[0]), int(period_parts[1])
    budget_rows = db.query(Budget).filter(
        and_(Budget.company_id == company_id, Budget.year == year, Budget.month == month)
    ).all()

    # Prior year - same month one year ago
    py_period = f"{year - 1}-{str(month).zfill(2)}"
    prior_rows = db.query(PriorYear).filter(
        and_(PriorYear.company_id == company_id, PriorYear.period == py_period)
    ).all()

    def rows_to_dict(rows):
        return [
            {
                "account_code": r.account_code,
                "account_name": r.account_name,
                "account_type": r.account_type,
                "debit": r.debit,
                "credit": r.credit,
                "balance": r.balance,
            }
            for r in rows
        ]

    # Compute P&L summary
    def compute_pl(rows):
        revenue = sum(abs(r.balance) for r in rows if r.account_type == "Revenue")
        cogs = sum(r.balance for r in rows if r.account_type == "COGS")
        opex = sum(r.balance for r in rows if r.account_type == "Operating Expense")
        gross_profit = revenue - cogs
        ebitda = gross_profit - opex
        return {"revenue": revenue, "cogs": cogs, "gross_profit": gross_profit, "opex": opex, "ebitda": ebitda}

    # Grab the company metadata
    c = db.query(Company).filter(Company.id == company_id).first()

    # Calculate actual vs budget variances and enrich with AI commentary from Alerts
    from app.models.alert import Alert
    alerts_rows = db.query(Alert).filter(Alert.company_id == company_id).all()
    latest_variance_ai_log = db.query(AgentLog).filter(
        and_(
            AgentLog.company_id == company_id,
            AgentLog.agent_name == "variance_analysis",
            AgentLog.severity == "success",
            AgentLog.details != None,
        )
    ).order_by(AgentLog.created_at.desc()).first()
    
    variances = []
    prior_month_map = {r.account_code: abs(_to_float(r.balance)) for r in prior_month_rows}

    for b in budget_rows:
        tb_match = next((t for t in tb_rows if t.account_code == b.account_code), None)
        actual = abs(_to_float(tb_match.balance)) if tb_match else 0.0
        budget = _to_float(b.budget_amount)
        if budget == 0:
            continue

        var_amt = actual - budget
        var_pct = (var_amt / budget * 100) if budget != 0 else 0

        prior_month_actual = _to_float(prior_month_map.get(b.account_code))
        has_prior_month = prior_month_actual != 0
        mom_var_amt = (actual - prior_month_actual) if has_prior_month else 0.0
        mom_var_pct = (mom_var_amt / prior_month_actual * 100) if has_prior_month else None

        is_material_budget = abs(var_pct) >= 10 or abs(var_amt) >= 50000
        is_material_mom = has_prior_month and (
            (mom_var_pct is not None and abs(mom_var_pct) >= 10) or abs(mom_var_amt) >= 50000
        )
        
        if is_material_budget or is_material_mom:
            ai_alert = next((a for a in alerts_rows if a.account_code == b.account_code and a.alert_type == 'variance'), None)
            account_type = tb_match.account_type if tb_match else ""
            impact_vs_budget = _impact_label(account_type, var_amt)
            impact_vs_prior_month = _impact_label(account_type, mom_var_amt) if has_prior_month else "neutral"

            ai_commentary = (
                ai_alert.ai_commentary
                if ai_alert and getattr(ai_alert, 'ai_commentary', None)
                else (
                    ai_alert.description
                    if ai_alert and getattr(ai_alert, 'description', None)
                    else (
                        (latest_variance_ai_log.details[:1200] if latest_variance_ai_log and latest_variance_ai_log.details else None)
                        or "Waiting for AI variance commentary..."
                    )
                )
            )

            variances.append({
                "account_code": b.account_code,
                "account_name": b.account_name,
                "actual_amount": actual,
                "budget_amount": budget,
                "variance_amount": var_amt,
                "variance_pct": var_pct,
                "prior_month_actual": prior_month_actual if has_prior_month else None,
                "variance_to_budget_amount": var_amt,
                "variance_to_budget_pct": var_pct,
                "variance_to_prior_month_amount": mom_var_amt if has_prior_month else None,
                "variance_to_prior_month_pct": mom_var_pct if mom_var_pct is not None else None,
                "impact_vs_budget": impact_vs_budget,
                "impact_vs_prior_month": impact_vs_prior_month,
                "materiality_basis": [
                    basis for basis, triggered in {
                        "budget": is_material_budget,
                        "prior_month": is_material_mom,
                    }.items() if triggered
                ],
                "ai_commentary": ai_commentary,
            })

    # Prepare standard non-variance alerts for the tracker
    active_alerts = [
        {
            "id": a.id,
            "severity": a.severity,
            "alert_type": a.alert_type,
            "description": a.description,
            "agent_source": a.alert_type.capitalize() + " Agent"
        } for a in alerts_rows if a.alert_type != "variance"
    ]

    return {
        "company": {
            "id": c.id,
            "name": c.name,
            "industry": c.industry,
            "reporting_currency": getattr(c, 'reporting_currency', 'USD'),
            "status": c.status
        } if c else None,
        "company_id": company_id,
        "period": period,
        "trial_balance": rows_to_dict(tb_rows),
        "variances": sorted(variances, key=lambda x: abs(x["variance_amount"]), reverse=True)[:10], # Top 10 material
        "alerts": active_alerts,
        "budget": [{"account_code": b.account_code, "account_name": b.account_name, "budget_amount": b.budget_amount} for b in budget_rows],
        "prior_year": rows_to_dict(prior_rows),
        "pl_summary": compute_pl(tb_rows),
        "pl_budget": {"revenue": sum(b.budget_amount for b in budget_rows if "Revenue" in b.account_name or b.account_code >= 4000 and b.account_code < 5000)},
    }
