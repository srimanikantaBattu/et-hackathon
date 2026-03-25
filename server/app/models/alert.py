from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean
from sqlalchemy.sql import func
from app.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(String, nullable=True)
    alert_type = Column(String, nullable=False)  # variance | missing_accrual | ic_mismatch | revenue_timing
    severity = Column(String, default="warning")  # info | warning | critical
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    ai_commentary = Column(String, nullable=True)
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(String, nullable=True)
    account_code = Column(Integer, nullable=True)
    amount = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class IntercompanyTransaction(Base):
    __tablename__ = "intercompany_transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(String, nullable=False)
    date = Column(String, nullable=False)
    period = Column(String, nullable=False)
    selling_entity_id = Column(String, nullable=False)
    selling_entity_name = Column(String, nullable=False)
    buying_entity_id = Column(String, nullable=False)
    buying_entity_name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    gl_account = Column(Integer, nullable=False)
    is_eliminated = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
