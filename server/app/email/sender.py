"""
Email sender using Resend API with Jinja2 templates.
"""
import logging
from pathlib import Path
from typing import Optional
from jinja2 import Environment, FileSystemLoader
import resend

from app.config import settings

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent / "templates"


def get_jinja_env():
    return Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))


def send_email_now(recipient_type: str, period: str, summary_text: str) -> dict:
    """Send an email via Resend API."""
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured - logging email instead")
        logger.info(f"EMAIL [{recipient_type}] Period: {period}\n{summary_text}")
        return {"status": "logged", "recipient_type": recipient_type}

    resend.api_key = settings.RESEND_API_KEY

    recipient_map = {
        "pe_partners": settings.EMAIL_TO_PARTNERS,
        "cfos": settings.EMAIL_TO_PARTNERS,  # use same for demo
    }
    to_email = recipient_map.get(recipient_type, settings.EMAIL_TO_PARTNERS)

    subject_map = {
        "pe_partners": f"PE Firm | Month-End Close Summary | {period}",
        "cfos": f"Portfolio Close Update | {period}",
    }

    try:
        params: resend.Emails.SendParams = {
            "from": settings.EMAIL_FROM,
            "to": [to_email],
            "subject": subject_map.get(recipient_type, f"Close Report - {period}"),
            "html": _render_email_html(period, summary_text, recipient_type),
        }
        email = resend.Emails.send(params)
        logger.info(f"Email sent to {recipient_type}: {email}")
        return {"status": "sent", "email_id": getattr(email, "id", str(email)), "recipient_type": recipient_type}
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return {"status": "failed", "error": str(e)}


def _render_email_html(period: str, summary_text: str, recipient_type: str) -> str:
    """Render email HTML using Jinja2 template or fallback to inline HTML."""
    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #1a1a2e; }}
    .header {{ background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; padding: 24px; border-radius: 8px 8px 0 0; }}
    .content {{ padding: 24px; background: #f8f9fa; }}
    .footer {{ padding: 16px; background: #e9ecef; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }}
    pre {{ background: white; padding: 16px; border-radius: 4px; border-left: 4px solid #6c63ff; white-space: pre-wrap; }}
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin:0">PE Firm Partners</h1>
    <p style="margin:4px 0 0">Month-End Close Report | {period}</p>
  </div>
  <div class="content">
    <h2>Executive Summary</h2>
    <pre>{summary_text}</pre>
  </div>
  <div class="footer">
    This report was generated autonomously by the PE Firm Agentic AI Platform.
    Recipient: {recipient_type.replace('_', ' ').title()} | Period: {period}
  </div>
</body>
</html>
"""
