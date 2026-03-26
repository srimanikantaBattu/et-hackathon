from sqlalchemy import Column, Integer, String, DateTime, Text, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base


class WorkflowHandoff(Base):
    __tablename__ = "workflow_handoffs"
    __table_args__ = (
        UniqueConstraint("workflow_run_id", "company_id", "stage", name="uq_workflow_handoff_run_company_stage"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    workflow_run_id = Column(Integer, nullable=False, index=True)
    company_id = Column(String, nullable=False, index=True)
    stage = Column(String, nullable=False, index=True)
    payload = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
