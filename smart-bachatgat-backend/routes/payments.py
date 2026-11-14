from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models.payment import Payment
from models.member import Member
from models.user import User
from models.deposit import Deposit
from models.group import Group
from models.notification import Notification
from utils.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import random, string
from datetime import date
from utils.email_service import create_payment_confirmation

router = APIRouter(prefix="/payments", tags=["Payments"])

def gen_txn_id():
    return "TXN" + "".join(random.choices(string.digits, k=10))

class PaymentCreate(BaseModel):
    amount:       float
    payment_type: str
    payment_mode: Optional[str] = None
    purpose:      Optional[str] = "Monthly Savings"
    notes:        Optional[str] = None

@router.post("/initiate")
def initiate_payment(data: PaymentCreate, background: BackgroundTasks, db: Session = Depends(get_db),
                     current_user=Depends(get_current_user)):
    member = None
    if current_user.member_id:
        member = db.query(Member).filter(Member.member_id == current_user.member_id).first()
    if not member:
        member = db.query(Member).filter(
            Member.name == current_user.name,
            Member.group_id == current_user.group_id
        ).first()
    if not member:
        raise HTTPException(status_code=404,
            detail="Member profile not found. Ask your leader to add you to the group first.")

    txn_id = gen_txn_id()
    status = "Success" if data.payment_type == "Online" else "Pending"

    # ── Save payment record ──
    payment = Payment(
        transaction_id = txn_id,
        member_id      = member.id,
        group_id       = member.group_id,
        amount         = data.amount,
        payment_type   = data.payment_type,
        payment_mode   = data.payment_mode,
        status         = status,
        purpose        = data.purpose,
        notes          = data.notes
    )
    db.add(payment)

    # ── ALSO save to deposits table so it shows in MyReports ──
    if status == "Success":
        deposit = Deposit(
            member_id   = member.id,
            group_id    = member.group_id,
            amount      = data.amount,
            date        = date.today(),
            description = f"{data.payment_type} Payment — {data.purpose or 'Savings'}",
            recorded_by = current_user.id
        )
        db.add(deposit)

        # Update savings totals
        member.total_savings += data.amount
        group = db.query(Group).filter(Group.id == member.group_id).first()
        if group:
            group.total_savings += data.amount

        # Notify member (in-app)
        # Find the user account associated with this member
        user = db.query(User).filter(User.member_id == member.member_id, User.group_id == member.group_id).first()
        n = Notification(
            user_id  = user.id if user else current_user.id,
            group_id = member.group_id,
            title    = "💳 Payment Successful",
            message  = f"₹{data.amount:,.0f} payment received. Transaction ID: {txn_id}",
            type     = "payment"
        )
        db.add(n)

    db.commit()

    # Send payment receipt email if member has email
    try:
        if member and member.email:
            from routes.notifications import send_email_background
            html = create_payment_confirmation(member.name, data.amount, txn_id, str(date.today()))
            background.add_task(send_email_background, member.email, "Payment Receipt - Smart Bachatgat", html)
    except Exception:
        pass

    return {
        "transaction_id": txn_id,
        "status":         status,
        "amount":         data.amount,
        "payment_type":   data.payment_type,
        "payment_mode":   data.payment_mode,
        "purpose":        data.purpose,
        "timestamp":      str(date.today()),
        "message":        "Payment successful! Added to your savings." if status == "Success"
                          else "Offline payment recorded. Leader will verify."
    }

@router.get("/my-payments")
def my_payments(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    member = None
    if current_user.member_id:
        member = db.query(Member).filter(Member.member_id == current_user.member_id).first()
    if not member:
        member = db.query(Member).filter(
            Member.name == current_user.name,
            Member.group_id == current_user.group_id
        ).first()
    if not member:
        return []
    return db.query(Payment).filter(
        Payment.member_id == member.id
    ).order_by(Payment.created_at.desc()).all()

@router.get("/group/{group_id}")
def group_payments(group_id: int, db: Session = Depends(get_db),
                   current_user=Depends(get_current_user)):
    if current_user.role == "leader" and current_user.group_id != group_id:
        return []
    return db.query(Payment).filter(
        Payment.group_id == group_id
    ).order_by(Payment.created_at.desc()).all()

@router.patch("/{payment_id}/verify")
def verify_payment(payment_id: int, background: BackgroundTasks, db: Session = Depends(get_db),
                   current_user=Depends(get_current_user)):
    if current_user.role == "member":
        raise HTTPException(status_code=403, detail="Members cannot verify payments")
    p = db.query(Payment).filter(Payment.id == payment_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    if current_user.role == "leader" and current_user.group_id != p.group_id:
        raise HTTPException(status_code=403, detail="Cannot verify payments outside your group")
    p.status = "Success"
    # Also record as deposit
    deposit = Deposit(
        member_id=p.member_id, group_id=p.group_id,
        amount=p.amount, date=date.today(),
        description=f"Offline Payment Verified — {p.transaction_id}",
        recorded_by=current_user.id
    )
    db.add(deposit)
    member = db.query(Member).filter(Member.id == p.member_id).first()
    if member:
        member.total_savings += p.amount
        # notify member in-app and by email when leader verifies offline payment
        user = db.query(User).filter(User.member_id == member.member_id, User.group_id == member.group_id).first()
        if user:
            notif = Notification(
                user_id=user.id,
                group_id=member.group_id,
                title="💳 Payment Verified",
                message=f"Your offline payment of ₹{p.amount:,.0f} has been verified. Transaction ID: {p.transaction_id}",
                type="payment"
            )
            db.add(notif)
            try:
                if user.email:
                    from routes.notifications import send_email_background
                    html = create_payment_confirmation(user.name, p.amount, p.transaction_id, str(date.today()))
                    background.add_task(send_email_background, user.email, "Payment Verified - Smart Bachatgat", html)
            except Exception:
                pass
    group = db.query(Group).filter(Group.id == p.group_id).first()
    if group:
        group.total_savings += p.amount
    db.commit()
    return {"message": "Payment verified and added to savings"}