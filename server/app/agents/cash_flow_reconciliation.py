from agno.agent import Agent
from app.agents.base import get_groq_model

def build_cash_flow_reconciliation_agent(db_tools: dict) -> Agent:
    from app.agents.tools import get_trial_balance, save_alert, log_action
    import pandas as pd

    def reconcile_cash(company_id: str, period: str) -> str:
        """Reconcile cash account balance against bank statement data."""
        import json
        from pathlib import Path
        DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"
        tb = get_trial_balance(company_id, period, db_tools["db"])
        if "error" in tb:
            return json.dumps(tb)
        cash_rows = [r for r in tb.get("rows", []) if "Cash" in r.get("account_name", "") and r["account_type"] == "Asset" and "Accumulated" not in r.get("account_name", "")]
        gl_cash = sum(r["balance"] for r in cash_rows)

        # Load bank statement
        period_formatted = period.replace("-", "_")
        bank_file = DATA_DIR / "bank_statements" / f"{company_id}_{period_formatted}.csv"
        bank_ending = None
        if bank_file.exists():
            bank_df = pd.read_csv(bank_file)
            bank_df_numeric = bank_df[pd.to_numeric(bank_df["balance"], errors="coerce").notna()]
            if not bank_df_numeric.empty:
                bank_ending = float(pd.to_numeric(bank_df_numeric["balance"]).iloc[-1])
        reconciling_diff = round(gl_cash - bank_ending, 2) if bank_ending is not None else None
        log_action("cash_flow_reconciliation", f"Cash GL: ${gl_cash:,.0f} | Bank: ${bank_ending:,.0f if bank_ending else 0}", company_id, None, "info", db_tools["db"])
        return json.dumps({
            "company_id": company_id,
            "period": period,
            "gl_cash_balance": round(gl_cash, 2),
            "bank_statement_ending": bank_ending,
            "reconciling_difference": reconciling_diff,
            "is_reconciled": abs(reconciling_diff) < 100 if reconciling_diff is not None else False,
        })

    def flag_cash_discrepancy(company_id: str, description: str, amount: float) -> str:
        """Save a cash reconciliation discrepancy as a critical alert."""
        result = save_alert(company_id, "cash_discrepancy", "critical", "Cash Reconciliation Discrepancy", description, None, amount, 1000, db_tools["db"])
        log_action("cash_flow_reconciliation", "Cash discrepancy flagged", company_id, description, "error", db_tools["db"])
        import json
        return json.dumps(result)

    return Agent(
        name="Cash Flow Reconciliation Agent",
        role="Reconcile GL cash balances against bank statement data. Identify outstanding items, unusual cash movements, and validate cash flow statement indirect method calculations.",
        model=get_groq_model(),
        tools=[reconcile_cash, flag_cash_discrepancy],
        instructions=[
            "You are a treasury and cash management AI.",
            "Call reconcile_cash to compare GL vs bank for each company.",
            "If reconciling_difference > $100, call flag_cash_discrepancy.",
            "Analyze unusual cash movements (large single payments, unidentified credits).",
            "Calculate operating/investing/financing cash flows using indirect method.",
            "List outstanding checks and deposits-in-transit to explain reconciling items.",
        ],
        markdown=True,
    )
