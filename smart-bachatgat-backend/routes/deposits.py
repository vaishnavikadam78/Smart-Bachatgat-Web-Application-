from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.deposit import Deposit
from models.member import Member
from models.group import Group
from models.notification import Notification
from utils.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
from datetime import date

router = APIRouter(prefix="/deposits", tags=["Deposits"])

class DepositCreate(BaseModel):
    member_id:   int
    group_id:    int
    amount:      float
    date:        date
    description: Optional[str] = "Monthly Savings"

@router.get("/group/{group_id}")
def get_deposits(group_id: int, db: Session = Depends(get_db),
                 current_user=Depends(get_current_user)):
    """Leader sees only their group's deposits"""
    if current_user.role == "leader" and current_user.group_id != group_id:
        return []
    return db.query(Deposit).filter(
        Deposit.group_id == group_id
    ).order_by(Deposit.date.desc()).all()

@router.post("/", status_code=201)
def add_deposit(data: DepositCreate, db: Session = Depends(get_db),
                current_user=Depends(get_current_user)):
    # Leader can only add to their own group
    if current_user.role == "leader" and current_user.group_id != data.group_id:
        raise HTTPException(status_code=403, detail="Cannot add deposit to another group")

    deposit = Deposit(
        member_id=data.member_id, group_id=data.group_id,
        amount=data.amount, date=data.date,
        description=data.description, recorded_by=current_user.id
    )
    db.add(deposit)

    member = db.query(Member).filter(Member.id == data.member_id).first()
    if member:
        member.total_savings += data.amount

    group = db.query(Group).filter(Group.id == data.group_id).first()
    if group:
        group.total_savings += data.amount

    db.commit()
    db.refresh(deposit)
    return deposit

@router.get("/my-savings")
def my_savings(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
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
    return db.query(Deposit).filter(
        Deposit.member_id == member.id
    ).order_by(Deposit.date.desc()).all()

@router.get("/my-deposits")
def my_deposits(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Alias for my-savings for compatibility"""
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
    return db.query(Deposit).filter(
        Deposit.member_id == member.id
    ).order_by(Deposit.date.desc()).all()

@router.delete("/{deposit_id}")
def delete_deposit(deposit_id: int, db: Session = Depends(get_db),
                   current_user=Depends(get_current_user)):
    d = db.query(Deposit).filter(Deposit.id == deposit_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Not found")
    if current_user.role == "leader" and d.group_id != current_user.group_id:
        raise HTTPException(status_code=403, detail="Cannot delete deposits outside your group")
    if current_user.role == "member":
        raise HTTPException(status_code=403, detail="Members cannot delete deposits")
    db.delete(d)
    db.commit()
    return {"message": "Deleted"}