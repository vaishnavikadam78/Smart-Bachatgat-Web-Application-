from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models.meeting import Meeting
from models.group import Group
from models.user import User
from utils.auth import get_current_user, require_role
from pydantic import BaseModel
from typing import Optional
from datetime import date, timedelta

router = APIRouter(prefix="/meetings", tags=["Meetings"])

class MeetingCreate(BaseModel):
    group_id: Optional[int] = None   # None/0 = broadcast to ALL groups
    title:    str
    agenda:   Optional[str] = None
    date:     date
    time:     Optional[str] = None
    venue:    Optional[str] = None

@router.get("/group/{group_id}")
def get_meetings(group_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Get meetings for group — includes admin broadcasts (group_id=None)"""
    if current_user.role in ["leader", "member"] and current_user.group_id != group_id:
        return []
    meetings = db.query(Meeting).filter(
        (Meeting.group_id == group_id) | (Meeting.group_id == None) | (Meeting.group_id == 0)
    ).order_by(Meeting.date.asc()).all()
    return meetings

@router.get("/all")
def get_all_meetings(db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    return db.query(Meeting).order_by(Meeting.date.asc()).all()

@router.get("/upcoming-alerts")
def upcoming_alerts(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    today   = date.today()
    in2days = today + timedelta(days=2)
    gid     = current_user.group_id or 0
    return db.query(Meeting).filter(
        Meeting.date.between(today, in2days),
        (Meeting.group_id == gid) | (Meeting.group_id == None) | (Meeting.group_id == 0)
    ).all()

@router.post("/", status_code=201)
def create_meeting(data: MeetingCreate, background: BackgroundTasks,
                   db: Session = Depends(get_db), current_user=Depends(require_role("admin","leader"))):
    """
    Admin → group_id=0 broadcasts to ALL (visible on ALL leader + member dashboards)
    Leader → creates for their own group only
    """
    if current_user.role == "admin":
        target_group = data.group_id if data.group_id else None
    else:
        target_group = current_user.group_id or data.group_id

    meeting = Meeting(
        group_id=target_group, title=data.title, agenda=data.agenda,
        date=data.date, time=data.time, venue=data.venue,
        scheduled_by=current_user.id
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    # ── Fire notifications to all relevant users ──
    from routes.notifications import notify_group, notify_all_groups
    title   = f"📅 Meeting Scheduled: {data.title}"
    message = f"A meeting has been scheduled for {data.date}"
    if data.time:   message += f" at {data.time}"
    if data.venue:  message += f" at {data.venue}"
    if data.agenda: message += f". Agenda: {data.agenda}"

    if target_group in (None, 0):
        notify_all_groups(db, title, message, "meeting", background)
    else:
        notify_group(db, target_group, title, message, "meeting", background)

    return meeting

@router.put("/{meeting_id}/attendance")
def update_attendance(meeting_id: int, attendance: int, notes: Optional[str] = None,
                      db: Session = Depends(get_db), current_user=Depends(require_role("admin","leader"))):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if current_user.role == "leader" and meeting.group_id != current_user.group_id:
        raise HTTPException(status_code=403, detail="Cannot update attendance for another group's meeting")
    meeting.attendance = attendance
    if notes: meeting.notes = notes
    db.commit()
    return meeting

@router.delete("/{meeting_id}")
def delete_meeting(meeting_id: int, db: Session = Depends(get_db), current_user=Depends(require_role("admin","leader"))):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if current_user.role == "leader" and meeting.group_id != current_user.group_id:
        raise HTTPException(status_code=403, detail="Cannot delete another group's meeting")
    db.delete(meeting)
    db.commit()
    return {"message": "Meeting deleted"}
