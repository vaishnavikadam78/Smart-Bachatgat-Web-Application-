from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.loan import Loan
from models.deposit import Deposit
from models.member import Member
from models.group import Group
from models.repayment import Repayment
from models.scheme import SchemeApplication
from models.payment import Payment
from models.notification import Notification
from models.auth_token import AuthToken
from models.user import User
from models.meeting import Meeting
from utils.auth import require_role
from sqlalchemy import delete

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.post("/reset/all-data")
def reset_all_data(db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    """Delete ALL data except the seeded admin user (full reset)"""
    try:
        db.execute(delete(Notification))
        db.execute(delete(AuthToken))
        db.execute(delete(Payment))
        db.execute(delete(Repayment))
        db.execute(delete(Loan))
        db.execute(delete(Deposit))
        db.execute(delete(SchemeApplication))
        db.execute(delete(Member))
        db.execute(delete(Meeting))
        db.execute(delete(Group))
        db.execute(delete(User).where(User.username != "vaishnavi"))
        db.commit()
        return {
            "message": "All data reset successfully",
            "deleted": "users (except vaishnavi), groups, members, loans, deposits, payments, notifications, tokens"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")

@router.post("/reset/member-data")
def reset_member_data(db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    """Delete all members and their related data"""
    try:
        # Delete member-related data
        db.execute(delete(Repayment))
        db.execute(delete(Loan))
        db.execute(delete(Deposit))
        db.execute(delete(SchemeApplication))
        db.execute(delete(Member))
        db.commit()
        return {"message": "Member data reset successfully", "deleted": "members, loans, deposits, scheme applications"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")

@router.post("/reset/loans")
def reset_loans(db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    """Delete all loans and repayments"""
    try:
        db.execute(delete(Repayment))
        db.execute(delete(Loan))
        db.commit()
        return {"message": "Loan data reset successfully", "deleted": "loans, repayments"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")

@router.post("/reset/transactions")
def reset_transactions(db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    """Delete all deposits and transactions"""
    try:
        db.execute(delete(Deposit))
        db.commit()
        return {"message": "Transaction data reset successfully", "deleted": "deposits"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")

@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    """Get system statistics"""
    from models.user import User
    from models.notification import Notification
    from models.meeting import Meeting
    
    groups     = db.query(Group).count()
    members    = db.query(Member).count()
    users      = db.query(User).count()
    leaders    = db.query(User).filter(User.role == "leader").count()
    loans      = db.query(Loan).count()
    deposits   = db.query(Deposit).count()
    repayments = db.query(Repayment).count()
    meetings   = db.query(Meeting).count()
    notifs     = db.query(Notification).count()
    
    return {
        "groups": groups,
        "members": members,
        "users": users,
        "leaders": leaders,
        "loans": loans,
        "deposits": deposits,
        "repayments": repayments,
        "meetings": meetings,
        "notifications": notifs
    }

@router.get("/members")
def get_all_members_with_leader(db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    """Get all members with their leader and group information"""
    members = db.query(Member).all()
    result = []
    
    for member in members:
        group = db.query(Group).filter(Group.id == member.group_id).first()
        leader = db.query(User).filter(User.id == member.leader_id).first() if member.leader_id else None
        
        result.append({
            "id": member.id,
            "member_id": member.member_id,
            "name": member.name,
            "phone": member.phone,
            "email": member.email,
            "group_id": member.group_id,
            "group_name": group.name if group else "N/A",
            "group_suffix": group.group_id if group else "N/A",
            "leader_id": member.leader_id,
            "leader_name": leader.name if leader else "N/A",
            "leader_code": leader.leader_id if leader else "N/A",
            "status": member.status,
            "join_date": str(member.join_date) if member.join_date else None,
            "total_savings": member.total_savings,
            "meetings_attended": member.meetings_att,
        })
    
    return result

@router.get("/leaders")
def get_all_leaders_with_group(db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    """Get all leaders with their group and member count"""
    leaders = db.query(User).filter(User.role == "leader").all()
    result = []
    
    for leader in leaders:
        group = db.query(Group).filter(Group.id == leader.group_id).first()
        member_count = db.query(Member).filter(Member.leader_id == leader.id, Member.status == "Active").count()
        
        result.append({
            "id": leader.id,
            "name": leader.name,
            "username": leader.username,
            "leader_id": leader.leader_id,
            "email": leader.email,
            "phone": leader.phone,
            "group_id": leader.group_id,
            "group_name": group.name if group else "N/A",
            "group_suffix": group.group_id if group else "N/A",
            "member_count": member_count,
            "status": "Active" if leader.is_active else "Inactive",
        })
    
    return result

@router.get("/groups-detailed")
def get_all_groups_detailed(db: Session = Depends(get_db), current_user=Depends(require_role("admin"))):
    """Get all groups with leader and member details"""
    groups = db.query(Group).all()
    result = []
    
    for group in groups:
        leader = db.query(User).filter(User.id == group.leader_id).first() if group.leader_id else None
        member_count = db.query(Member).filter(Member.group_id == group.id, Member.status == "Active").count()
        
        result.append({
            "id": group.id,
            "group_id": group.group_id,
            "name": group.name,
            "leader_id": group.leader_id,
            "leader_name": leader.name if leader else "Unassigned",
            "leader_code": leader.leader_id if leader else "N/A",
            "member_count": member_count,
            "max_members": 12,
            "slots_left": 12 - member_count,
            "meeting_day": group.meeting_day,
            "location": group.location,
            "opening_date": str(group.opening_date) if group.opening_date else None,
            "status": group.status,
        })
    
    return result
