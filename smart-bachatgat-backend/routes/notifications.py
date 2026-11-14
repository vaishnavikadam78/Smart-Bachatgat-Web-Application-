from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models.notification import Notification
from models.user import User
from models.meeting import Meeting
from models.group import Group
from models.loan import Loan
from models.member import Member
from utils.auth import get_current_user, require_role
from utils.email_service import send_email_async, create_loan_due_reminder
from config import NOTIFICATION_MODE, PRODUCTION_NOTIFICATION_WINDOW_DAYS, DEMO_NOTIFICATION_WINDOW_MINUTES
from pydantic import BaseModel
from typing import Optional
from datetime import date, timedelta, datetime, time
import asyncio
import re

router = APIRouter(prefix="/notifications", tags=["Notifications"])

def send_email_background(to_email: str, subject: str, body: str):
    """Send email as a background task."""
    try:
        loop = asyncio.get_running_loop()
        async def _runner():
            result = await send_email_async(to_email, subject, body)
            if result.get("status") != "success":
                print(f"[EMAIL-FAILED] to={to_email} subject={subject} reason={result.get('error')}")
            else:
                print(f"[EMAIL-SENT] to={to_email} provider={result.get('provider')}")
        loop.create_task(_runner())
    except RuntimeError:
        result = asyncio.run(send_email_async(to_email, subject, body))
        if result.get("status") != "success":
            print(f"[EMAIL-FAILED] to={to_email} subject={subject} reason={result.get('error')}")
        else:
            print(f"[EMAIL-SENT] to={to_email} provider={result.get('provider')}")


def get_notification_window() -> timedelta:
    if NOTIFICATION_MODE == "DEMO":
        return timedelta(minutes=DEMO_NOTIFICATION_WINDOW_MINUTES)
    return timedelta(days=PRODUCTION_NOTIFICATION_WINDOW_DAYS)


def parse_due_time_from_notes(notes: Optional[str]) -> Optional[time]:
    if not notes:
        return None
    match = re.search(r"due_time\s*[:=]\s*([0-2]?\d:[0-5]\d)", notes)
    if not match:
        return None
    hour, minute = map(int, match.group(1).split(':'))
    if 0 <= hour < 24 and 0 <= minute < 60:
        return time(hour, minute)
    return None


def get_loan_due_datetime(loan):
    if not loan.due_date:
        return None
    due_time = parse_due_time_from_notes(getattr(loan, 'notes', None))
    if not due_time:
        due_time = time(17, 0)
    return datetime.combine(loan.due_date, due_time)


def format_notification_email(title: str, message: str) -> str:
    return f"""
    <div style=\"font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden\">
      <div style=\"background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:22px;color:white;text-align:center\">
        <h2 style=\"margin:0;font-size:20px\">Smart Bachatgat Notification</h2>
      </div>
      <div style=\"padding:24px;background:white;color:#111827\">
        <h3 style=\"margin:0 0 12px;font-size:18px;color:#0f172a\">{title}</h3>
        <p style=\"margin:0;color:#475569;line-height:1.7\">{message}</p>
      </div>
      <div style=\"padding:14px 24px;background:#f8fafc;color:#64748b;font-size:12px;\">
        This is an automated alert from Smart Bachatgat.
      </div>
    </div>
    """


def create_notification(db: Session, user_id: int, title: str, message: str,
                         notif_type: str = "info", group_id: int = None,
                         background: BackgroundTasks = None, email: str = None):
    """Create in-app notification and optionally send email."""
    notif = Notification(
        user_id=user_id, group_id=group_id,
        title=title, message=message, type=notif_type
    )
    db.add(notif)
    db.commit()
    if background and email:
        html = format_notification_email(title, message)
        background.add_task(send_email_background, email, f"Smart Bachatgat — {title}", html)
    return notif


def notify_group(db: Session, group_id: int, title: str, message: str,
                 notif_type: str = "info", background: BackgroundTasks = None):
    """Notify ALL users in a group."""
    users = db.query(User).filter(
        User.group_id == group_id, User.is_active == True
    ).all()
    for u in users:
        create_notification(db, u.id, title, message, notif_type, group_id,
                            background=background, email=u.email)


def notify_all_groups(db: Session, title: str, message: str,
                      notif_type: str = "info", background: BackgroundTasks = None):
    """Notify ALL active users across all groups."""
    users = db.query(User).filter(User.is_active == True).all()
    for u in users:
        create_notification(db, u.id, title, message, notif_type, group_id=0,
                            background=background, email=u.email)


def reminder_already_sent(db: Session, title: str, group_id: int, within_days: int = 4):
    cutoff = datetime.utcnow() - timedelta(days=within_days)
    return db.query(Notification).filter(
        Notification.title == title,
        Notification.group_id == group_id,
        Notification.created_at >= cutoff
    ).first() is not None


def send_meeting_reminders(db: Session, background: BackgroundTasks = None):
    today = date.today()
    in2days = today + timedelta(days=2)
    meetings = db.query(Meeting).filter(
        Meeting.date.between(today, in2days)
    ).all()

    count = 0
    for meeting in meetings:
        title = f"📅 Meeting Reminder: {meeting.title}"
        message = f"Your meeting is scheduled for {meeting.date}."
        if meeting.time:
            message += f" Time: {meeting.time}."
        if meeting.venue:
            message += f" Venue: {meeting.venue}."
        message += " Please attend on time."

        if reminder_already_sent(db, title, meeting.group_id):
            continue

        if meeting.group_id == 0:
            notify_all_groups(db, title, message, "meeting", background)
        else:
            notify_group(db, meeting.group_id, title, message, "meeting", background)
        count += 1

    return count


def send_loan_due_reminders(db: Session, background: BackgroundTasks = None):
    today = date.today()
    window = get_notification_window()
    count = 0

    if NOTIFICATION_MODE == "DEMO":
        candidate_end = today + timedelta(days=1)
        loans = db.query(Loan).filter(
            Loan.status == "Active",
            Loan.balance > 0,
            Loan.due_date != None,
            Loan.due_date.between(today, candidate_end)
        ).all()
        now = datetime.utcnow()
        loans = [loan for loan in loans if loan_due_datetime(loan) is not None and 0 <= (loan_due_datetime(loan) - now).total_seconds() <= window.total_seconds()]
    else:
        candidate_end = today + window
        loans = db.query(Loan).filter(
            Loan.status == "Active",
            Loan.balance > 0,
            Loan.due_date != None,
            Loan.due_date.between(today, candidate_end)
        ).all()

    for loan in loans:
        member = db.query(Member).filter(Member.id == loan.member_id).first()
        if not member:
            continue

        due_dt = get_loan_due_datetime(loan)
        time_text = f" at {due_dt.strftime('%H:%M')}" if due_dt else ""
        if NOTIFICATION_MODE == "DEMO":
            message = f"Your loan installment of ₹{loan.balance:,.0f} is due within the next {int(window.total_seconds() // 60)} minutes on {loan.due_date}{time_text}."
        else:
            message = f"Your loan installment of ₹{loan.balance:,.0f} is due on {loan.due_date}{time_text}."
        if loan.notes:
            message += f" Notes: {loan.notes}."

        title = f"⚠️ EMI Due Reminder: {loan.loan_id}"
        if reminder_already_sent(db, title, loan.group_id):
            continue

        user = db.query(User).filter(
            User.member_id == member.member_id,
            User.group_id == member.group_id
        ).first()
        if user:
            create_notification(db, user.id, title, message, "warning", loan.group_id,
                                background=background, email=user.email)
            count += 1
            try:
                if background and user.email:
                    html = create_loan_due_reminder(user.name, loan.balance, f"{loan.due_date}{time_text}", loan.loan_id)
                    background.add_task(send_email_background, user.email, f"Loan Due Reminder — {loan.loan_id}", html)
            except Exception:
                pass

        group = db.query(Group).filter(Group.id == loan.group_id).first()
        if group and group.leader_id:
            leader = db.query(User).filter(User.id == group.leader_id).first()
            if leader:
                create_notification(db, leader.id,
                                    f"⚠️ Loan Due Alert: {loan.loan_id}",
                                    f"Member {member.name} has a loan due on {loan.due_date}{time_text}.",
                                    "warning", loan.group_id,
                                    background=background, email=leader.email)
                count += 1

    return count


class GroupReminderRequest(BaseModel):
    group_id: int
    title: str
    message: str


@router.post("/group-reminder")
def group_reminder(data: GroupReminderRequest, background: BackgroundTasks,
                   db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role == "leader" and current_user.group_id != data.group_id:
        raise HTTPException(status_code=403, detail="Cannot send reminders outside your group")
    if data.group_id == 0 and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can broadcast to all groups")

    if data.group_id == 0:
        notify_all_groups(db, data.title, data.message, "info", background)
    else:
        notify_group(db, data.group_id, data.title, data.message, "info", background)

    return {"ok": True, "message": "Reminder sent"}


@router.post("/run-scheduler")
def run_scheduler(background: BackgroundTasks,
                  db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    meeting_count = send_meeting_reminders(db, background)
    loan_count = send_loan_due_reminders(db, background)
    return {"ok": True, "mode": NOTIFICATION_MODE, "meetings_sent": meeting_count, "loan_reminders_sent": loan_count}


@router.get("/mode")
def get_notification_mode(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return {
        "mode": NOTIFICATION_MODE,
        "production_window_days": PRODUCTION_NOTIFICATION_WINDOW_DAYS,
        "demo_window_minutes": DEMO_NOTIFICATION_WINDOW_MINUTES
    }


@router.get("/my")
def get_my_notifications(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(50).all()
    return notifs

@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    return {"count": count}

@router.patch("/mark-read/{notif_id}")
def mark_read(notif_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    n = db.query(Notification).filter(Notification.id == notif_id).first()
    if n: n.is_read = True; db.commit()
    return {"ok": True}

@router.patch("/mark-all-read")
def mark_all_read(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"ok": True}

@router.get("/check-meeting-alerts")
def check_meeting_alerts(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Check for meetings within 2 days"""
    today   = date.today()
    in2days = today + timedelta(days=2)
    gid     = current_user.group_id or 0

    meetings = db.query(Meeting).filter(
        Meeting.date.between(today, in2days),
        (Meeting.group_id == gid) | (Meeting.group_id == 0) | (Meeting.group_id == None)
    ).all()

    alerts = []
    for m in meetings:
        alerts.append({
            "id":    m.id,
            "title": m.title,
            "date":  str(m.date),
            "time":  m.time,
            "venue": m.venue,
        })
    return {"alerts": alerts, "count": len(alerts)}