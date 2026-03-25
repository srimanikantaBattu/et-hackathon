from agno.team import Team
from agno.workflow import Workflow, Step
from agno.team.mode import TeamMode
from app.agents.base import get_groq_model, get_postgres_db

# Import all individual agents
from app.agents.trial_balance_validator import build_trial_balance_validator
from app.agents.variance_analysis import build_variance_analysis_agent
from app.agents.cash_flow_reconciliation import build_cash_flow_reconciliation_agent
from app.agents.accrual_verification import build_accrual_verification_agent
from app.agents.revenue_recognition import build_revenue_recognition_agent
from app.agents.expense_categorization import build_expense_categorization_agent
from app.agents.intercompany_elimination import build_intercompany_elimination_agent
from app.agents.consolidation import build_consolidation_agent
from app.agents.reporting_communication import build_reporting_agent

# ──────────────────────────────────────────────────────────────────
# TEAM: Per-Company Close Team (Group 1: parallel per-company agents)
# ──────────────────────────────────────────────────────────────────

def build_per_company_team(db_tools: dict, company_id: str) -> Team:
    """
    Creates the per-company validation team that runs Trial Balance,
    Variance Analysis, and Cash Flow checks for a single company.
    Uses TeamMode.coordinate so the team leader delegates to appropriate specialist.
    """
    tb_agent = build_trial_balance_validator(db_tools)
    variance_agent = build_variance_analysis_agent(db_tools)
    cashflow_agent = build_cash_flow_reconciliation_agent(db_tools)

    return Team(
        name=f"Close Team: {company_id}",
        members=[tb_agent, variance_agent, cashflow_agent],
        model=get_groq_model(),
        mode=TeamMode.coordinate,
        instructions=[
            f"You are coordinating the month-end close for {company_id}.",
            "Run Trial Balance Validator first. If it passes, delegate to Variance Analysis Agent.",
            "Then delegate to Cash Flow Reconciliation Agent.",
            "Collect all findings and produce a company-level close summary.",
        ],
        markdown=True,
    )


# ──────────────────────────────────────────────────────────────────
# TEAM: Sequential Processing Team (Group 2: accrual, revRec, expense)
# ──────────────────────────────────────────────────────────────────

def build_sequential_team(db_tools: dict, company_id: str) -> Team:
    accrual_agent = build_accrual_verification_agent(db_tools)
    rev_rec_agent = build_revenue_recognition_agent(db_tools)
    expense_agent = build_expense_categorization_agent(db_tools)

    return Team(
        name=f"Accounting Team: {company_id}",
        members=[accrual_agent, rev_rec_agent, expense_agent],
        model=get_groq_model(),
        mode=TeamMode.coordinate,
        instructions=[
            f"You are running sequential accounting checks for {company_id}.",
            "Step 1: Accrual Verification Agent checks for missing entries.",
            "Step 2: Revenue Recognition Agent validates ASC 606 compliance.",
            "Step 3: Expense Categorization Agent reviews GL accounts.",
            "Share findings across agents to avoid duplicate flags.",
        ],
        markdown=True,
    )


# ──────────────────────────────────────────────────────────────────
# ORCHESTRATOR TEAM (Agent 1): Master Controller using TeamMode.tasks
# ──────────────────────────────────────────────────────────────────

def build_orchestrator_team(db_tools: dict, period: str = "2026-01") -> Team:
    """
    The main orchestrator that coordinates all 10 agents.
    Uses TeamMode.tasks so it can plan and sequence all work.
    """
    from app.models.company import Company

    companies = db_tools["db"].query(Company).all()

    # Build all specialist agents
    ic_agent = build_intercompany_elimination_agent(db_tools)
    consolidation_agent = build_consolidation_agent(db_tools)
    reporting_agent = build_reporting_agent(db_tools)

    # Build per-company teams (one close team per company)
    per_company_teams = [build_per_company_team(db_tools, c.id) for c in companies]
    sequential_teams = [build_sequential_team(db_tools, c.id) for c in companies]

    all_members = per_company_teams + sequential_teams + [ic_agent, consolidation_agent, reporting_agent]

    return Team(
        name="PE Firm Month-End Close Orchestrator",
        members=all_members,
        model=get_groq_model("llama-3.3-70b-versatile"),
        mode=TeamMode.coordinate,
        db=get_postgres_db(),
        add_history_to_context=True,
        instructions=[
            f"You are the master orchestrator for PE Firm Partners month-end close for period {period}.",
            "You manage 8 portfolio companies: TechForge SaaS, PrecisionMfg Inc, RetailCo, HealthServices Plus, LogisticsPro, IndustrialSupply Co, DataAnalytics Corp, EcoPackaging Ltd.",
            "",
            "EXECUTION ORDER:",
            "GROUP 1 (run in parallel): For each company, run 'Close Team: {company_id}' to validate trial balance, analyze variances, reconcile cash.",
            "GROUP 2 (run after Group 1): For each company, run 'Accounting Team: {company_id}' for accrual, revenue recognition, and expense checks.",
            "GROUP 3 (cross-company): Run Intercompany Elimination Agent across all companies.",
            "GROUP 4 (final): Run Consolidation Agent then Reporting & Communication Agent.",
            "",
            "Report overall close completion % as you progress through each group.",
            "Escalate CRITICAL alerts immediately. Summarize all WARNING alerts at the end.",
            "Send daily executive summary email via Reporting Agent.",
        ],
        markdown=True,
        max_iterations=20,
    )


# ──────────────────────────────────────────────────────────────────
# WORKFLOW: The full month-end close workflow using Agno Workflow
# ──────────────────────────────────────────────────────────────────

def build_month_end_workflow(db_tools: dict, period: str = "2026-01") -> Workflow:
    """
    Builds the complete Month-End Close Workflow using:
    - Parallel steps for concurrent per-company processing
    - Sequential steps for cross-company work
    - The full Agno Workflow(steps=[...]) pattern
    """
    from app.models.company import Company
    companies = db_tools["db"].query(Company).all()

    # Per-company parallel group
    per_company_steps = [
        Step(executor=build_per_company_team(db_tools, c.id))
        for c in companies
    ]

    # Sequential accounting per company
    sequential_steps = [
        Step(executor=build_sequential_team(db_tools, c.id))
        for c in companies
    ]

    # Cross-company and final steps
    ic_step = Step(executor=build_intercompany_elimination_agent(db_tools))
    consolidation_step = Step(executor=build_consolidation_agent(db_tools))
    reporting_step = Step(executor=build_reporting_agent(db_tools))

    return Workflow(
        name="PE Firm Month-End Close",
        db=get_postgres_db(),
        steps=[
            *per_company_steps,             # Group 1: all companies sequentially
            *sequential_steps,              # Group 2: sequential accounting per company
            ic_step,                        # Group 3: intercompany elimination
            consolidation_step,             # Group 4a: consolidation
            reporting_step,                 # Group 4b: reporting & email
        ],
    )
