from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from typing import Optional
import random, string

from database import get_db
from models.user import User
from models.group import Group
from models.member import Member
from models.auth_token import AuthToken
from utils.hashing import hash_password

router = APIRouter(prefix="/auth", tags=["Register"])

MAX_MEMBERS = 12

class RegisterRequest(BaseModel):
    name:         str
    phone:        str
    email:        Optional[str] = None
    aadhar_last4: Optional[str] = None
    occupation:   Optional[str] = None
    address:      Optional[str] = None
    username:     str
    password:     str
    invite_code:  Optional[str] = None
    group_id:     Optional[int] = None

class InviteCheckRequest(BaseModel):
    code: str

class InviteCheckResponse(BaseModel):
    valid:       bool
    group_name:  Optional[str] = None
    leader_name: Optional[str] = None
    group_id:    Optional[int] = None
    message:     Optional[str] = None


def generate_token(length: int = 48) -> str:
    chars = string.ascii_letters + string.digits
    return "".join(random.choices(chars, k=length))


def create_verification_token(db: Session, user: User, email: str):
    token = generate_token(48)
    expires_at = datetime.utcnow() + timedelta(hours=24)
    auth_token = AuthToken(
        user_id=user.id,
        email=email,
        token=token,
        type="email_verify",
        expires_at=expires_at,
        is_used=False,
    )
    db.add(auth_token)
    db.commit()
    db.refresh(auth_token)
    return auth_token


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


def generate_member_id(name: str, group: Group, db: Session) -> str:
    first_name = name.split()[0].lower().replace(" ", "_")[:6]
    suffix = derive_group_suffix(group)
    base_id = f"{first_name}_mb{suffix}"
    member_id = base_id
    counter = 1
    while db.query(Member).filter(Member.member_id == member_id).first():
        member_id = f"{base_id}{counter}"
        counter += 1
    return member_id

@router.post("/check-invite-code", response_model=InviteCheckResponse)
def check_invite_code(body: InviteCheckRequest, db: Session = Depends(get_db)):
    try:
        code  = body.code.strip().upper()
        group = db.query(Group).filter(Group.group_id == code).first()
        if group:
            leader = db.query(User).filter(User.id == group.leader_id).first()
            return InviteCheckResponse(
                valid=True, group_name=group.name,
                leader_name=leader.name if leader else "Group Leader",
                group_id=group.id, message="Group found!"
            )
    except Exception:
        pass
    first_group = db.query(Group).first()
    return InviteCheckResponse(
        valid=True,
        group_name=first_group.name if first_group else "Smart Bachatgat Group",
        leader_name="Group Leader",
        group_id=first_group.id if first_group else None,
        message="Welcome!"
    )

@router.post("/member")
def register_member(body: RegisterRequest, background: BackgroundTasks,
                    db: Session = Depends(get_db)):
    # Duplicate checks
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken.")
    if db.query(User).filter(User.phone == body.phone).first():
        raise HTTPException(status_code=400, detail="Phone number already registered.")
    if body.email and db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")

    # Determine group — prefer invite code group, fallback to provided group_id
    group = None
    if body.invite_code:
        code = body.invite_code.strip().upper()
        group = db.query(Group).filter(Group.group_id == code).first()
        if not group:
            raise HTTPException(status_code=404, detail="Invite code not found. Please select a valid group.")
    elif body.group_id:
        group = db.query(Group).filter(Group.id == body.group_id).first()
    else:
        group = db.query(Group).first()

    if not group:
        raise HTTPException(status_code=400, detail="No available group found. Contact admin.")

    group_id = group.id

    # Enforce member limit (10-12 members per leader)
    count = db.query(Member).filter(Member.group_id == group_id, Member.status == "Active").count()
    if count >= MAX_MEMBERS:
        raise HTTPException(status_code=400, detail=f"This group is full (max {MAX_MEMBERS} members).")

    # Generate member ID: firstname_mb{group_suffix}
    # Example: savita_mbA
    member_id = generate_member_id(body.name, group, db)

    new_user = User(
        name=body.name, username=body.username,
        email=body.email or None, phone=body.phone,
        password=hash_password(body.password),
        role="member", group_id=group_id,
        member_id=member_id,
        is_active=True, created_at=datetime.utcnow()
    )
    db.add(new_user)
    db.flush()

    new_member = Member(
        member_id=member_id, group_id=group_id,
        leader_id=group.leader_id if group else None,
        name=body.name, phone=body.phone,
        email=body.email or None, address=body.address or None,
        aadhar_no=body.aadhar_last4 or None,
        occupation=body.occupation or None,
        total_savings=0.0, total_loans=0.0, meetings_att=0,
        join_date=date.today(), status="Active"
    )
    db.add(new_member)
    db.commit()

    verification_token = None
    if body.email:
        verification_token = create_verification_token(db, new_user, body.email)

    # ── Welcome notification ──
    from routes.notifications import create_notification, send_email_background
    from models.notification import Notification
    notif = Notification(
        user_id=new_user.id, group_id=group_id,
        title="🎉 Welcome to Smart Bachatgat!",
        message=f"Hi {body.name}! Your account has been created successfully. Member ID: {member_id}",
        type="success"
    )
    db.add(notif)

    # Notify group leader
    group = db.query(Group).filter(Group.id == group_id).first()
    if group and group.leader_id:
        leader_notif = Notification(
            user_id=group.leader_id, group_id=group_id,
            title=f"👤 New Member Joined",
            message=f"{body.name} has joined your group as {member_id}.",
            type="info"
        )
        db.add(leader_notif)

    db.commit()

    # Welcome email
    if body.email:
        verify_section = ""
        if verification_token:
            verify_link = f"http://localhost:5173/verify-email?token={verification_token.token}"
            verify_section = f"<p style=\"color:#64748b;font-size:13px\">Verify your email: <a href=\"{verify_link}\">Click here to verify</a></p>"

        email_body = f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:24px;color:white;text-align:center">
            <h1 style="margin:0;font-size:22px">🎉 Welcome to Smart Bachatgat!</h1>
          </div>
          <div style="padding:28px">
            <p style="color:#0f172a;font-size:15px">Hello <strong>{body.name}</strong>,</p>
            <p style="color:#64748b">Your account has been successfully created.</p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:20px 0">
              <p style="margin:0 0 8px;font-weight:700;color:#166534">Your Login Details:</p>
              <p style="margin:0 0 4px;color:#15803d">Username: <strong>{body.username}</strong></p>
              <p style="margin:0;color:#15803d">Member ID: <strong>{member_id}</strong></p>
            </div>
            {verify_section}
            <p style="color:#64748b;font-size:13px">Login at: <a href="http://localhost:5173/login">Smart Bachatgat</a></p>
          </div>
        </div>"""
        background.add_task(send_email_background, body.email, "Welcome to Smart Bachatgat!", email_body)

    response = {
        "success":   True,
        "message":   "Account created! You can now login.",
        "username":  new_user.username,
        "member_id": member_id,
        "group_id":  group_id,
        "group_name": group.name,
        "leader_id": group.leader_id
    }
    
    # Include verification token in response if email provided
    if verification_token:
        response["verification_token"] = verification_token.token
        response["verification_link"] = f"http://localhost:5173/verify-email?token={verification_token.token}"
        response["requires_email_verification"] = True
    
    return response


class LeaderRegisterRequest(BaseModel):
    name:          str
    phone:         str
    email:         Optional[str] = None
    aadhar_last4:  Optional[str] = None
    occupation:    Optional[str] = None
    address:       Optional[str] = None
    organization:  str
    ngo:           str
    taluka:        str
    group_id:      Optional[int] = None
    group_name:    Optional[str] = None
    username:      str
    password:      str
    role:          str = "leader"


@router.post("/register-leader")
def register_leader(body: LeaderRegisterRequest, background: BackgroundTasks,
                    db: Session = Depends(get_db)):
    """Register a new leader"""
    try:
        # Duplicate checks
        if db.query(User).filter(User.username == body.username).first():
            raise HTTPException(status_code=400, detail="Username already taken.")
        if db.query(User).filter(User.phone == body.phone).first():
            raise HTTPException(status_code=400, detail="Phone number already registered.")
        if body.email and db.query(User).filter(User.email == body.email).first():
            raise HTTPException(status_code=400, detail="Email already registered.")
        
        # Get group
        group = None
        group_id = None
        
        if body.group_id:
            group = db.query(Group).filter(Group.id == body.group_id).first()
            if not group:
                raise HTTPException(status_code=404, detail="Group not found.")
            if group.leader_id:
                raise HTTPException(status_code=400, detail="This group already has a leader.")
            group_id = group.id
        else:
            # Get first available group or create new one
            group = db.query(Group).filter(Group.leader_id == None).first()
            if not group and body.group_name:
                # Create new group
                group = Group(
                    name=body.group_name.strip(),
                    group_id=f"GRP{body.group_name.strip()[0].upper()}",
                    created_by=1,
                    status="Active"
                )
                db.add(group)
                db.flush()
            
            if group:
                group_id = group.id
            else:
                raise HTTPException(status_code=400, detail="No group available.")
        
        # Create leader user
        first_name = body.name.split()[0].lower()
        leader_id = f"{first_name}_ldA"
        
        new_user = User(
            name=body.name,
            username=body.username,
            email=body.email or None,
            phone=body.phone,
            password=hash_password(body.password),
            role="leader",
            group_id=group_id,
            member_id=leader_id,
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(new_user)
        db.flush()
        db.refresh(new_user)
        
        # Assign leader to group
        if group:
            group.leader_id = new_user.id
        db.commit()
        
        # Create email verification token if email provided
        verification_token = None
        if body.email:
            verification_token = create_verification_token(db, new_user, body.email)
        
        response = {
            "success": True,
            "message": "Leader account created successfully!",
            "username": new_user.username,
            "leader_id": leader_id,
            "group_id": group_id,
            "group_name": group.name if group else "New Group"
        }
        
        # Include verification token if email provided
        if verification_token:
            response["verification_token"] = verification_token.token
            response["verification_link"] = f"http://localhost:5173/verify-email?token={verification_token.token}"
            response["requires_email_verification"] = True
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error in register_leader: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")



