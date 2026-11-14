from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.repayment import Repayment
from models.loan import Loan
from utils.auth import require_role, get_current_user
from pydantic import BaseModel
from datetime import date

router = APIRouter(prefix="/repayments", tags=["Repayments"])

class RepaymentCreate(BaseModel):
    loan_id:            int
    member_id:          int
    installment_amount: float
    payment_date:       date

@router.post("/", status_code=201)
def add_repayment(data: RepaymentCreate, db: Session = Depends(get_db), current_user=Depends(require_role("admin", "leader"))):
    loan = db.query(Loan).filter(Loan.id == data.loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.status == "Closed":
        raise HTTPException(status_code=400, detail="Loan already fully paid")
    loan.amount_paid += data.installment_amount
    loan.balance     -= data.installment_amount
    if loan.balance <= 0:
        loan.balance = 0
        loan.status  = "Closed"
    repayment = Repayment(**data.dict(), remaining_balance=loan.balance, recorded_by=current_user.id)
    db.add(repayment)
    db.commit()
    db.refresh(repayment)
    return repayment

@router.get("/loan/{loan_id}")
def get_repayments(loan_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if current_user.role == "leader" and loan.group_id != current_user.group_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role == "member":
        from models.member import Member
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
    return db.query(Repayment).filter(Repayment.loan_id == loan_id).order_by(Repayment.payment_date.desc()).all()

@router.get("/my-repayments")
def my_repayments(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    from models.member import Member
    from models.loan import Loan
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
    # Get member's loans
    loans = db.query(Loan).filter(Loan.member_id == member.id).all()
    loan_ids = [l.id for l in loans]
    if not loan_ids:
        return []
    return db.query(Repayment).filter(Repayment.loan_id.in_(loan_ids)).order_by(Repayment.payment_date.desc()).all()
