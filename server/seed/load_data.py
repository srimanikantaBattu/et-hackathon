"""
Seed script - loads all generated CSV/JSON data into PostgreSQL
Run: python -m seed.load_data
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import json
from pathlib import Path
from sqlalchemy.orm import Session

from app.database import engine, SessionLocal, Base
from app.models.company import Company
from app.models.trial_balance import TrialBalance, Budget, PriorYear
from app.models.alert import IntercompanyTransaction

DATA_DIR = Path(__file__).parent.parent / "data"


def create_tables():
    from app.models import Company, TrialBalance, Budget, PriorYear, AgentLog, AgentState, Alert, IntercompanyTransaction
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created")


def seed_companies(db: Session):
    metadata_path = DATA_DIR / "company_metadata.json"
    with open(metadata_path) as f:
        companies_data = json.load(f)

    for c in companies_data:
        existing = db.query(Company).filter(Company.id == c["id"]).first()
        if not existing:
            company = Company(
                id=c["id"],
                name=c["name"],
                industry=c["industry"],
                revenue_annual=c["revenue_annual"],
                employees=c["employees"],
                has_inventory=c["has_inventory"],
                gross_margin=c["gross_margin"],
                growth_rate=c["growth_rate"],
                status="pending",
                close_completion_pct=0.0,
            )
            db.add(company)
    db.commit()
    print(f"✓ Seeded {len(companies_data)} companies")


def seed_trial_balances(db: Session):
    tb_dir = DATA_DIR / "trial_balances"
    count = 0
    for csv_file in sorted(tb_dir.glob("*.csv")):
        df = pd.read_csv(csv_file)
        for _, row in df.iterrows():
            tb = TrialBalance(
                company_id=row["company_id"],
                period=row["period"],
                account_code=int(row["account_code"]),
                account_name=row["account_name"],
                account_type=row["account_type"],
                debit=float(row["debit"]),
                credit=float(row["credit"]),
                balance=float(row["balance"]),
            )
            db.add(tb)
            count += 1
    db.commit()
    print(f"✓ Seeded {count} trial balance records")


def seed_budgets(db: Session):
    budget_path = DATA_DIR / "budgets" / "budgets_2026.csv"
    df = pd.read_csv(budget_path)
    count = 0
    for _, row in df.iterrows():
        budget = Budget(
            company_id=row["company_id"],
            year=int(row["year"]),
            month=int(row["month"]),
            account_code=int(row["account_code"]),
            account_name=row["account_name"],
            budget_amount=float(row["budget_amount"]),
        )
        db.add(budget)
        count += 1
    db.commit()
    print(f"✓ Seeded {count} budget records")


def seed_prior_year(db: Session):
    py_dir = DATA_DIR / "prior_year"
    count = 0
    for csv_file in sorted(py_dir.glob("*.csv")):
        df = pd.read_csv(csv_file)
        for _, row in df.iterrows():
            py = PriorYear(
                company_id=row["company_id"],
                period=row["period"],
                account_code=int(row["account_code"]),
                account_name=row["account_name"],
                account_type=row["account_type"],
                debit=float(row["debit"]),
                credit=float(row["credit"]),
                balance=float(row["balance"]),
            )
            db.add(py)
            count += 1
    db.commit()
    print(f"✓ Seeded {count} prior year records")


def seed_intercompany(db: Session):
    ic_dir = DATA_DIR / "intercompany"
    count = 0
    for csv_file in sorted(ic_dir.glob("*.csv")):
        period = csv_file.stem.replace("intercompany_", "").replace("_", "-")
        df = pd.read_csv(csv_file)
        for _, row in df.iterrows():
            ic = IntercompanyTransaction(
                transaction_id=row["transaction_id"],
                date=str(row["date"]),
                period=period,
                selling_entity_id=row["selling_entity_id"],
                selling_entity_name=row["selling_entity_name"],
                buying_entity_id=row["buying_entity_id"],
                buying_entity_name=row["buying_entity_name"],
                description=row["description"],
                amount=float(row["amount"]),
                gl_account=int(row["gl_account"]),
                is_eliminated=False,
            )
            db.add(ic)
            count += 1
    db.commit()
    print(f"✓ Seeded {count} intercompany transactions")


def seed_agent_states(db: Session):
    from app.models.agent_log import AgentState
    agents = [
        "orchestrator", "trial_balance_validator", "variance_analysis",
        "accrual_verification", "intercompany_elimination", "revenue_recognition",
        "expense_categorization", "cash_flow_reconciliation", "consolidation",
        "reporting_communication"
    ]
    for agent_name in agents:
        existing = db.query(AgentState).filter(AgentState.agent_name == agent_name).first()
        if not existing:
            state = AgentState(agent_name=agent_name, status="idle", tasks_completed=0, tasks_failed=0)
            db.add(state)
    db.commit()
    print(f"✓ Seeded {len(agents)} agent states")


def main():
    print("\n🌱 Seeding database...")
    create_tables()
    db = SessionLocal()
    try:
        seed_companies(db)
        seed_trial_balances(db)
        seed_budgets(db)
        seed_prior_year(db)
        seed_intercompany(db)
        seed_agent_states(db)
        print("\n✅ Database seeding complete!")
    except Exception as e:
        print(f"\n❌ Seeding failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
