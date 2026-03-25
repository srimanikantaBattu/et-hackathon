from agno.agent import Agent
from app.agents.base import get_groq_model

def build_trial_balance_validator(db_tools: dict) -> Agent:
    """
    Validates trial balances: checks debit=credit, flags negative asset balances,
    reconciles accounts according to GAAP rules.
    """
    from app.agents.tools import get_trial_balance, save_alert, log_action

    def check_trial_balance(company_id: str, period: str) -> str:
        """Fetch and validate the trial balance for a company and period. Returns a JSON summary."""
        import json
        result = get_trial_balance(company_id, period, db_tools["db"])
        if "error" in result:
            return json.dumps(result)
        # Log the check
        log_action("trial_balance_validator", f"Fetched trial balance: {len(result['rows'])} rows", company_id, None, "info", db_tools["db"])
        return json.dumps({
            "company_id": company_id,
            "period": period,
            "total_debits": result["total_debits"],
            "total_credits": result["total_credits"],
            "is_balanced": result["is_balanced"],
            "imbalance": round(result["total_debits"] - result["total_credits"], 2),
            "negative_asset_accounts": [
                r for r in result["rows"]
                if r["account_type"] == "Asset" and r["balance"] < -1000
                and "Accumulated" not in r["account_name"] and "Allowance" not in r["account_name"]
            ]
        })

    def flag_balance_issue(company_id: str, title: str, description: str, amount: float) -> str:
        """Save a critical balance issue as an alert in the system."""
        result = save_alert(company_id, "balance_error", "critical", title, description, None, amount, None, db_tools["db"])
        log_action("trial_balance_validator", title, company_id, description, "error", db_tools["db"])
        import json
        return json.dumps(result)

    return Agent(
        name="Trial Balance Validator",
        role="Validate trial balance integrity: verify debits equal credits, flag negative asset balances, and identify reconciliation issues for each portfolio company.",
        model=get_groq_model(),
        tools=[check_trial_balance, flag_balance_issue],
        instructions=[
            "You are a senior accounting AI specialized in trial balance validation.",
            "For each company: call check_trial_balance to get the data.",
            "If is_balanced is False, call flag_balance_issue with the imbalance amount.",
            "If any negative asset accounts exist (excluding contra-accounts), flag them.",
            "Report findings in a structured manner: ✓ OK accounts, ⚠ warnings, ✗ errors.",
            "Be precise with dollar amounts and account codes.",
        ],
        markdown=True,
        add_datetime_to_context=True,
    )
