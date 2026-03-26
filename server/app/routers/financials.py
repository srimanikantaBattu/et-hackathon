from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from app.database import get_db
from app.models.alert import Alert, IntercompanyTransaction

router = APIRouter(prefix="/api", tags=["alerts"])


@router.get("/alerts")
def get_alerts(
    company_id: str = Query(None),
    severity: str = Query(None),
    resolved: bool = Query(False),
    db: Session = Depends(get_db),
):
    query = db.query(Alert).filter(Alert.is_resolved == resolved)
    if company_id:
        query = query.filter(Alert.company_id == company_id)
    if severity:
        query = query.filter(Alert.severity == severity)
    alerts = query.order_by(desc(Alert.created_at)).all()
    return [
        {
            "id": a.id,
            "company_id": a.company_id,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "title": a.title,
            "description": a.description,
            "ai_commentary": a.ai_commentary,
            "is_resolved": a.is_resolved,
            "account_code": a.account_code,
            "amount": a.amount,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in alerts
    ]


@router.put("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_resolved = True
    db.commit()
    return {"message": "Alert resolved"}


@router.get("/intercompany")
def get_intercompany(period: str = Query("2026-01"), db: Session = Depends(get_db)):
    txns = db.query(IntercompanyTransaction).filter(
        IntercompanyTransaction.period == period
    ).all()
    total = sum(t.amount for t in txns)
    eliminated = sum(t.amount for t in txns if t.is_eliminated)
    return {
        "period": period,
        "total_transactions": len(txns),
        "total_amount": total,
        "amount_eliminated": eliminated,
        "amount_uneliminated": total - eliminated,
        "transactions": [
            {
                "id": t.id,
                "transaction_id": t.transaction_id,
                "date": t.date,
                "selling_entity_name": t.selling_entity_name,
                "buying_entity_name": t.buying_entity_name,
                "description": t.description,
                "amount": t.amount,
                "is_eliminated": t.is_eliminated,
            }
            for t in txns[:200]  # Cap to 200 for performance
        ],
    }


@router.get("/consolidation")
def get_consolidation(period: str = Query("2026-01"), db: Session = Depends(get_db)):
    from app.models.trial_balance import TrialBalance
    from app.models.company import Company

    companies = db.query(Company).all()
    tb_rows = db.query(TrialBalance).filter(TrialBalance.period == period).all()

    total_revenue = sum(abs(r.balance) for r in tb_rows if r.account_type == "Revenue")
    total_cogs = sum(r.balance for r in tb_rows if r.account_type == "COGS")
    total_opex = sum(r.balance for r in tb_rows if r.account_type == "Operating Expense")
    gross_profit = total_revenue - total_cogs
    ebitda = gross_profit - total_opex
    total_assets = sum(r.balance for r in tb_rows if r.account_type == "Asset" and r.balance > 0)

    per_company = []
    for c in companies:
        company_rows = [r for r in tb_rows if r.company_id == c.id]
        rev = sum(abs(r.balance) for r in company_rows if r.account_type == "Revenue")
        cogs = sum(r.balance for r in company_rows if r.account_type == "COGS")
        opex = sum(r.balance for r in company_rows if r.account_type == "Operating Expense")
        gp = rev - cogs
        ebi = gp - opex
        per_company.append({
            "company_id": c.id,
            "company_name": c.name,
            "industry": c.industry,
            "revenue": rev,
            "cogs": cogs,
            "gross_profit": gp,
            "opex": opex,
            "ebitda": ebi,
            "ebitda_margin": round(ebi / rev * 100, 1) if rev else 0,
            "status": c.status,
            "close_completion_pct": c.close_completion_pct,
        })

    return {
        "period": period,
        "total_revenue": total_revenue,
        "cogs": total_cogs,
        "gross_profit": gross_profit,
        "opex": total_opex,
        "ebitda": ebitda,
        "net_income": ebitda - (total_revenue * 0.05) if total_revenue else 0, # Assuming 5% avg D&A/Taxes
        "gross_margin_pct": round((gross_profit / total_revenue) * 100, 1) if total_revenue else 0,
        "ebitda_margin_pct": round((ebitda / total_revenue) * 100, 1) if total_revenue else 0,
        "total_assets": total_assets,
        "portfolio_companies": len(companies),
        "total_issues_found": db.query(Alert).filter(Alert.is_resolved == False).count(),
        "per_company": per_company,
    }


@router.get("/variances")
def get_variances(period: str = Query("2026-01"), db: Session = Depends(get_db)):
    from app.models.trial_balance import TrialBalance, Budget
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

    period_parts = period.split("-")
    year, month = int(period_parts[0]), int(period_parts[1])
    prior_period = _previous_period(period)

    tb_rows = db.query(TrialBalance).filter(TrialBalance.period == period).all()
    prior_tb_rows = db.query(TrialBalance).filter(TrialBalance.period == prior_period).all()
    budget_rows = db.query(Budget).filter(and_(Budget.year == year, Budget.month == month)).all()

    # Build lookup: company_id + account_code -> budget
    budget_map = {}
    for b in budget_rows:
        budget_map[(b.company_id, b.account_code)] = _to_float(b.budget_amount)

    prior_map = {}
    for r in prior_tb_rows:
        prior_map[(r.company_id, r.account_code)] = abs(_to_float(r.balance))

    variances = []
    for r in tb_rows:
        if r.account_type not in ("Revenue", "COGS", "Operating Expense"):
            continue
        key = (r.company_id, r.account_code)
        budget_amount = budget_map.get(key)
        if budget_amount is None or budget_amount == 0:
            continue
        actual = abs(_to_float(r.balance))

        variance_amt_budget = actual - budget_amount
        variance_pct_budget = (variance_amt_budget / budget_amount) * 100 if budget_amount else 0

        prior_actual = _to_float(prior_map.get(key))
        has_prior = prior_actual != 0
        variance_amt_mom = (actual - prior_actual) if has_prior else 0.0
        variance_pct_mom = (variance_amt_mom / prior_actual) * 100 if has_prior else None

        is_material_budget = abs(variance_pct_budget) >= 10 or abs(variance_amt_budget) >= 50000
        is_material_mom = has_prior and (
            (variance_pct_mom is not None and abs(variance_pct_mom) >= 10) or abs(variance_amt_mom) >= 50000
        )

        if is_material_budget or is_material_mom:
            variances.append({
                "company_id": r.company_id,
                "account_code": r.account_code,
                "account_name": r.account_name,
                "account_type": r.account_type,
                "actual": actual,
                "budget": budget_amount,
                "prior_month_actual": prior_actual if has_prior else None,
                "variance_amount": variance_amt_budget,
                "variance_pct": round(variance_pct_budget, 1),
                "variance_to_budget_amount": variance_amt_budget,
                "variance_to_budget_pct": round(variance_pct_budget, 1),
                "variance_to_prior_month_amount": variance_amt_mom if has_prior else None,
                "variance_to_prior_month_pct": round(variance_pct_mom, 1) if variance_pct_mom is not None else None,
                "impact_vs_budget": _impact_label(r.account_type, variance_amt_budget),
                "impact_vs_prior_month": _impact_label(r.account_type, variance_amt_mom) if has_prior else "neutral",
                "severity": "critical" if abs(variance_pct_budget) >= 20 or abs(variance_amt_budget) >= 100000 else "warning",
                "materiality_basis": [
                    basis for basis, triggered in {
                        "budget": is_material_budget,
                        "prior_month": is_material_mom,
                    }.items() if triggered
                ],
            })

    variances.sort(key=lambda x: abs(x["variance_amount"]), reverse=True)
    return {"period": period, "total_variances": len(variances), "variances": variances[:50]}
