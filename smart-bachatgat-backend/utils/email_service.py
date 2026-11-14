import os
import asyncio
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

try:
    import certifi
    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
    os.environ.setdefault("REQUESTS_CA_BUNDLE", certifi.where())
except ImportError:
    pass

import resend

resend.api_key = os.getenv("RESEND_API_KEY")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "onboarding@resend.dev")
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
SMTP_TLS = os.getenv("SMTP_TLS", "true").strip().lower() != "false"
APP_URL = os.getenv("APP_URL", "http://localhost:5174")

logger = logging.getLogger(__name__)


def smtp_is_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASS and SENDER_EMAIL)


def _resend_from_address() -> str:
    """Resend only allows verified senders. Personal Gmail cannot be used as FROM."""
    if SENDER_EMAIL and "@gmail." not in SENDER_EMAIL.lower() and "@yahoo." not in SENDER_EMAIL.lower():
        return f"Smart Bachatgat <{SENDER_EMAIL}>"
    return "Smart Bachatgat <onboarding@resend.dev>"


def _send_via_smtp(to_email: str, subject: str, html_content: str):
    from_email = SENDER_EMAIL or SMTP_USER
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Smart Bachatgat <{from_email}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as server:
        if SMTP_TLS:
            server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(from_email, [to_email], msg.as_string())


def _send_via_resend(to_email: str, subject: str, html_content: str):
    params = {
        "from": _resend_from_address(),
        "to": [to_email],
        "subject": subject,
        "html": html_content,
    }
    if SENDER_EMAIL and "onboarding@resend.dev" in params["from"]:
        params["reply_to"] = SENDER_EMAIL
    return resend.Emails.send(params)


async def send_email_async(to_email: str, subject: str, html_content: str):
    """Send email: Gmail SMTP first (reliable), then Resend."""
    try:
        if smtp_is_configured():
            await asyncio.to_thread(_send_via_smtp, to_email, subject, html_content)
            logger.info("Email sent to %s via SMTP", to_email)
            return {"status": "success", "provider": "smtp"}

        if resend.api_key:
            email = await asyncio.to_thread(_send_via_resend, to_email, subject, html_content)
            logger.info("Email sent to %s via Resend", to_email)
            email_id = email.get("id") if isinstance(email, dict) else getattr(email, "id", None)
            return {"status": "success", "provider": "resend", "email_id": email_id}

        error_msg = (
            "Email not configured. Add Gmail SMTP in .env: "
            "SMTP_HOST=smtp.gmail.com, SMTP_USER, SMTP_PASS (app password), SENDER_EMAIL"
        )
        logger.error(error_msg)
        return {"status": "failed", "error": error_msg}
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, str(e))
        return {"status": "failed", "error": str(e)}


def create_registration_welcome_email(
    name: str,
    username: str,
    password_text: str,
    role: str = "member",
    otp_code: str | None = None,
    verify_link: str | None = None,
) -> str:
    otp_section = ""
    if otp_code or verify_link:
        otp_section = """
        <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:16px;margin:20px 0">
          <p style="margin:0 0 8px;font-weight:700;color:#92400e">Email verification</p>
        """
        if otp_code:
            otp_section += f'<p style="margin:0 0 8px;color:#b45309">4-digit code: <strong style="letter-spacing:4px;font-size:22px">{otp_code}</strong></p>'
        if verify_link:
            otp_section += f'<p style="margin:0"><a href="{verify_link}" style="color:#b45309;font-weight:700">Click here to verify your email</a></p>'
        otp_section += "</div>"

    return f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:24px;color:white;text-align:center">
        <h1 style="margin:0;font-size:22px">Welcome to Smart Bachatgat!</h1>
      </div>
      <div style="padding:28px">
        <p style="color:#0f172a;font-size:15px">Hello <strong>{name}</strong>,</p>
        <p style="color:#64748b">Your <strong>{role}</strong> account is ready.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:20px 0">
          <p style="margin:0 0 8px;font-weight:700;color:#166534">Your login details</p>
          <p style="margin:0 0 4px;color:#15803d">Username: <strong>{username}</strong></p>
          <p style="margin:0;color:#15803d">Password: <strong>{password_text}</strong></p>
        </div>
        {otp_section}
        <p style="color:#64748b;font-size:13px">Login: <a href="{APP_URL}/login">{APP_URL}/login</a></p>
      </div>
    </div>
    """


def create_welcome_email(name: str, username: str, password: str, role: str) -> str:
    return create_registration_welcome_email(name, username, password, role=role)


def create_payment_confirmation(name: str, amount: float, transaction_id: str, payment_date: str) -> str:
    """Create payment confirmation email HTML."""
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#10b981,#059669);padding:24px;color:white;text-align:center">
        <h1 style="margin:0;font-size:22px">Payment Confirmation</h1>
      </div>
      <div style="padding:28px">
        <p style="color:#0f172a;font-size:15px">Hello <strong>{name}</strong>,</p>
        <p style="color:#64748b">Your payment has been successfully recorded.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:20px 0">
          <p style="margin:0 0 12px;font-weight:700;color:#166534">Payment Details</p>
          <p style="margin:0 0 8px;color:#15803d">Amount: <strong>₹ {amount}</strong></p>
          <p style="margin:0 0 8px;color:#15803d">Transaction ID: <strong>{transaction_id}</strong></p>
          <p style="margin:0;color:#15803d">Date: <strong>{payment_date}</strong></p>
        </div>
        <p style="color:#64748b;font-size:13px;text-align:center;margin-top:20px">Thank you for your contribution to Smart Bachatgat!</p>
      </div>
    </div>
    """


def create_loan_due_reminder(name: str, amount: float, due_date: str, loan_id: str) -> str:
    """Create loan due reminder email HTML."""
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:24px;color:white;text-align:center">
        <h1 style="margin:0;font-size:22px">Loan Due Reminder</h1>
      </div>
      <div style="padding:28px">
        <p style="color:#0f172a;font-size:15px">Hello <strong>{name}</strong>,</p>
        <p style="color:#64748b">This is a reminder that your loan EMI is due.</p>
        <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:16px;margin:20px 0">
          <p style="margin:0 0 12px;font-weight:700;color:#92400e">EMI Details</p>
          <p style="margin:0 0 8px;color:#b45309">Loan ID: <strong>{loan_id}</strong></p>
          <p style="margin:0 0 8px;color:#b45309">Amount: <strong>₹ {amount}</strong></p>
          <p style="margin:0;color:#b45309">Due Date: <strong>{due_date}</strong></p>
        </div>
        <p style="color:#64748b;font-size:13px;text-align:center;margin-top:20px">Please ensure timely payment to maintain good standing.</p>
      </div>
    </div>
    """
