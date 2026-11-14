from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.member import Member
from models.deposit import Deposit
from models.loan import Loan
from models.group import Group
from utils.auth import require_role
from utils.loan_utils import mark_overdue_loans
from datetime import date

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/admin")
def admin_dashboard(db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    from models.user import User
    mark_overdue_loans(db)
    today = date.today()
    return {
        "total_groups":  db.query(Group).filter(Group.status == "Active").count(),
        "total_leaders": db.query(User).filter(User.role == "leader", User.is_active == True).count(),
        "total_members": db.query(Member).filter(Member.status == "Active").count(),
        "total_savings": db.query(func.sum(Group.total_savings)).scalar() or 0,
        "active_loans":  db.query(Loan).filter(Loan.status.in_(["Active", "Overdue"])).count(),
        "overdue_loans": db.query(Loan).filter(Loan.status == "Overdue").count(),
        "total_loan_amount": db.query(func.sum(Loan.amount)).scalar() or 0,
    }

@router.get("/leader/{group_id}")
def leader_dashboard(group_id: int, db: Session = Depends(get_db), current_user=Depends(require_role("leader", "admin"))):
    if current_user.role == "leader" and current_user.group_id != group_id:
        return {
            "total_members": 0,
            "total_savings": 0,
            "active_loans": 0,
            "overdue_loans": 0,
            "recent_deposits": [],
        }
    mark_overdue_loans(db)
    today = date.today()
    recent = db.query(Deposit).filter(Deposit.group_id == group_id).order_by(Deposit.date.desc()).limit(5).all()
    return {
        "total_members":   db.query(Member).filter(Member.group_id == group_id, Member.status == "Active").count(),
        "total_savings":   db.query(func.sum(Deposit.amount)).filter(Deposit.group_id == group_id).scalar() or 0,
        "active_loans":    db.query(Loan).filter(Loan.group_id == group_id, Loan.status.in_(["Active", "Overdue"])).count(),
        "overdue_loans":   db.query(Loan).filter(Loan.group_id == group_id, Loan.status == "Overdue").count(),
        "recent_deposits": [{"id": d.id, "member_id": d.member_id, "amount": d.amount, "date": str(d.date)} for d in recent],
    }

@router.get("/member")
def member_dashboard(db: Session = Depends(get_db), current_user=Depends(require_role("member"))):
    mark_overdue_loans(db)
    member = db.query(Member).filter(Member.member_id == current_user.member_id).first()
    if not member:
        return {"message": "Profile not found"}
    months_active = max((date.today() - member.join_date).days // 30, 1)
    deposit_count = db.query(Deposit).filter(Deposit.member_id == member.id).count()
    credit_score  = min(int((deposit_count / months_active) * 100), 100)
    active_loans  = db.query(Loan).filter(Loan.member_id == member.id, Loan.status == "Active").all()
    recent        = db.query(Deposit).filter(Deposit.member_id == member.id).order_by(Deposit.date.desc()).limit(5).all()
    return {
        "name":            member.name,
        "member_id":       member.member_id,
        "total_savings":   member.total_savings,
        "total_loans":     member.total_loans,
        "meetings_att":    member.meetings_att,
        "credit_score":    credit_score,
        "active_loans":    [{"loan_id": l.loan_id, "amount": l.amount, "balance": l.balance, "status": l.status} for l in active_loans],
        "recent_deposits": [{"amount": d.amount, "date": str(d.date), "description": d.description} for d in recent],
    }