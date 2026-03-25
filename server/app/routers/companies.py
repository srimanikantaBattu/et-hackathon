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

    return {
        "company_id": company_id,
        "period": period,
        "trial_balance": rows_to_dict(tb_rows),
        "budget": [{"account_code": b.account_code, "account_name": b.account_name, "budget_amount": b.budget_amount} for b in budget_rows],
        "prior_year": rows_to_dict(prior_rows),
        "pl_summary": compute_pl(tb_rows),
        "pl_budget": {"revenue": sum(b.budget_amount for b in budget_rows if "Revenue" in b.account_name or b.account_code >= 4000 and b.account_code < 5000)},
    }
