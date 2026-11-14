from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models.member import Member
from models.group import Group
from models.user import User
from models.notification import Notification
from utils.auth import get_current_user
from utils.hashing import hash_password
from routes.notifications import send_email_background
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

router = APIRouter(prefix="/members", tags=["Members"])

MAX_MEMBERS = 12

class MemberCreate(BaseModel):
    name:       str
    phone:      str
    group_id:   Optional[int] = None
    email:      Optional[str] = None
    address:      Optional[str] = None
    aadhar_no:  Optional[str] = None
    occupation: Optional[str] = None


def derive_group_suffix(group: Optional[Group]) -> str:
    if not group:
        return "A"
    if group.group_id and group.group_id.upper().startswith("GRP"):
        try:
            idx = int(group.group_id[3:])
            if 1 <= idx <= 26:
                return chr(ord("A") + idx - 1)
        except ValueError:
            pass
    if group.name:
        suffix = group.name.strip()[-1].upper()
        if suffix.isalpha():
            return suffix
    return "A"

# ── Get members for a specific group (leader sees ONLY their group) ──
@router.get("/group/{group_id}")
def get_members(group_id: int, db: Session = Depends(get_db),
                current_user=Depends(get_current_user)):
    """
    Leader sees only their assigned group members.
    Admin can see any group.
    """
    if current_user.role == "leader":
        # Force leader to see only their own group
        if current_user.group_id and current_user.group_id != group_id:
            return []  # Cannot see other group's members
    members = db.query(Member).filter(
        Member.group_id == group_id,
        Member.status == "Active"
    ).all()
    return members

# ── Get current leader's members ──
@router.get("/my-group")
def my_group_members(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Leader calls this to get ONLY their group's members"""
    if not current_user.group_id:
        return []
    return db.query(Member).filter(
        Member.group_id == current_user.group_id,
        Member.status == "Active"
    ).all()

@router.get("/all")
def get_all_members(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role == "leader":
        # Leader sees only their group
        if not current_user.group_id:
            return []
        return db.query(Member).filter(
            Member.group_id == current_user.group_id,
            Member.status == "Active"
        ).all()
    # Admin sees all
    return db.query(Member).filter(Member.status == "Active").all()

@router.post("/", status_code=201)
def add_member(data: MemberCreate, background: BackgroundTasks,
               db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    try:
        # Determine group — leader can only add to their own group
        if current_user.role == "leader":
            group_id = current_user.group_id
            if not group_id:
                raise HTTPException(status_code=400,
                    detail="You are not assigned to any group. Contact admin.")
        else:
            group_id = data.group_id or current_user.group_id
            if not group_id:
                g = db.query(Group).first()
                group_id = g.id if g else None
            if not group_id:
                raise HTTPException(status_code=400, detail="No group found")

        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        if group.leader_id is None and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Cannot add member to a group without a leader.")

        leader_id = group.leader_id

        # 10 member limit
        count = db.query(Member).filter(
            Member.group_id == group_id, Member.status == "Active"
        ).count()
        if count >= MAX_MEMBERS:
            raise HTTPException(status_code=400,
                detail=f"Group is full! Maximum {MAX_MEMBERS} members allowed.")

        # Check duplicate phone / email inside members
        if db.query(Member).filter(Member.phone == data.phone, Member.status == "Active").first():
            raise HTTPException(status_code=400, detail="A member with this phone already exists.")

        # Generate unique member ID with proper format: firstname_mb{group_suffix}
        group_obj = db.query(Group).filter(Group.id == group_id).first()
        group_suffix = derive_group_suffix(group_obj)
        first_name = data.name.split()[0].lower()
        member_id = f"{first_name}_mb{group_suffix}"
        
        # Check if this member_id already exists
        if db.query(Member).filter(Member.member_id == member_id).first():
            # If exists, append a number
            idx = 1
            while db.query(Member).filter(Member.member_id == f"{member_id}{idx}").first():
                idx += 1
            member_id = f"{member_id}{idx}"

        # Create member record
        member = Member(
            member_id=member_id, group_id=group_id, leader_id=leader_id,
            name=data.name, phone=data.phone,
            email=data.email or None, address=data.address or None,
            aadhar_no=data.aadhar_no or None,
            occupation=data.occupation or None,
            total_savings=0.0, total_loans=0.0, meetings_att=0,
            join_date=date.today(), status="Active"
        )
        db.add(member)
        db.flush()

        # Create user account for the new member
        # Use member_id as the username (it's unique and simpler)
        username = member_id.lower()
        password = f"Member@{member_id}"
        
        # Verify username is not already taken
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Username {username} already exists")
        
        # Verify email is not already taken (if email provided)
        if data.email:
            existing_email = db.query(User).filter(User.email == data.email).first()
            if existing_email:
                raise HTTPException(status_code=400, detail=f"Email {data.email} is already in use. Please use a different email.")

        new_user = User(
            name=data.name,
            username=username,
            email=data.email or None,
            phone=data.phone,
            password=hash_password(password),
            role="member",
            group_id=group_id,
            member_id=member_id,
            is_active=True,
            email_verified=True,
            created_at=datetime.utcnow()
        )
        db.add(new_user)
        db.flush()
        
        # Verify user was created
        if not new_user.id:
            raise HTTPException(status_code=500, detail="Failed to create user account")
        
        db.refresh(new_user)

        # Notify group leader and new member
        leader = db.query(User).filter(User.id == group.leader_id).first() if group.leader_id else None
        if leader:
            n = Notification(
                user_id=leader.id, group_id=group_id,
                title="👤 New Member Added",
                message=f"{data.name} has been added to {group.name}. Member ID: {member_id}",
                type="info"
            )
            db.add(n)

        db.commit()

        if data.email:
            # Since email_verified is already True, no verification needed
            # Just send welcome email with login credentials
            email_body = f"""
            <div style=\"font-family:Arial,sans-serif;max-width:480px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden\">
              <div style=\"background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:24px;color:white;text-align:center\">
                <h1 style=\"margin:0;font-size:22px\">Your Smart Bachatgat Account is Ready ✅</h1>
              </div>
              <div style=\"padding:28px\">
                <p style=\"color:#0f172a;font-size:15px\">Hello <strong>{data.name}</strong>,</p>
                <p style=\"color:#64748b\">Your member account has been created successfully by your group leader.</p>
                <p style=\"color:#64748b\">Your email has been verified. You can login immediately!</p>
                <div style=\"background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:20px 0\">
                  <p style=\"margin:0 0 8px;font-weight:700;color:#166534\">Your Login Details:</p>
                  <p style=\"margin:0 0 4px;color:#15803d\"><strong>Username:</strong> {new_user.username}</p>
                  <p style=\"margin:0 0 8px;color:#15803d\"><strong>Password:</strong> {password}</p>
                  <p style=\"margin:0;color:#15803d;font-size:12px\">Please save these credentials securely</p>
                </div>
                <div style=\"background:#e0e7ff;border:1px solid #818cf8;border-radius:10px;padding:14px;margin:16px 0\">
                  <p style=\"margin:0;color:#3730a3;font-weight:600\">👉 You can login now!</p>
                  <p style=\"margin:8px 0 0;color:#3730a3;font-size:13px\">No email verification required.</p>
                </div>
                <p style=\"color:#64748b;font-size:13px;margin-top:20px\">Go to: <a href=\"http://localhost:5173/login\" style=\"color:#3b82f6\">Smart Bachatgat Login</a></p>
                <p style=\"color:#94a3b8;font-size:12px;margin-top:16px\">If you have any questions, contact your group leader.</p>
              </div>
            </div>"""
            
            background.add_task(send_email_background, data.email,
                                "Your Smart Bachatgat Member Account Ready ✅", email_body)

            member_notif = Notification(
                user_id=new_user.id, group_id=group_id,
                title="🎉 Welcome to your group!",
                message=f"Your member account has been created. Username: {new_user.username}. You can login now!",
                type="success"
            )
            db.add(member_notif)
            db.commit()

        db.refresh(member)
        db.refresh(new_user)
        return {
            "member": member,
            "username": new_user.username,
            "password": password,
            "member_id": member.member_id,
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating member: {str(e)}")

@router.get("/my-profile")
def my_profile(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    member = None
    if current_user.member_id:
        member = db.query(Member).filter(Member.member_id == current_user.member_id).first()
    if not member:
        member = db.query(Member).filter(
            Member.group_id == current_user.group_id,
            Member.name == current_user.name
        ).first()
    if not member:
        return {
            "name": current_user.name,
            "group_id": current_user.group_id,
            "leader_id": None,
            "leader_name": None,
            "group_name": None,
            "total_savings": 0,
            "total_loans": 0,
            "status": "Active"
        }

    group  = db.query(Group).filter(Group.id == member.group_id).first()
    leader = db.query(User).filter(User.id == member.leader_id).first() if member.leader_id else None
    return {
        "id":          member.id,
        "member_id":   member.member_id,
        "name":        member.name,
        "phone":       member.phone,
        "email":       member.email,
        "address":     member.address,
        "group_id":    member.group_id,
        "group_name":  group.name if group else None,
        "leader_id":   member.leader_id,
        "leader_name": leader.name if leader else None,
        "total_savings": member.total_savings,
        "total_loans":   member.total_loans,
        "status":         member.status,
        "join_date":      str(member.join_date),
        "created_at":     str(member.created_at),
    }

@router.get("/{member_id}")
def get_member(member_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    m = db.query(Member).filter(Member.id == member_id).first()
    if not m: raise HTTPException(status_code=404, detail="Member not found")
    # Leader can only access their group's members
    if current_user.role == "leader" and m.group_id != current_user.group_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return m

@router.delete("/{member_id}")
def remove_member(member_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    m = db.query(Member).filter(Member.id == member_id).first()
    if not m: raise HTTPException(status_code=404, detail="Member not found")
    if current_user.role == "leader" and m.group_id != current_user.group_id:
        raise HTTPException(status_code=403, detail="Cannot remove member from another group")
    m.status = "Inactive"; db.commit()
    return {"message": "Member removed"}

@router.post("/approve/{username}")
def approve_member(username: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user = db.query(User).filter(User.username == username).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True; db.commit()
    return {"message": f"Member '{username}' approved"}

