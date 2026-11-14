from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models.loan import Loan
from models.member import Member
from models.group import Group
from models.notification import Notification
from utils.auth import get_current_user, require_role
from pydantic import BaseModel
from typing import Optional
from datetime import date, timedelta
import random, string
from utils.loan_utils import (
    mark_overdue_loans as _mark_overdue_loans,
    calculate_fine_amount,
    get_overdue_summary,
    get_loan_details
)

router = APIRouter(prefix="/loans", tags=["Loans"])

def gen_loan_id(db):
    while True:
        lid = "L" + "".join(random.choices(string.digits, k=4))
        if not db.query(Loan).filter(Loan.loan_id == lid).first():
            return lid


class LoanCreate(BaseModel):
    member_id:      int
    group_id:       int
    amount:         float
    interest_rate:  float = 2.0
    disbursed_date: date
    due_date:       Optional[date] = None

class LoanApply(BaseModel):
    amount:        float
    purpose:       str
    tenure_months: int = 6
    documents:     Optional[str] = None
    notes:         Optional[str] = None

@router.get("/group/{group_id}")
def get_loans(group_id: int, db: Session = Depends(get_db),
              current_user=Depends(get_current_user)):
    _mark_overdue_loans(db)
    if current_user.role == "leader" and current_user.group_id != group_id:
        return []
    return db.query(Loan).filter(
        Loan.group_id == group_id
    ).order_by(Loan.disbursed_date.desc()).all()

@router.get("/")
def list_loans(group_id: Optional[int] = None, db: Session = Depends(get_db),
               current_user=Depends(get_current_user)):
    _mark_overdue_loans(db)
    q = db.query(Loan)
    if current_user.role == "leader":
        q = q.filter(Loan.group_id == current_user.group_id)
    elif current_user.role == "member":
        member = None
        if current_user.member_id:
            member = db.query(Member).filter(Member.member_id == current_user.member_id).first()
        if not member:
            member = db.query(Member).filter(
                Member.group_id == current_user.group_id,
                Member.name == current_user.name
            ).first()
        if not member:
            return []
        q = q.filter(Loan.member_id == member.id)
    if group_id:
        q = q.filter(Loan.group_id == group_id)
    return q.order_by(Loan.disbursed_date.desc()).all()

@router.post("/", status_code=201)
def create_loan(data: LoanCreate, db: Session = Depends(get_db),
                current_user=Depends(get_current_user)):
    if current_user.role == "leader" and current_user.group_id != data.group_id:
        raise HTTPException(status_code=403, detail="Cannot create loan outside your group")
    loan_id = gen_loan_id(db)
    due     = data.due_date or (date.today() + timedelta(days=180))
    loan    = Loan(
        loan_id=loan_id, member_id=data.member_id,
        group_id=data.group_id, amount=data.amount,
        interest_rate=data.interest_rate,
        disbursed_date=data.disbursed_date, due_date=due,
        amount_paid=0.0, balance=data.amount,
        status="Active", approved_by=current_user.id
    )
    db.add(loan)
    member = db.query(Member).filter(Member.id == data.member_id).first()
    if member:
        member.total_loans += data.amount
    db.commit()
    db.refresh(loan)
    return loan

# ── Member applies for loan ──────────────────────────────
@router.post("/apply", status_code=201)
def apply_loan(data: LoanApply, db: Session = Depends(get_db),
               current_user=Depends(get_current_user)):
    if current_user.role != "member":
        raise HTTPException(status_code=403, detail="Only members can apply for loans")
    # Find member profile
    member = None
    if current_user.member_id:
        member = db.query(Member).filter(Member.member_id == current_user.member_id).first()
    if not member:
        member = db.query(Member).filter(
            Member.group_id == current_user.group_id,
            Member.name == current_user.name
        ).first()
    if not member:
        raise HTTPException(status_code=404,
            detail="Member profile not found. Ask your leader to add you first.")

    # Check no active loan already
    active = db.query(Loan).filter(
        Loan.member_id == member.id,
        Loan.status.in_(["Active","Pending"])
    ).first()
    if active:
        raise HTTPException(status_code=400,
            detail="You already have an active or pending loan.")

    loan_id = gen_loan_id(db)
    due     = date.today() + timedelta(days=data.tenure_months * 30)

    loan = Loan(
        loan_id       = loan_id,
        member_id     = member.id,
        group_id      = member.group_id,
        amount        = data.amount,
        interest_rate = 2.0,
        disbursed_date= date.today(),
        due_date      = due,
        amount_paid   = 0.0,
        balance       = data.amount,
        status        = "Pending",   # needs leader approval
        approved_by   = None,
        notes         = f"Purpose: {data.purpose}. Documents: {data.documents or 'Not specified'}. {data.notes or ''}"
    )
    db.add(loan)
    member.total_loans += data.amount
    db.commit()
    db.refresh(loan)

    # Notify leader
    from models.user import User
    from models.group import Group
    group  = db.query(Group).filter(Group.id == member.group_id).first()
    leader = db.query(User).filter(User.id == group.leader_id).first() if group else None
    if leader:
        n = Notification(
            user_id  = leader.id,
            group_id = member.group_id,
            title    = f"🏦 Loan Application: {member.name}",
            message  = f"{member.name} applied for ₹{data.amount:,.0f} loan. Purpose: {data.purpose}. Please review.",
            type     = "info"
        )
        db.add(n)
        db.commit()

    return {"loan_id": loan_id, "status": "Pending", "amount": data.amount,
            "message": "Application submitted! Awaiting leader approval."}

@router.get("/my-loans")
def my_loans(db: Session = Depends(get_db),
             current_user=Depends(get_current_user)):
    _mark_overdue_loans(db)
    member = None
    if current_user.member_id:
        member = db.query(Member).filter(Member.member_id == current_user.member_id).first()
    if not member:
        member = db.query(Member).filter(
            Member.group_id == current_user.group_id,
            Member.name == current_user.name
        ).first()
    if not member:
        return []
    return db.query(Loan).filter(
        Loan.member_id == member.id
    ).order_by(Loan.disbursed_date.desc()).all()

@router.patch("/{loan_id}/approve")
def approve_loan(loan_id: int, db: Session = Depends(get_db),
                 background: BackgroundTasks = None, current_user=Depends(get_current_user)):
    if current_user.role not in ["leader", "admin"]:
        raise HTTPException(status_code=403, detail="Only leaders or admin can approve loans")
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if current_user.role == "leader" and current_user.group_id != loan.group_id:
        raise HTTPException(status_code=403, detail="Cannot approve loan outside your group")
    loan.status      = "Active"
    loan.approved_by = current_user.id
    db.commit()
    
    # Notify member (in-app) and send approval email
    from models.user import User as UserModel
    from utils.email_service import create_loan_due_reminder
    member = db.query(Member).filter(Member.id == loan.member_id).first()
    if member:
        user = db.query(UserModel).filter(UserModel.name == member.name, UserModel.group_id == member.group_id).first()
        if user:
            n = Notification(
                user_id=user.id,
                group_id=loan.group_id,
                title="🎉 Loan Approved!",
                message=f"Your loan application for ₹{loan.amount:,.0f} has been approved!",
                type="success"
            )
            db.add(n)
            db.commit()
            try:
                if user.email and background:
                    from routes.notifications import send_email_background
                    html = create_loan_due_reminder(user.name, loan.amount, str(loan.due_date), loan.loan_id)
                    background.add_task(send_email_background, user.email, "Loan Approved - Smart Bachatgat", html)
            except Exception:
                pass
    
    return {"message": "Loan approved"}

@router.patch("/{loan_id}/reject")
def reject_loan(loan_id: int, background: BackgroundTasks = None, db: Session = Depends(get_db),
                current_user=Depends(get_current_user)):
    if current_user.role not in ["leader", "admin"]:
        raise HTTPException(status_code=403, detail="Only leaders or admin can reject loans")
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if current_user.role == "leader" and current_user.group_id != loan.group_id:
        raise HTTPException(status_code=403, detail="Cannot reject loan outside your group")
    loan.status = "Rejected"
    db.commit()
    
    # Notify member (in-app) and send rejection email
    from models.user import User as UserModel
    member = db.query(Member).filter(Member.id == loan.member_id).first()
    if member:
        user = db.query(UserModel).filter(UserModel.name == member.name, UserModel.group_id == member.group_id).first()
        if user:
            n = Notification(
                user_id=user.id,
                group_id=loan.group_id,
                title="📋 Loan Application Rejected",
                message=f"Your loan application for ₹{loan.amount:,.0f} was not approved. Please contact your leader.",
                type="warning"
            )
            db.add(n)
            db.commit()
            try:
                if user.email and background:
                    from routes.notifications import send_email_background
                    body = f"<p>Dear {user.name},</p><p>Your loan application for ₹{loan.amount:,.0f} was not approved. Please contact your leader for details.</p>"
                    background.add_task(send_email_background, user.email, "Loan Application Rejected - Smart Bachatgat", body)
            except Exception:
                pass
    
    return {"message": "Loan rejected"}

@router.get("/overdue")
def overdue_loans(db: Session = Depends(get_db),
                  current_user=Depends(get_current_user)):
    _mark_overdue_loans(db)
    q = db.query(Loan).filter(Loan.status == "Overdue")
    if current_user.role == "leader":
        q = q.filter(Loan.group_id == current_user.group_id)
    elif current_user.role == "member":
        member = None
        if current_user.member_id:
            member = db.query(Member).filter(Member.member_id == current_user.member_id).first()
        if not member:
            member = db.query(Member).filter(
                Member.group_id == current_user.group_id,
                Member.name == current_user.name
            ).first()
        if not member:
            return []
        q = q.filter(Loan.member_id == member.id)
    return q.order_by(Loan.due_date.asc()).all()

@router.get("/{loan_id}")
def get_loan(loan_id: int, db: Session = Depends(get_db),
             current_user=Depends(get_current_user)):
    _mark_overdue_loans(db)
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if current_user.role == "leader" and loan.group_id != current_user.group_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role == "member":
        member = None
        if current_user.member_id:
            member = db.query(Member).filter(Member.member_id == current_user.member_id).first()
        if not member:
            member = db.query(Member).filter(
                Member.group_id == current_user.group_id,
                Member.name == current_user.name
            ).first()
        if not member or loan.member_id != member.id:
            raise HTTPException(status_code=403, detail="Access denied")
    return loan

# ── NEW: Overdue Detection & Fine Calculation Endpoints ──────────────────────

@router.get("/overdue/summary")
def get_overdue_summary_endpoint(group_id: Optional[int] = None, 
                                db: Session = Depends(get_db),
                                current_user=Depends(get_current_user)):
    """
    Get summary of overdue loans and fines in the system or group
    Returns: dict with overdue stats
    """
    _mark_overdue_loans(db)
    
    # Authorization check
    if current_user.role == "leader":
        group_id = current_user.group_id
    elif current_user.role == "member":
        raise HTTPException(status_code=403, detail="Members cannot access this summary")
    
    summary = get_overdue_summary(db, group_id)
    return {
        "status": "success",
        "data": summary,
        "timestamp": date.today().isoformat()
    }

@router.get("/overdue/list")
def list_overdue_loans(group_id: Optional[int] = None,
                       db: Session = Depends(get_db),
                       current_user=Depends(get_current_user)):
    """
    List all overdue loans with fine details
    Returns: List of overdue loans with calculated fines
    """
    _mark_overdue_loans(db)
    
    # Build query
    q = db.query(Loan).filter(
        Loan.status.in_(["Active", "Overdue", "Default"]),
        Loan.due_date != None,
        Loan.due_date < date.today(),
        Loan.balance > 0
    )
    
    # Authorization
    if current_user.role == "leader":
        q = q.filter(Loan.group_id == current_user.group_id)
    elif current_user.role == "member":
        raise HTTPException(status_code=403, detail="Members cannot access this list")
    elif group_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can filter by group")
    
    if group_id:
        q = q.filter(Loan.group_id == group_id)
    
    overdue_loans = q.order_by(Loan.due_date.asc()).all()
    
    return {
        "status": "success",
        "count": len(overdue_loans),
        "data": [get_loan_details(loan) for loan in overdue_loans]
    }

@router.get("/{loan_id}/details")
def get_loan_with_fine_details(loan_id: int, 
                               db: Session = Depends(get_db),
                               current_user=Depends(get_current_user)):
    """
    Get detailed loan information including overdue status and fine amount
    Returns: Dict with all loan details and calculated fines
    """
    _mark_overdue_loans(db)
    
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    # Authorization check
    if current_user.role == "leader" and loan.group_id != current_user.group_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role == "member":
        member = None
        if current_user.member_id:
            member = db.query(Member).filter(Member.member_id == current_user.member_id).first()
        if not member:
            member = db.query(Member).filter(
                Member.group_id == current_user.group_id,
                Member.name == current_user.name
            ).first()
        if not member or loan.member_id != member.id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return {
        "status": "success",
        "data": get_loan_details(loan)
    }

@router.post("/{loan_id}/mark-default")
def mark_loan_as_default(loan_id: int,
                        db: Session = Depends(get_db),
                        current_user=Depends(require_role("leader", "admin"))):
    """
    Manually mark a loan as default (admin/leader only)
    """
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    if current_user.role == "leader" and loan.group_id != current_user.group_id:
        raise HTTPException(status_code=403, detail="Cannot mark loan outside your group")
    
    # Calculate final fine
    days_overdue, fine_amount, status = calculate_fine_amount(loan)
    
    # Update loan
    loan.status = "Default"
    loan.fine_amount = fine_amount
    loan.is_overdue = True
    
    # Add note
    notes = (loan.notes or "").strip()
    if notes:
        notes += "\n"
    notes += f"[{date.today().isoformat()}] Manually marked as Default by {current_user.name}. Final fine: ₹{fine_amount:.2f}"
    loan.notes = notes
    
    db.commit()
    
    # Notify member
    member = db.query(Member).filter(Member.id == loan.member_id).first()
    if member:
        from models.user import User as UserModel
        user = db.query(UserModel).filter(UserModel.member_id == member.member_id).first()
        if user:
            n = Notification(
                user_id=user.id,
                group_id=loan.group_id,
                title="⚠️ Loan Status Changed to Default",
                message=f"Your loan {loan.loan_id} has been marked as DEFAULT. Outstanding fine: ₹{fine_amount:.2f}. Please contact your group leader.",
                type="warning"
            )
            db.add(n)
            db.commit()
    
    return {
        "status": "success",
        "message": "Loan marked as default",
        "data": get_loan_details(loan)
    }

@router.get("/member/{member_id}/overdue")
def get_member_overdue_loans(member_id: int,
                            db: Session = Depends(get_db),
                            current_user=Depends(require_role("leader", "admin"))):
    """
    Get all overdue loans for a specific member
    """
    _mark_overdue_loans(db)
    
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    if current_user.role == "leader" and member.group_id != current_user.group_id:
        raise HTTPException(status_code=403, detail="Cannot access member outside your group")
    
    loans = db.query(Loan).filter(
        Loan.member_id == member_id,
        Loan.status.in_(["Overdue", "Default"]),
        Loan.balance > 0
    ).order_by(Loan.due_date.asc()).all()
    
    total_fine = sum(loan.fine_amount or 0.0 for loan in loans)
    total_balance = sum(loan.balance for loan in loans)
    
    return {
        "status": "success",
        "member_id": member_id,
        "member_name": member.name,
        "overdue_count": len(loans),
        "total_balance": round(total_balance, 2),
        "total_fine": round(total_fine, 2),
        "total_due": round(total_balance + total_fine, 2),
        "loans": [get_loan_details(loan) for loan in loans]
    }