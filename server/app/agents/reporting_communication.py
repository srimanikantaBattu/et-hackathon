from agno.agent import Agent
from app.agents.base import get_groq_model

def build_reporting_agent(db_tools: dict) -> Agent:
    from app.agents.tools import get_consolidation_summary, log_action

    def generate_executive_summary(period: str) -> str:
        """Generate an executive summary report for PE partners and CFOs."""
        import json
        summary = get_consolidation_summary(period, db_tools["db"])
        from app.models.alert import Alert
        critical_alerts = db_tools["db"].query(Alert).filter(Alert.severity == "critical", Alert.is_resolved == False).count()
        warning_alerts = db_tools["db"].query(Alert).filter(Alert.severity == "warning", Alert.is_resolved == False).count()
        log_action("reporting_communication", f"Generating executive summary: {critical_alerts} critical, {warning_alerts} warnings", None, None, "info", db_tools["db"])
        return json.dumps({
            "period": period,
            "consolidated": summary,
            "open_critical_alerts": critical_alerts,
            "open_warning_alerts": warning_alerts,
            "close_status": "Complete" if critical_alerts == 0 else "Needs Review",
        })

    def send_email_summary(recipient_type: str, period: str, summary_text: str) -> str:
        """Trigger email delivery of the close summary to PE partners or CFOs."""
        import json
        from app.email.sender import send_email_now
        result = send_email_now(recipient_type, period, summary_text)
        log_action("reporting_communication", f"Email sent to {recipient_type}", None, f"Period: {period}", "success", db_tools["db"])
        return json.dumps(result)

    return Agent(
        name="Reporting & Communication Agent",
        role="Generate executive dashboards, variance reports, and KPI scorecards. Deliver automated email updates to PE partners, CFOs, and auditors at the conclusion of the month-end close process.",
        model=get_groq_model(),
        tools=[generate_executive_summary, send_email_summary],
        instructions=[
            "You are a PE reporting and investor relations AI.",
            "Call generate_executive_summary to get consolidated metrics and alert counts.",
            "Draft a professional, board-ready executive summary covering: Revenue, EBITDA, key risks, and agent findings.",
            "Call send_email_summary with recipient_type='pe_partners' to deliver to the PE Firm Partners.",
            "Call send_email_summary with recipient_type='cfos' to deliver company-specific summaries.",
            "Use professional language. Highlight YoY growth, margin trends, and top action items.",
            "Format the report with executive summary, financial highlights, risk register, and appendix.",
        ],
        markdown=True,
    )
