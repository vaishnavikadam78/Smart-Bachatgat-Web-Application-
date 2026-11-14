from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.group import Group
from models.member import Member
from models.user import User
from utils.auth import require_role, get_current_user
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

router = APIRouter(prefix="/groups", tags=["Groups"])

MAX_MEMBERS_PER_GROUP = 12   # 10-12 members per leader

class GroupCreate(BaseModel):
    name:         str
    location:     Optional[str] = None
    meeting_day:  Optional[str] = None

@router.get("/available/for-leader")
def get_available_groups_for_leader(db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    """Get all groups without a leader assigned"""
    groups = db.query(Group).filter(Group.leader_id == None, Group.status == "Active").all()
    result = []
    for g in groups:
        member_count = db.query(Member).filter(Member.group_id == g.id, Member.status == "Active").count()
        result.append({
            "id":           g.id,
            "group_id":     g.group_id,
            "name":         g.name,
            "member_count": member_count,
            "max_members":  MAX_MEMBERS_PER_GROUP,
            "slots_left":   MAX_MEMBERS_PER_GROUP - member_count,
        })
    return result

@router.get("/")
def get_all_groups(db: Session = Depends(get_db)):
    """Public group listing used by registration screens."""
    # Only return groups created by an admin (created_by not null) and which are active
    groups = db.query(Group).filter(Group.created_by != None, Group.status == "Active").all()
    result = []
    for g in groups:
        member_count = db.query(Member).filter(Member.group_id == g.id, Member.status == "Active").count()
        leader = db.query(User).filter(User.id == g.leader_id).first() if g.leader_id else None
        result.append({
            "id":           g.id,
            "group_id":     g.group_id,
            "name":         g.name,
            "leader_id":    g.leader_id,
            "leader_name":  leader.name if leader else "—",
            "opening_date": str(g.opening_date) if g.opening_date else None,
            "meeting_day":  g.meeting_day,
            "location":     g.location,
            "total_savings":g.total_savings or 0,
            "status":       g.status or "Active",
            "member_count": member_count,
            "max_members":  MAX_MEMBERS_PER_GROUP,
            "slots_left":   MAX_MEMBERS_PER_GROUP - member_count,
        })
    return result

@router.post("/", status_code=201)
def create_group(data: GroupCreate, db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    # Auto-generate a unique group_id
    count = db.query(Group).count()
    auto_gid = f"GRP{str(count + 1).zfill(3)}"
    while db.query(Group).filter(Group.group_id == auto_gid).first():
        count += 1
        auto_gid = f"GRP{str(count + 1).zfill(3)}"

    group = Group(
        name         = data.name,
        group_id     = auto_gid,
        leader_id    = None,
        created_by   = current_user.id,
        opening_date = date.today(),
        meeting_day  = data.meeting_day or None,
        location     = data.location or None,
        total_savings= 0.0,
        status       = "Active"
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return {
        "id":           group.id,
        "group_id":     group.group_id,
        "name":         group.name,
        "leader_id":    group.leader_id,
        "opening_date": str(group.opening_date),
        "meeting_day":  group.meeting_day,
        "location":     group.location,
        "total_savings":0,
        "status":       group.status,
        "member_count": 0,
        "max_members":  MAX_MEMBERS_PER_GROUP,
        "slots_left":   MAX_MEMBERS_PER_GROUP,
    }

@router.get("/{group_id}")
def get_group(group_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    from models.user import User
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    leader = db.query(User).filter(User.id == group.leader_id).first() if group.leader_id else None
    member_count = db.query(__import__("models.member",fromlist=["Member"]).Member).filter_by(group_id=group.id,status="Active").count()
    return {
        "id":           group.id,
        "group_id":     group.group_id,
        "name":         group.name,
        "leader_id":    group.leader_id,
        "leader_name":  leader.name if leader else None,
        "opening_date": str(group.opening_date) if group.opening_date else None,
        "meeting_day":  group.meeting_day,
        "location":     group.location,
        "total_savings":group.total_savings or 0,
        "status":       group.status or "Active",
        "member_count": member_count,
    }

@router.put("/{group_id}")
def update_group(group_id: int, data: GroupCreate, db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    group.name        = data.name
    group.meeting_day = data.meeting_day or group.meeting_day
    group.location    = data.location    or group.location
    db.commit()
    db.refresh(group)
    return group

@router.delete("/{group_id}")
def delete_group(group_id: int, db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    group.status = "Inactive"
    db.commit()
    return {"message": "Group deactivated"}