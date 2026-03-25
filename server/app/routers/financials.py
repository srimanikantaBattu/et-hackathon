from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
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
        "consolidated": {
            "revenue": total_revenue,
            "cogs": total_cogs,
            "gross_profit": gross_profit,
            "opex": total_opex,
            "ebitda": ebitda,
            "ebitda_margin": round(ebitda / total_revenue * 100, 1) if total_revenue else 0,
            "total_assets": total_assets,
        },
        "per_company": per_company,
    }


@router.get("/variances")
def get_variances(period: str = Query("2026-01"), db: Session = Depends(get_db)):
    from app.models.trial_balance import TrialBalance, Budget
    from sqlalchemy import and_

    period_parts = period.split("-")
    year, month = int(period_parts[0]), int(period_parts[1])

    tb_rows = db.query(TrialBalance).filter(TrialBalance.period == period).all()
    budget_rows = db.query(Budget).filter(and_(Budget.year == year, Budget.month == month)).all()

    # Build lookup: company_id + account_code -> budget
    budget_map = {}
    for b in budget_rows:
        budget_map[(b.company_id, b.account_code)] = b.budget_amount

    variances = []
    for r in tb_rows:
        if r.account_type not in ("Revenue", "COGS", "Operating Expense"):
            continue
        key = (r.company_id, r.account_code)
        budget_amount = budget_map.get(key)
        if budget_amount is None or budget_amount == 0:
            continue
        actual = abs(r.balance)
        variance_amt = actual - budget_amount
        variance_pct = (variance_amt / budget_amount) * 100 if budget_amount else 0
        if abs(variance_pct) >= 10 or abs(variance_amt) >= 50000:
            variances.append({
                "company_id": r.company_id,
                "account_code": r.account_code,
                "account_name": r.account_name,
                "account_type": r.account_type,
                "actual": actual,
                "budget": budget_amount,
                "variance_amount": variance_amt,
                "variance_pct": round(variance_pct, 1),
                "severity": "critical" if abs(variance_pct) >= 20 or abs(variance_amt) >= 100000 else "warning",
            })

    variances.sort(key=lambda x: abs(x["variance_amount"]), reverse=True)
    return {"period": period, "total_variances": len(variances), "variances": variances[:50]}
