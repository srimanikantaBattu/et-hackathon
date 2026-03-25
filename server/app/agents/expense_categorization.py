from agno.agent import Agent
from app.agents.base import get_groq_model

def build_expense_categorization_agent(db_tools: dict) -> Agent:
    from app.agents.tools import get_trial_balance, save_alert, log_action

    def review_expenses(company_id: str, period: str) -> str:
        """Review expense GL accounts for miscategorizations and unusual items."""
        import json
        tb = get_trial_balance(company_id, period, db_tools["db"])
        if "error" in tb:
            return json.dumps(tb)
        rows = tb.get("rows", [])
        # Identify potential miscategorizations
        cogs_rows = [r for r in rows if r["account_type"] == "COGS"]
        opex_rows = [r for r in rows if r["account_type"] == "Operating Expense"]
        # Flag large marketing-type expenses in COGS
        suspicious = []
        for r in cogs_rows:
            if any(kw in r["account_name"].lower() for kw in ["marketing", "sales", "advertising", "travel"]):
                suspicious.append(r)
        log_action("expense_categorization", f"Reviewed {len(cogs_rows)} COGS + {len(opex_rows)} OpEx lines. {len(suspicious)} potential miscategorizations.", company_id, None, "info", db_tools["db"])
        return json.dumps({
            "company_id": company_id,
            "period": period,
            "cogs_items": [{"account_code": r["account_code"], "account_name": r["account_name"], "balance": r["balance"]} for r in cogs_rows],
            "opex_items": [{"account_code": r["account_code"], "account_name": r["account_name"], "balance": r["balance"]} for r in opex_rows],
            "suspicious_cogs": suspicious,
        })

    def flag_miscategorization(company_id: str, account_name: str, account_code: int, description: str, amount: float) -> str:
        """Flag a potential expense miscategorization."""
        result = save_alert(company_id, "miscategorization", "warning",
                           f"Possible Miscategorization: {account_name}",
                           description, None, amount, account_code, db_tools["db"])
        log_action("expense_categorization", f"Miscategorization flagged: {account_name}", company_id, description, "warning", db_tools["db"])
        import json
        return json.dumps(result)

    return Agent(
        name="Expense Categorization Agent",
        role="Review all expense GL accounts for miscategorizations. Ensure COGS contains only direct production costs, reclassify SG&A incorrectly placed in COGS, and validate department/cost center allocations.",
        model=get_groq_model(),
        tools=[review_expenses, flag_miscategorization],
        instructions=[
            "You are a management accountant AI specializing in expense classification per GAAP.",
            "Call review_expenses to get all COGS and OpEx line items.",
            "If suspicious_cogs has items (marketing/sales/travel in COGS), call flag_miscategorization.",
            "Check if R&D is properly separated from COGS for tech companies.",
            "Suggest reclassification journal entries: Dr [correct account] Cr [original account].",
            "Format: Show a reclassification table with Before | After | JE Required columns.",
        ],
        markdown=True,
    )
