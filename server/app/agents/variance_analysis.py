from agno.agent import Agent
from app.agents.base import get_groq_model

def build_variance_analysis_agent(db_tools: dict) -> Agent:
    from app.agents.tools import get_trial_balance, get_budget_for_period, save_alert, log_action

    def get_actual_vs_budget(company_id: str, period: str) -> str:
        """Compare actual trial balance vs budget for a company. Returns variances > 10% or > $50K."""
        import json
        parts = period.split("-")
        year, month = int(parts[0]), int(parts[1])
        tb = get_trial_balance(company_id, period, db_tools["db"])
        budget = get_budget_for_period(company_id, year, month, db_tools["db"])
        if "error" in tb:
            return json.dumps(tb)

        budget_map = {b["account_code"]: b["budget_amount"] for b in budget["budget_items"]}
        variances = []
        for row in tb.get("rows", []):
            if row["account_type"] not in ("Revenue", "COGS", "Operating Expense"):
                continue
            bud = budget_map.get(row["account_code"])
            if not bud or bud == 0:
                continue
            actual = abs(row["balance"])
            var_amt = actual - bud
            var_pct = var_amt / bud * 100
            if abs(var_pct) >= 10 or abs(var_amt) >= 50000:
                variances.append({
                    "account_code": row["account_code"],
                    "account_name": row["account_name"],
                    "account_type": row["account_type"],
                    "actual": round(actual, 2),
                    "budget": round(bud, 2),
                    "variance_amount": round(var_amt, 2),
                    "variance_pct": round(var_pct, 1),
                })
        log_action("variance_analysis", f"Analyzed variances: {len(variances)} material items found", company_id, None, "info", db_tools["db"])
        return json.dumps({"company_id": company_id, "period": period, "material_variances": variances})

    def save_variance_alert(company_id: str, account_name: str, account_code: int, title: str, description: str, commentary: str, amount: float) -> str:
        """Persist a variance finding as an alert."""
        result = save_alert(company_id, "variance", "warning" if abs(amount) < 100000 else "critical", title, description, commentary, amount, account_code, db_tools["db"])
        log_action("variance_analysis", title, company_id, description, "warning", db_tools["db"])
        import json
        return json.dumps(result)

    return Agent(
        name="Variance Analysis Agent",
        role="Analyze actual vs budget variances for all P&L accounts. Flag material variances (>10% or >$50K) and provide AI-generated business commentary explaining root causes.",
        model=get_groq_model(),
        tools=[get_actual_vs_budget, save_variance_alert],
        instructions=[
            "You are a senior financial analyst AI specializing in variance analysis for PE portfolio companies.",
            "Use get_actual_vs_budget to retrieve variance data for the company and period.",
            "For each material variance, call save_variance_alert with a 2-sentence business commentary.",
            "Commentary should explain: (1) likely root cause, (2) recommended management action.",
            "Prioritize critical variances (>20% or >$100K) first.",
            "Format output as a variance table with columns: Account | Actual | Budget | Variance $ | Variance % | Commentary",
            "Use 🔴 for critical, 🟡 for warning variances.",
        ],
        markdown=True,
        add_datetime_to_context=True,
    )
