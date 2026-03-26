from agno.agent import Agent
from app.agents.base import get_groq_model
from datetime import datetime

def build_variance_analysis_agent(db_tools: dict) -> Agent:
    from app.agents.tools import get_trial_balance, get_budget_for_period, save_alert, log_action

    def _to_float(value, default: float = 0.0) -> float:
        try:
            return float(value) if value is not None else default
        except (TypeError, ValueError):
            return default

    def _previous_period(period: str) -> str:
        dt = datetime.strptime(period, "%Y-%m")
        if dt.month == 1:
            return f"{dt.year - 1}-12"
        return f"{dt.year}-{str(dt.month - 1).zfill(2)}"

    def _impact_label(account_type: str, variance_amount: float) -> str:
        if abs(variance_amount) < 0.005:
            return "neutral"
        if account_type == "Revenue":
            return "favorable" if variance_amount > 0 else "unfavorable"
        if account_type in ("COGS", "Operating Expense"):
            return "favorable" if variance_amount < 0 else "unfavorable"
        return "neutral"

    def get_actual_vs_budget(company_id: str, period: str) -> str:
        """Compare actuals vs budget and prior month. Returns material variances >10% or >$50K."""
        import json
        parts = period.split("-")
        year, month = int(parts[0]), int(parts[1])
        tb = get_trial_balance(company_id, period, db_tools["db"])
        prior_tb = get_trial_balance(company_id, _previous_period(period), db_tools["db"])
        budget = get_budget_for_period(company_id, year, month, db_tools["db"])
        if "error" in tb:
            return json.dumps(tb)

        budget_map = {b["account_code"]: b["budget_amount"] for b in budget["budget_items"]}
        prior_map = {
            r.get("account_code"): abs(_to_float(r.get("balance")))
            for r in prior_tb.get("rows", [])
        } if isinstance(prior_tb, dict) and "rows" in prior_tb else {}

        variances = []
        for row in tb.get("rows", []):
            if row["account_type"] not in ("Revenue", "COGS", "Operating Expense"):
                continue
            bud = _to_float(budget_map.get(row["account_code"]))
            prior_actual = _to_float(prior_map.get(row["account_code"]))
            actual = abs(_to_float(row.get("balance")))

            if bud == 0:
                continue

            var_amt_budget = actual - bud
            var_pct_budget = (var_amt_budget / bud * 100) if bud else 0

            has_prior = prior_actual != 0
            var_amt_mom = (actual - prior_actual) if has_prior else 0.0
            var_pct_mom = (var_amt_mom / prior_actual * 100) if has_prior else None

            is_material_budget = abs(var_pct_budget) >= 10 or abs(var_amt_budget) >= 50000
            is_material_mom = has_prior and (
                (var_pct_mom is not None and abs(var_pct_mom) >= 10) or abs(var_amt_mom) >= 50000
            )

            if is_material_budget or is_material_mom:
                variances.append({
                    "account_code": row["account_code"],
                    "account_name": row["account_name"],
                    "account_type": row["account_type"],
                    "actual": round(actual, 2),
                    "budget": round(bud, 2),
                    "prior_month_actual": round(prior_actual, 2) if has_prior else None,
                    "variance_amount": round(var_amt_budget, 2),
                    "variance_pct": round(var_pct_budget, 1),
                    "variance_to_budget_amount": round(var_amt_budget, 2),
                    "variance_to_budget_pct": round(var_pct_budget, 1),
                    "variance_to_prior_month_amount": round(var_amt_mom, 2) if has_prior else None,
                    "variance_to_prior_month_pct": round(var_pct_mom, 1) if var_pct_mom is not None else None,
                    "impact_vs_budget": _impact_label(row["account_type"], var_amt_budget),
                    "impact_vs_prior_month": _impact_label(row["account_type"], var_amt_mom) if has_prior else "neutral",
                    "materiality_basis": [
                        basis for basis, triggered in {
                            "budget": is_material_budget,
                            "prior_month": is_material_mom,
                        }.items() if triggered
                    ],
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
