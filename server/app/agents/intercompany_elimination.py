from agno.agent import Agent
from app.agents.base import get_groq_model

def build_intercompany_elimination_agent(db_tools: dict) -> Agent:
    from app.agents.tools import get_intercompany_transactions, save_alert, log_action

    def fetch_ic_transactions(period: str) -> str:
        """Get all intercompany transactions for the period with elimination status."""
        import json
        result = get_intercompany_transactions(period, db_tools["db"])
        log_action("intercompany_elimination", f"IC transactions: {result['total_transactions']} total, ${result['amount_eliminated']:,.0f} eliminated", None, None, "info", db_tools["db"])
        return json.dumps(result)

    def eliminate_ic_pair(selling_entity: str, buying_entity: str, period: str, amount: float) -> str:
        """Mark intercompany transactions between a seller-buyer pair as eliminated."""
        from app.models.alert import IntercompanyTransaction
        from sqlalchemy import and_
        txns = db_tools["db"].query(IntercompanyTransaction).filter(
            and_(
                IntercompanyTransaction.selling_entity_id == selling_entity,
                IntercompanyTransaction.buying_entity_id == buying_entity,
                IntercompanyTransaction.period == period,
                IntercompanyTransaction.is_eliminated == False,
            )
        ).all()
        count = len(txns)
        for t in txns:
            t.is_eliminated = True
        db_tools["db"].commit()
        log_action("intercompany_elimination", f"Eliminated {count} IC entries: {selling_entity} → {buying_entity}", None, f"Amount: ${amount:,.0f}", "success", db_tools["db"])
        import json
        return json.dumps({"eliminated": count, "seller": selling_entity, "buyer": buying_entity, "period": period})

    def flag_ic_issue(description: str, amount: float) -> str:
        """Flag an intercompany reconciliation issue."""
        result = save_alert(None, "ic_mismatch", "warning", "IC Elimination Issue", description, None, amount, None, db_tools["db"])
        import json
        return json.dumps(result)

    return Agent(
        name="Intercompany Elimination Agent",
        role="Identify, validate, and eliminate all intercompany transactions across the 8 portfolio companies. Ensure IC balances net to zero at consolidation per GAAP rules.",
        model=get_groq_model(),
        tools=[fetch_ic_transactions, eliminate_ic_pair, flag_ic_issue],
        instructions=[
            "You are an intercompany reconciliation specialist AI.",
            "Call fetch_ic_transactions to get all IC activity for the period.",
            "1. fetch_ic_transactions across all companies.",
            "2. eliminate_ic_pair for matching transactions.",
            "3. flag_ic_issue for unmatched/one-sided entries.",
            "Output a markdown reconciliation report.",
            "NEVER output raw <function> tags in your text response. ALWAYS use native JSON tool calling.",
            "Flag any missing reciprocal entries (seller has receivable but buyer has no payable).",
            "Report: Total IC volume | Eliminated | Remaining | Issues found",
        ],
        markdown=True,
    )
