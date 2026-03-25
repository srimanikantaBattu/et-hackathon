from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
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
    from sqlalchemy import and_

    # Current period trial balance
    tb_rows = db.query(TrialBalance).filter(
        and_(TrialBalance.company_id == company_id, TrialBalance.period == period)
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
    
    variances = []
    for b in budget_rows:
        tb_match = next((t for t in tb_rows if t.account_code == b.account_code), None)
        actual = tb_match.balance if tb_match else 0
        budget = b.budget_amount
        var_amt = actual - budget
        var_pct = (var_amt / budget * 100) if budget != 0 else 0
        
        # Flag material variances > 10% threshold 
        if abs(var_pct) > 10:
            ai_alert = next((a for a in alerts_rows if a.account_code == b.account_code and a.alert_type == 'variance'), None)
            variances.append({
                "account_code": b.account_code,
                "account_name": b.account_name,
                "actual_amount": actual,
                "budget_amount": budget,
                "variance_amount": var_amt,
                "variance_pct": var_pct,
                "ai_commentary": ai_alert.ai_commentary if ai_alert and getattr(ai_alert, 'ai_commentary', None) else (ai_alert.description if ai_alert else "Awaiting Agentic AI narrative generation...")
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
