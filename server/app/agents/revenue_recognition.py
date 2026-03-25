from agno.agent import Agent
from app.agents.base import get_groq_model

def build_revenue_recognition_agent(db_tools: dict) -> Agent:
    from app.agents.tools import get_trial_balance, save_alert, log_action

    def analyze_revenue(company_id: str, period: str, industry: str) -> str:
        """Analyze revenue recognition compliance for a company."""
        import json
        tb = get_trial_balance(company_id, period, db_tools["db"])
        if "error" in tb:
            return json.dumps(tb)
        rows = tb.get("rows", [])
        revenue = sum(abs(r["balance"]) for r in rows if r["account_type"] == "Revenue")
        deferred = sum(abs(r["balance"]) for r in rows if "Deferred Revenue" in r.get("account_name", ""))
        deferred_pct = round(deferred / revenue * 100, 1) if revenue else 0
        log_action("revenue_recognition", f"ASC 606 check: Revenue ${revenue:,.0f}, Deferred ${deferred:,.0f} ({deferred_pct}%)", company_id, None, "info", db_tools["db"])
        return json.dumps({
            "company_id": company_id,
            "period": period,
            "industry": industry,
            "total_revenue": round(revenue, 2),
            "deferred_revenue": round(deferred, 2),
            "deferred_as_pct_revenue": deferred_pct,
            "saas_flag": "saas" in company_id.lower() or "tech" in company_id.lower(),
        })

    def flag_rev_rec_issue(company_id: str, title: str, description: str, amount: float) -> str:
        """Save a revenue recognition concern as an alert."""
        result = save_alert(company_id, "revenue_timing", "warning", title, description, None, amount, None, db_tools["db"])
        log_action("revenue_recognition", title, company_id, description, "warning", db_tools["db"])
        import json
        return json.dumps(result)

    return Agent(
        name="Revenue Recognition Agent",
        role="Validate revenue recognition compliance per ASC 606. Checks deferred revenue adequacy for SaaS/subscription companies, identifies timing issues, and flags multi-element arrangement complexities.",
        model=get_groq_model(),
        tools=[analyze_revenue, flag_rev_rec_issue],
        instructions=[
            "You are a revenue recognition expert AI certified in ASC 606.",
            "Call analyze_revenue with the company's industry context.",
            "For SaaS/subscription companies: deferred revenue should be >50% of monthly revenue - flag if not.",
            "Check for unusual revenue spikes (>30% MoM) which may indicate cutoff issues.",
            "For manufacturing: verify revenue ties to shipped goods (no bill-and-hold risk).",
            "Flag multi-element arrangements that may need unbundling per ASC 606-10-25.",
            "Provide specific adjusting entry suggestions for any issues found.",
        ],
        markdown=True,
    )
