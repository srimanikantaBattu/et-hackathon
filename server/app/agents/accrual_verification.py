from agno.agent import Agent
from app.agents.base import get_groq_model

def build_accrual_verification_agent(db_tools: dict) -> Agent:
    from app.agents.tools import get_trial_balance, get_accrual_schedule, save_alert, log_action

    def verify_accruals(company_id: str, period: str) -> str:
        """Check whether expected accruals are booked in the trial balance."""
        import json
        tb = get_trial_balance(company_id, period, db_tools["db"])
        schedule = get_accrual_schedule(company_id, db_tools["db"])
        if "error" in tb:
            return json.dumps(tb)
        accrued_expenses_balance = sum(r["credit"] for r in tb.get("rows", []) if "Accrued Expenses" in r.get("account_name", ""))
        expected_monthly = schedule.get("monthly_total", 0)
        is_december = period.endswith("-12")
        has_bonus = any("Bonus" in r.get("account_name", "") for r in tb.get("rows", []))
        log_action("accrual_verification", f"Checking accruals: expected ${expected_monthly:,.0f}, booked ${accrued_expenses_balance:,.0f}", company_id, None, "info", db_tools["db"])
        return json.dumps({
            "company_id": company_id,
            "period": period,
            "expected_monthly_accruals": round(expected_monthly, 2),
            "booked_accrued_expenses": round(accrued_expenses_balance, 2),
            "gap": round(expected_monthly - accrued_expenses_balance, 2),
            "is_december": is_december,
            "has_bonus_accrual": has_bonus,
            "accrual_items": schedule.get("accruals", [])[:10],
        })

    def flag_missing_accrual(company_id: str, title: str, description: str, amount: float) -> str:
        """Flag a missing accrual as a warning alert."""
        result = save_alert(company_id, "missing_accrual", "warning", title, description, None, amount, None, db_tools["db"])
        log_action("accrual_verification", title, company_id, description, "warning", db_tools["db"])
        import json
        return json.dumps(result)

    return Agent(
        name="Accrual Verification Agent",
        role="Verify all required accruals are booked. Check for missing month-end accruals, December bonus accruals, prepaid amortization, and deferred revenue adjustments.",
        model=get_groq_model(),
        tools=[verify_accruals, flag_missing_accrual],
        instructions=[
            "You are a CPA-level AI reviewing month-end accruals for accuracy and completeness.",
            "Call verify_accruals to compare booked accruals vs the expected accrual schedule.",
            "If gap > 50% of expected, call flag_missing_accrual with the gap amount.",
            "In December, always check for bonus accruals - flag if has_bonus_accrual is False.",
            "List recommended journal entries for any missing items.",
            "Format: Show ✓ properly booked items and ✗ missing items with recommended entries.",
            "NEVER output raw <function> tags in your text response. ALWAYS use native JSON tool calling.",
        ],
        markdown=True,
    )
