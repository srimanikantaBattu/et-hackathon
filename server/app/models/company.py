from sqlalchemy import Column, String, Integer, Float, Boolean, JSON, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(String, primary_key=True)  # e.g., "techforge_saas"
    name = Column(String, nullable=False)
    industry = Column(String, nullable=False)
    revenue_annual = Column(Float, nullable=False)
    employees = Column(Integer, nullable=False)
    has_inventory = Column(Boolean, default=False)
    gross_margin = Column(Float, nullable=False)
    growth_rate = Column(Float, nullable=False)
    status = Column(String, default="pending")  # pending | in_progress | complete | issues
    close_completion_pct = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
