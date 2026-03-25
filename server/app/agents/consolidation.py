from agno.agent import Agent
from app.agents.base import get_groq_model

def build_consolidation_agent(db_tools: dict) -> Agent:
    from app.agents.tools import get_consolidation_summary, log_action

    def _to_float(value, default: float = 0.0) -> float:
        try:
            return float(value) if value is not None else default
        except (TypeError, ValueError):
            return default

    def get_consolidated_financials(period: str) -> str:
        """Get consolidated P&L across all 8 portfolio companies after IC elimination."""
        import json
        summary = get_consolidation_summary(period, db_tools["db"])
        total_revenue = _to_float(summary.get("total_revenue"))
        ebitda = _to_float(summary.get("ebitda"))
        ebitda_margin_pct = _to_float(summary.get("ebitda_margin_pct"))
        log_action("consolidation", f"Consolidated: Revenue ${total_revenue:,.0f} | EBITDA ${ebitda:,.0f} ({ebitda_margin_pct}%)", None, None, "info", db_tools["db"])
        return json.dumps(summary)

    def update_close_status_all(period: str) -> str:
        """Mark all companies as close_complete after consolidation."""
        import json
        from app.models.company import Company
        companies = db_tools["db"].query(Company).all()
        for c in companies:
            c.status = "complete"
            c.close_completion_pct = 100.0
        db_tools["db"].commit()
        log_action("consolidation", f"All {len(companies)} companies marked as close-complete for {period}", None, None, "success", db_tools["db"])
        return json.dumps({"updated": len(companies), "period": period, "status": "complete"})

    return Agent(
        name="Consolidation Agent",
        role="Aggregate financial data from all 8 portfolio companies. Apply GAAP consolidation rules (after IC eliminations are done). Generate consolidated P&L, Balance Sheet, and Cash Flow Statement.",
        model=get_groq_model(),
        tools=[get_consolidated_financials, update_close_status_all],
        instructions=[
            "You are a consolidation accounting AI following US GAAP ASC 810.",
            "Call get_consolidated_financials to get the aggregate data.",
            "Present consolidated P&L: Revenue | COGS | Gross Profit | OpEx | EBITDA | EBITDA Margin",
            "Show per-company contribution table sorted by revenue.",
            "Highlight top/bottom performers by EBITDA margin.",
            "After analysis, call update_close_status_all to mark close as complete.",
            "Note: IC eliminations are handled by the Intercompany Elimination Agent before this step.",
        ],
        markdown=True,
    )
