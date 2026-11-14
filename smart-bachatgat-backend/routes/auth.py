from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.group import Group
from models.member import Member
from models.notification import Notification
from models.auth_token import AuthToken
from utils.hashing import hash_password, verify_password
from utils.auth import create_access_token, get_current_user, require_role
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, timedelta
import random, string

router = APIRouter(prefix="/auth", tags=["Auth"])

# ── Helpers ──────────────────────────────────────────────
def gen_password(length=8):
    chars = string.ascii_letters + string.digits
    return "".join(random.choices(chars, k=length))

def gen_username(name: str, db: Session) -> str:
    base = name.lower().replace(" ", ".")[:12]
    username = base
    i = 1
    while db.query(User).filter(User.username == username).first():
        username = f"{base}{i}"
        i += 1
    return username


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


def gen_leader_id_for_group(first_name: str, group: Optional[Group]) -> str:
    """Generate leader ID using a group suffix letter."""
    name_part = first_name.lower().replace(" ", "_")[:6]
    suffix = derive_group_suffix(group)
    return f"{name_part}_ld{suffix}"


def gen_leader_password(leader_id: str) -> str:
    """Generate a deterministic password for leader accounts."""
    return f"{leader_id}@123"


def generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


def generate_token(length: int = 48) -> str:
    chars = string.ascii_letters + string.digits
    return "".join(random.choices(chars, k=length))


def create_auth_token(db: Session, user: User, token_type: str, otp: str = None, email: str = None):
    token = generate_token(48)
    expires = datetime.utcnow() + (timedelta(minutes=15) if token_type == "password_reset" else timedelta(hours=24))
    normalized_email = (email or user.email or "").strip().lower() if (email or user.email) else None
    auth_token = AuthToken(
        user_id=user.id,
        email=normalized_email,
        token=token,
        otp=otp,
        type=token_type,
        expires_at=expires,
        is_used=False,
    )
    db.add(auth_token)
    db.commit()
    db.refresh(auth_token)
    return auth_token

# ── Schemas ──────────────────────────────────────────────
class LeaderCreateRequest(BaseModel):
    name:       str
    phone:      str
    email:      Optional[str] = None
    group_id:   Optional[int] = None
    group_name: Optional[str] = None
    username:   Optional[str] = None
    password:   Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    name:     str
    username: str
    email:    Optional[str] = None
    password: str
    role:     str
    phone:    Optional[str] = None
    group_id: Optional[int] = None

class PasswordResetRequest(BaseModel):
    email: str

class OTPVerifyRequest(BaseModel):
    email: str
    otp: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

# ── Admin creates leader ──────────────────────────────────
@router.post("/create-leader", status_code=201)
def admin_create_leader(data: LeaderCreateRequest, background: BackgroundTasks,
                         db: Session = Depends(get_db),
                         current_user=Depends(require_role("admin"))):
    """
    Admin creates a leader.
    Leader must select a group from available groups.
    Each group can have only ONE leader.
    """
    # Validate group selection
    if not data.group_id:
        raise HTTPException(status_code=400, detail="Group selection is required")
    
    group = db.query(Group).filter(Group.id == data.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if group already has a leader
    if group.leader_id:
        existing_leader = db.query(User).filter(User.id == group.leader_id).first()
        raise HTTPException(
            status_code=400, 
            detail=f"Leader already assigned to this group: {existing_leader.name if existing_leader else 'Unknown'}"
        )
    
    # Generate leader ID: firstname_ld{group_suffix}
    first_name = data.name.split()[0].lower()
    leader_id = gen_leader_id_for_group(first_name, group)
    
    # Ensure leader_id is unique; append a number when needed
    base_leader_id = leader_id
    counter = 1
    while db.query(User).filter(User.leader_id == leader_id).first():
        leader_id = f"{base_leader_id}{counter}"
        counter += 1
    
    # Auto-generate username from first name if not provided
    username = data.username or gen_username(data.name, db)
    password = data.password or gen_leader_password(leader_id)
    
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if data.email and db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create leader user
    new_leader = User(
        name=data.name,
        username=username,
        email=data.email or None,
        phone=data.phone,
        password=hash_password(password),
        role="leader",
        group_id=group.id,
        leader_id=leader_id,
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(new_leader)
    db.flush()
    
    # Assign leader to group
    group.leader_id = new_leader.id
    
    # Create notification
    notif = Notification(
        user_id=new_leader.id,
        group_id=group.id,
        title="🎉 Welcome Leader!",
        message=f"You have been assigned as leader for {group.name}. Your ID: {leader_id}",
        type="success"
    )
    db.add(notif)
    db.commit()
    
    return {
        "success": True,
        "message": f"Leader {data.name} created successfully for group {group.name}",
        "name": new_leader.name,
        "user_id": new_leader.id,
        "leader_id": leader_id,
        "username": username,
        "password": password,
        "group_id": group.id,
        "group_name": group.name,
    }

# ── Keep old endpoint for backward compat ────────────────
@router.post("/register-leader")
def register_leader_compat(data: LeaderCreateRequest, background: BackgroundTasks,
                            db: Session = Depends(get_db)):
    username = data.username or gen_username(data.name, db)
    password = data.password or gen_password()
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    group = None
    if data.group_id:
        group = db.query(Group).filter(Group.id == data.group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        if group.leader_id:
            raise HTTPException(status_code=400, detail="Leader already assigned to this group")
    elif data.group_name:
        count = db.query(Group).count()
        auto_gid = f"GRP{str(count + 1).zfill(3)}"
        while db.query(Group).filter(Group.group_id == auto_gid).first():
            count += 1
            auto_gid = f"GRP{str(count + 1).zfill(3)}"
        group = Group(
            name=data.group_name,
            group_id=auto_gid,
            leader_id=None,
            opening_date=date.today(),
            meeting_day=None,
            location=None,
            total_savings=0.0,
            status="Active",
        )
        db.add(group)
        db.flush()
    else:
        raise HTTPException(status_code=400, detail="Please select an existing group or enter a group name")

    first_name = data.name.split()[0].lower()
    leader_id = gen_leader_id_for_group(first_name, group)
    base_leader_id = leader_id
    suffix_idx = 1
    while db.query(User).filter(User.leader_id == leader_id).first():
        leader_id = f"{base_leader_id}{suffix_idx}"
        suffix_idx += 1

    new_leader = User(
        name=data.name, username=username,
        email=data.email or None, phone=data.phone,
        password=hash_password(password),
        role="leader", group_id=group.id if group else None,
        leader_id=leader_id,
        is_active=True, created_at=datetime.utcnow()
    )
    db.add(new_leader)
    db.flush()

    if group:
        group.leader_id = new_leader.id
        db.commit()
    else:
        db.commit()

    db.refresh(new_leader)
    return {"success":True,"username":username,"password":password,"user_id":new_leader.id,"leader_id":leader_id}

@router.post("/register", status_code=201)
def register(data: RegisterRequest, background: BackgroundTasks, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if data.email and db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=data.name, username=data.username, email=data.email,
        password=hash_password(data.password), role=data.role,
        phone=data.phone, group_id=data.group_id, is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if data.email:
        verification_token = create_auth_token(db, user, "email_verify", email=data.email)
        verification_link = f"http://localhost:5173/verify-email?token={verification_token.token}"
        from routes.notifications import send_email_background
        email_body = f"""
        <div style=\"font-family:Arial,sans-serif;max-width:480px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden\">
          <div style=\"background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:24px;color:white;text-align:center\">
            <h1 style=\"margin:0;font-size:22px\">Confirm Your Email</h1>
          </div>
          <div style=\"padding:28px\">
            <p style=\"color:#0f172a;font-size:15px\">Hello <strong>{data.name}</strong>,</p>
            <p style=\"color:#64748b\">Please verify your email address to complete account setup.</p>
            <div style=\"background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:20px 0\">
              <p style=\"margin:0 0 8px;font-weight:700;color:#166534\">Verify Your Email</p>
              <p><a href=\"{verification_link}\">Click here to verify your email</a></p>
            </div>
            <p style=\"color:#64748b;font-size:13px\">If you did not create this account, please ignore this email.</p>
          </div>
        </div>"""
        background.add_task(send_email_background, data.email, "Confirm Your Smart Bachatgat Email", email_body)

    return {"message":"Account created","user_id":user.id}

# ── Get all leaders ──────────────────────────────────────
@router.get("/leaders")
def get_leaders(db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    leaders = db.query(User).filter(User.role == "leader").all()
    result  = []
    for l in leaders:
        group        = db.query(Group).filter(Group.id == l.group_id).first() if l.group_id else None
        member_count = db.query(Member).filter(Member.group_id == l.group_id, Member.status=="Active").count() if l.group_id else 0
        result.append({
            "id":          l.id,
            "name":        l.name,
            "username":    l.username,
            "email":       l.email,
            "phone":       l.phone,
            "is_active":   l.is_active,
            "group_id":    l.group_id,
            "group_name":  group.name if group else None,
            "member_count":member_count,
            "savings":     group.total_savings if group else 0,
        })
    return result

@router.get("/users")
def get_users(role: Optional[str] = None, db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    q = db.query(User)
    if role: q = q.filter(User.role == role)
    users = q.all()
    result = []
    for u in users:
        group = db.query(Group).filter(Group.id == u.group_id).first() if u.group_id else None
        user_data = {
            "id": u.id,
            "name": u.name,
            "username": u.username,
            "email": u.email,
            "phone": u.phone,
            "role": u.role,
            "is_active": u.is_active,
            "group_id": u.group_id,
            "group_name": group.name if group else None,
            "member_id": u.member_id,
            "occupation": None,
            "total_savings": None,
            "total_loans": None,
            "status": None,
            "join_date": None,
        }
        if u.role == "member":
            member = db.query(Member).filter(Member.member_id == u.member_id).first()
            if member:
                user_data.update({
                    "occupation": member.occupation,
                    "total_savings": member.total_savings,
                    "total_loans": member.total_loans,
                    "status": member.status,
                    "join_date": str(member.join_date),
                })
        result.append(user_data)
    return result

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    db.delete(user); db.commit()
    return {"message":"User deleted"}

@router.patch("/users/{user_id}/toggle-status")
def toggle_status(user_id: int, db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active; db.commit()
    return {"is_active": user.is_active}

@router.get("/check-users")
def check_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{"username":u.username,"name":u.name,"role":u.role,"group_id":u.group_id,"active":u.is_active} for u in users]

@router.post("/request-password-reset")
def request_password_reset(data: PasswordResetRequest, background: BackgroundTasks, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if not user:
        return {"message": "If this email exists, an OTP has been sent to your inbox."}

    otp = generate_otp()
    create_auth_token(db, user, "password_reset", otp=otp, email=user.email)

    from routes.notifications import send_email_background
    if user.email:
        body = f"<p>Hello {user.name},</p><p>Use this OTP to reset your password: <strong>{otp}</strong></p><p>This code will expire in 15 minutes.</p>"
        background.add_task(send_email_background, user.email, "Smart Bachatgat Password Reset", body)

    return {"message": "If this email exists, an OTP has been sent to your inbox."}

@router.post("/verify-otp")
def verify_otp(data: OTPVerifyRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    otp = data.otp.strip()
    token = db.query(AuthToken).filter(
        AuthToken.email == email,
        AuthToken.type == "password_reset",
        AuthToken.otp == otp,
        AuthToken.is_used == False,
        AuthToken.expires_at >= datetime.utcnow()
    ).order_by(AuthToken.created_at.desc()).first()

    if not token:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP. Please request a new one.")

    return {"message": "OTP verified"}

@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    otp = data.otp.strip()
    token = db.query(AuthToken).filter(
        AuthToken.email == email,
        AuthToken.type == "password_reset",
        AuthToken.otp == otp,
        AuthToken.is_used == False,
        AuthToken.expires_at >= datetime.utcnow()
    ).order_by(AuthToken.created_at.desc()).first()

    if not token:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP. Please request a new one.")

    user = db.query(User).filter(func.lower(User.email) == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found for this email.")

    user.password = hash_password(data.new_password)
    token.is_used = True
    db.commit()
    return {"message": "Password reset successful"}

@router.post("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    auth_token = db.query(AuthToken).filter(
        AuthToken.token == token,
        AuthToken.type == "email_verify",
        AuthToken.is_used == False,
        AuthToken.expires_at >= datetime.utcnow()
    ).first()
    if not auth_token:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token.")

    user = db.query(User).filter(User.id == auth_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    auth_token.is_used = True
    db.commit()
    return {"message": "Email verified successfully"}

# ── LOGIN ────────────────────────────────────────────────
@router.post("/login")
def login(data: LoginRequest, background: BackgroundTasks, db: Session = Depends(get_db)):
    # Case-insensitive username search
    user = db.query(User).filter(User.username == data.username.strip()).first()
    if not user:
        all_users = db.query(User).all()
        for u in all_users:
            if u.username.lower() == data.username.strip().lower():
                user = u; break

    if not user:
        raise HTTPException(status_code=401,
            detail=f"No account found with username '{data.username}'. Please register first.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled. Contact admin.")

    if not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Wrong password. Please try again.")

    # Enforce email verification only if email_verified is False
    if user.email and not user.email_verified:
        latest_verification = db.query(AuthToken).filter(
            AuthToken.user_id == user.id,
            AuthToken.type == "email_verify"
        ).order_by(AuthToken.created_at.desc()).first()
        if latest_verification and not latest_verification.is_used:
            raise HTTPException(
                status_code=403,
                detail="Email address not verified. Please verify your email before logging in."
            )

    # Get group info for token
    group = db.query(Group).filter(Group.id == user.group_id).first() if user.group_id else None

    leader_name = None
    login_leader_id = user.leader_id
    if user.role == "leader":
        leader_name = user.name
    elif user.role == "member" and group and group.leader_id:
        leader = db.query(User).filter(User.id == group.leader_id).first()
        leader_name = leader.name if leader else None
        login_leader_id = leader.leader_id if leader else None

    token = create_access_token({
        "user_id":   user.id,
        "role":      user.role,
        "name":      user.name,
        "group_id":  user.group_id,
        "member_id": user.member_id,
    })

    # Send login alert email (best-effort)
    try:
        if user.email:
            from routes.notifications import send_email_background
            body = f"<p>Hello {user.name},</p><p>You just logged into Smart Bachatgat on {datetime.utcnow()} UTC. If this wasn't you, please reset your password or contact admin.</p>"
            background.add_task(send_email_background, user.email, "Login Alert - Smart Bachatgat", body)
    except Exception:
        pass

    return {
        "access_token": token,
        "token_type":   "bearer",
        "user": {
            "id":         user.id,
            "name":       user.name,
            "role":        user.role,
            "group_id":    user.group_id,
            "member_id":  user.member_id,
            "leader_id":  login_leader_id,
            "group_name": group.name if group else None,
            "leader_name": leader_name,
            "email":       user.email,
        }
    }