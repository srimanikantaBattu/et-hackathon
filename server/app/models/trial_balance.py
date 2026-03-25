from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class TrialBalance(Base):
    __tablename__ = "trial_balances"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    period = Column(String, nullable=False)  # "2026-01"
    account_code = Column(Integer, nullable=False)
    account_name = Column(String, nullable=False)
    account_type = Column(String, nullable=False)  # Asset | Liability | Equity | Revenue | COGS | Operating Expense
    debit = Column(Float, default=0.0)
    credit = Column(Float, default=0.0)
    balance = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    account_code = Column(Integer, nullable=False)
    account_name = Column(String, nullable=False)
    budget_amount = Column(Float, default=0.0)


class PriorYear(Base):
    __tablename__ = "prior_year"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    period = Column(String, nullable=False)
    account_code = Column(Integer, nullable=False)
    account_name = Column(String, nullable=False)
    account_type = Column(String, nullable=False)
    debit = Column(Float, default=0.0)
    credit = Column(Float, default=0.0)
    balance = Column(Float, default=0.0)
