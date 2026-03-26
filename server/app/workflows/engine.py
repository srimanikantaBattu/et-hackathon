import time
import json
import logging
import threading
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Callable, Optional

from app.database import SessionLocal
from app.models.company import Company
from app.models.workflow_run import WorkflowRun
from app.models.workflow_handoff import WorkflowHandoff
from app.agents.base import update_agent_state, log_agent_action
from app.workflows.state import RedisWorkflowState
from app.workflows.event_bus import WorkflowEventBus
from app.config import settings

from app.agents.trial_balance_validator import build_trial_balance_validator
from app.agents.variance_analysis import build_variance_analysis_agent
from app.agents.cash_flow_reconciliation import build_cash_flow_reconciliation_agent
from app.agents.accrual_verification import build_accrual_verification_agent
from app.agents.revenue_recognition import build_revenue_recognition_agent
from app.agents.expense_categorization import build_expense_categorization_agent
from app.agents.intercompany_elimination import build_intercompany_elimination_agent
from app.agents.consolidation import build_consolidation_agent
from app.agents.reporting_communication import build_reporting_agent

logger = logging.getLogger(__name__)


AgentBuilder = Callable[[dict], object]


class MonthEndWorkflowExecutor:
    _llm_semaphore = threading.BoundedSemaphore(value=max(1, int(settings.WORKFLOW_LLM_CONCURRENCY)))

    def __init__(
        self,
        workflow_run_id: int,
        period: str,
        company_ids: Optional[list[str]] = None,
        company_limit: Optional[int] = None,
    ):
        self.workflow_run_id = workflow_run_id
        self.period = period
        self.shared_state = RedisWorkflowState()
        self.event_bus = WorkflowEventBus(max_retries=3, base_backoff_seconds=1.0)
        self.company_ids: list[str] = []
        self.requested_company_ids = [company_id.strip() for company_id in (company_ids or []) if company_id and company_id.strip()]
        self.company_limit = company_limit

        self.event_bus.on("group1_completed", self._handle_group1_completed)
        self.event_bus.on("group2_completed", self._handle_group2_completed)
        self.event_bus.on("group3_completed", self._handle_group3_completed)

    def execute(self) -> dict:
        self._update_run(status="running", current_group="group1", progress_pct=5)
        self.company_ids = self._get_company_ids()
        self.shared_state.set_workflow_meta(self.workflow_run_id, {
            "period": self.period,
            "company_ids": self.company_ids,
            "company_count": len(self.company_ids),
            "started_at": datetime.now(timezone.utc).isoformat(),
        })

        self._run_group1_parallel()
        self.event_bus.emit("group1_completed")

        self._complete_run()
        return {"workflow_run_id": self.workflow_run_id, "status": "completed", "period": self.period}

    def _run_group1_parallel(self) -> None:
        with ThreadPoolExecutor(max_workers=min(max(1, int(settings.WORKFLOW_COMPANY_CONCURRENCY)), max(1, len(self.company_ids)))) as pool:
            futures = [pool.submit(self._run_group1_for_company, company_id) for company_id in self.company_ids]
            for future in as_completed(futures):
                try:
                    future.result()
                except Exception as exc:
                    logger.error(f"Group1 company execution failed: {exc}")

    def _run_group1_for_company(self, company_id: str) -> None:
        with ThreadPoolExecutor(max_workers=max(1, int(settings.WORKFLOW_GROUP_AGENT_CONCURRENCY))) as company_pool:
            futures = [
                company_pool.submit(self._run_agent_with_retry, "trial_balance_validator", build_trial_balance_validator, company_id, f"Run trial balance validation for {company_id} in period {self.period}."),
                company_pool.submit(self._run_agent_with_retry, "variance_analysis", build_variance_analysis_agent, company_id, f"Run variance analysis for {company_id} in period {self.period}."),
                company_pool.submit(self._run_agent_with_retry, "cash_flow_reconciliation", build_cash_flow_reconciliation_agent, company_id, f"Run cash flow reconciliation for {company_id} in period {self.period}."),
            ]
            outputs = []
            for future in as_completed(futures):
                try:
                    outputs.append(future.result())
                except Exception as exc:
                    logger.error(f"Group1 agent failed for {company_id}: {exc}")
                    outputs.append(f"ERROR: {str(exc)}")

        self.shared_state.set_handoff(self.workflow_run_id, company_id, "group1", outputs)
        self._persist_handoff_db(company_id=company_id, stage="group1", payload=outputs)

    def _handle_group1_completed(self) -> None:
        self._update_run(status="running", current_group="group2", progress_pct=45)

        with ThreadPoolExecutor(max_workers=min(max(1, int(settings.WORKFLOW_COMPANY_CONCURRENCY)), max(1, len(self.company_ids)))) as pool:
            futures = [pool.submit(self._run_group2_for_company, company_id) for company_id in self.company_ids]
            for future in as_completed(futures):
                try:
                    future.result()
                except Exception as exc:
                    logger.error(f"Group2 company execution failed: {exc}")

        self.event_bus.emit("group2_completed")

    def _run_group2_for_company(self, company_id: str) -> None:
        outputs = []
        outputs.append(self._run_agent_with_retry_safe(
            "accrual_verification",
            build_accrual_verification_agent,
            company_id,
            f"Run accrual verification for {company_id} in period {self.period}."
        ))
        outputs.append(self._run_agent_with_retry_safe(
            "revenue_recognition",
            build_revenue_recognition_agent,
            company_id,
            f"Run revenue recognition analysis for {company_id} in period {self.period}. Industry context should be inferred from company profile."
        ))
        outputs.append(self._run_agent_with_retry_safe(
            "expense_categorization",
            build_expense_categorization_agent,
            company_id,
            f"Run expense categorization review for {company_id} in period {self.period}."
        ))
        self.shared_state.set_handoff(self.workflow_run_id, company_id, "group2", outputs)
        self._persist_handoff_db(company_id=company_id, stage="group2", payload=outputs)

    def _persist_handoff_db(self, company_id: str, stage: str, payload: list[str]) -> None:
        db = SessionLocal()
        try:
            existing = db.query(WorkflowHandoff).filter(
                WorkflowHandoff.workflow_run_id == self.workflow_run_id,
                WorkflowHandoff.company_id == company_id,
                WorkflowHandoff.stage == stage,
            ).first()

            raw_payload = json.dumps(payload)
            if existing:
                existing.payload = raw_payload
            else:
                db.add(
                    WorkflowHandoff(
                        workflow_run_id=self.workflow_run_id,
                        company_id=company_id,
                        stage=stage,
                        payload=raw_payload,
                    )
                )
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("Failed to persist workflow handoff to DB")
        finally:
            db.close()

    def _handle_group2_completed(self) -> None:
        self._update_run(status="running", current_group="group3", progress_pct=70)

        intercompany_output = self._run_agent_with_retry_safe(
            "intercompany_elimination",
            build_intercompany_elimination_agent,
            None,
            (
                f"Run intercompany elimination ONLY for these companies in period {self.period}: "
                f"{', '.join(self.company_ids)}. Ignore all other companies."
            )
        )

        self.shared_state.set_workflow_meta(self.workflow_run_id, {
            "group3": "completed",
            "intercompany_output": intercompany_output,
        })

        self.event_bus.emit("group3_completed")

    def _handle_group3_completed(self) -> None:
        self._update_run(status="running", current_group="group4", progress_pct=85)

        consolidation_output = self._run_agent_with_retry_safe(
            "consolidation",
            build_consolidation_agent,
            None,
            (
                f"Run portfolio consolidation ONLY for these companies in period {self.period}: "
                f"{', '.join(self.company_ids)}. Ignore all other companies."
            )
        )
        reporting_output = self._run_agent_with_retry_safe(
            "reporting_communication",
            build_reporting_agent,
            None,
            (
                f"Generate executive reporting and stakeholder communications ONLY for these companies "
                f"in period {self.period}: {', '.join(self.company_ids)}."
            )
        )

        self.shared_state.set_workflow_meta(self.workflow_run_id, {
            "group3": "completed",
            "group4": "completed",
            "consolidation_output": consolidation_output,
            "reporting_output": reporting_output,
        })

    def _run_agent_with_retry(
        self,
        agent_state_name: str,
        builder: AgentBuilder,
        company_id: Optional[str],
        prompt: str,
        max_retries: int = 3,
        base_backoff_seconds: float = 2.0,
    ) -> str:
        last_error = None

        for attempt in range(max_retries):
            db = SessionLocal()
            try:
                update_agent_state(db, agent_state_name, "running", company_id)
                agent = builder({"db": db})
                with self._llm_semaphore:
                    result = agent.run(prompt)
                content = getattr(result, "content", str(result)) if result else ""

                if self._looks_like_rate_limit_error(content):
                    raise RuntimeError(f"Rate limit response received from model: {content[:500]}")

                log_agent_action(
                    db=db,
                    agent_name=agent_state_name,
                    action=f"{agent_state_name} completed",
                    company_id=company_id,
                    details=content[:6000] if content else None,
                    severity="success",
                )
                update_agent_state(db, agent_state_name, "idle", company_id)
                return content or ""
            except Exception as exc:
                last_error = exc
                update_agent_state(db, agent_state_name, "failed", company_id)
                log_agent_action(
                    db=db,
                    agent_name=agent_state_name,
                    action=f"{agent_state_name} failed (attempt {attempt + 1}/{max_retries})",
                    company_id=company_id,
                    details=str(exc),
                    severity="error",
                )
                if attempt < max_retries - 1:
                    wait_seconds = base_backoff_seconds * (2 ** attempt)
                    time.sleep(wait_seconds)
            finally:
                db.close()

        raise RuntimeError(f"{agent_state_name} failed after {max_retries} attempts: {last_error}")

    def _run_agent_with_retry_safe(
        self,
        agent_state_name: str,
        builder: AgentBuilder,
        company_id: Optional[str],
        prompt: str,
        max_retries: int = 3,
        base_backoff_seconds: float = 2.0,
    ) -> str:
        try:
            return self._run_agent_with_retry(
                agent_state_name=agent_state_name,
                builder=builder,
                company_id=company_id,
                prompt=prompt,
                max_retries=max_retries,
                base_backoff_seconds=base_backoff_seconds,
            )
        except Exception as exc:
            logger.error(f"{agent_state_name} failed in safe mode: {exc}")
            return f"ERROR: {str(exc)}"

    @staticmethod
    def _looks_like_rate_limit_error(content: str) -> bool:
        if not content:
            return False
        lowered = content.lower()
        markers = (
            "rate_limit_exceeded",
            "error code: 429",
            "429 too many requests",
            "tokens per minute",
        )
        return any(marker in lowered for marker in markers)

    def _get_company_ids(self) -> list[str]:
        db = SessionLocal()
        try:
            normalized_requested_ids: list[str] = []
            if self.requested_company_ids:
                normalized_requested_ids = self.requested_company_ids
            else:
                configured_ids = [
                    company_id.strip()
                    for company_id in str(settings.WORKFLOW_TARGET_COMPANY_IDS or "").split(",")
                    if company_id and company_id.strip()
                ]
                if configured_ids:
                    normalized_requested_ids = configured_ids

            if normalized_requested_ids:
                available = {
                    row[0]
                    for row in db.query(Company.id)
                    .filter(Company.id.in_(normalized_requested_ids))
                    .all()
                }
                selected = [company_id for company_id in normalized_requested_ids if company_id in available]
            else:
                selected = [company.id for company in db.query(Company).order_by(Company.id.asc()).all()]

                effective_limit = self.company_limit
                if effective_limit is None:
                    effective_limit = int(settings.WORKFLOW_TARGET_COMPANY_LIMIT or 0)

                if effective_limit and effective_limit > 0:
                    selected = selected[:effective_limit]

            if not selected:
                raise ValueError("No companies selected for workflow run")

            return selected
        finally:
            db.close()

    def _update_run(
        self,
        status: str,
        current_group: Optional[str] = None,
        progress_pct: Optional[float] = None,
        error_message: Optional[str] = None,
    ) -> None:
        db = SessionLocal()
        try:
            run = db.query(WorkflowRun).filter(WorkflowRun.id == self.workflow_run_id).first()
            if not run:
                return
            run.status = status
            if current_group is not None:
                run.current_group = current_group
            if progress_pct is not None:
                run.progress_pct = progress_pct
            if error_message is not None:
                run.error_message = error_message
            if status in ("completed", "failed"):
                run.completed_at = datetime.now(timezone.utc)
            db.commit()
        finally:
            db.close()

    def _complete_run(self) -> None:
        self._update_run(status="completed", current_group="completed", progress_pct=100)


def execute_workflow_run(
    workflow_run_id: int,
    period: str,
    company_ids: Optional[list[str]] = None,
    company_limit: Optional[int] = None,
) -> dict:
    executor = MonthEndWorkflowExecutor(
        workflow_run_id=workflow_run_id,
        period=period,
        company_ids=company_ids,
        company_limit=company_limit,
    )
    try:
        return executor.execute()
    except Exception as exc:
        executor._update_run(status="failed", error_message=str(exc))
        logger.error("Workflow execution failed", exc_info=True)
        raise
