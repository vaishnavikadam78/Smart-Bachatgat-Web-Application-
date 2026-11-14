from datetime import date, datetime
from models.loan import Loan
from models.member import Member
from models.group import Group
from models.notification import Notification
from config import LOAN_OVERDUE_PENALTY
from decimal import Decimal

# Fine calculation constants
DAILY_FINE_RATE = 0.5  # ₹ per day
MAX_FINE_CAP = 20.0    # Max fine per month (20% of original loan)
OVERDUE_THRESHOLD_DAYS = 1  # Days past due to mark as overdue

def calculate_fine_amount(loan):
    """
    Calculate fine amount for a loan based on days overdue
    Returns: (days_overdue, fine_amount, status)
    """
    if not loan.due_date or loan.status == "Closed":
        return 0, 0.0, "No Fine"
    
    today = date.today()
    days_overdue = max(0, (today - loan.due_date).days)
    
    if days_overdue == 0:
        return 0, 0.0, "On Time"
    elif days_overdue < OVERDUE_THRESHOLD_DAYS:
        return days_overdue, 0.0, "Grace Period"
    
    # Calculate fine
    base_fine = days_overdue * DAILY_FINE_RATE
    
    # Apply cap
    max_allowed_fine = (loan.amount * MAX_FINE_CAP) / 100.0
    fine_amount = min(base_fine, max_allowed_fine)
    
    # Determine status
    if days_overdue <= 15:
        status = "Overdue"
    elif days_overdue <= 30:
        status = "Default"
    else:
        status = "Severely Overdue"
    
    return days_overdue, fine_amount, status


def mark_overdue_loans(db):
    """
    Enhanced overdue marking with fine calculation
    Updates loan status and calculates fines automatically
    """
    today = date.today()
    
    # Find all active loans that are overdue
    overdue_loans = db.query(Loan).filter(
        Loan.status.in_(["Active", "Overdue"]),
        Loan.due_date != None,
        Loan.due_date < today,
        Loan.balance > 0
    ).all()
    
    if not overdue_loans:
        return

    notifications = []
    
    for loan in overdue_loans:
        # Calculate fine
        days_overdue, fine_amount, status = calculate_fine_amount(loan)
        
        # Update loan record
        old_status = loan.status
        old_fine = loan.fine_amount or 0.0
        
        loan.is_overdue = True
        loan.status = status if status in ["Overdue", "Default", "Severely Overdue"] else old_status
        loan.fine_amount = fine_amount
        loan.overdue_date = loan.overdue_date or today
        
        # Update notes with fine information
        notes = (loan.notes or "").strip()
        if notes:
            notes += "\n"
        notes += f"[{today.isoformat()}] Fine: ₹{fine_amount:.2f} (Days overdue: {days_overdue})"
        loan.notes = notes
        
        # Notify member if fine increased significantly
        if fine_amount > old_fine + 5.0:  # Notify if fine increased by ₹5+
            member = db.query(Member).filter(Member.id == loan.member_id).first()
            if member:
                from models.user import User as UserModel
                user = db.query(UserModel).filter(UserModel.member_id == member.member_id).first()
                if user:
                    notification = Notification(
                        user_id=user.id,
                        group_id=loan.group_id,
                        title=f"⚠️ Loan Overdue - Fine: ₹{fine_amount:.2f}",
                        message=f"Loan {loan.loan_id} is {days_overdue} days overdue. Fine accumulated: ₹{fine_amount:.2f}. Please make repayment soon.",
                        type="warning"
                    )
                    db.add(notification)
                    notifications.append(notification)
        
        # Notify leader
        group = db.query(Group).filter(Group.id == loan.group_id).first()
        if group and group.leader_id:
            member = db.query(Member).filter(Member.id == loan.member_id).first()
            leader_notification = Notification(
                user_id=group.leader_id,
                group_id=loan.group_id,
                title=f"⚠️ Member Loan Overdue: {member.name if member else 'N/A'}",
                message=f"Loan {loan.loan_id} ({loan.amount:,.0f}) is {days_overdue} days overdue with fine: ₹{fine_amount:.2f}.",
                type="warning"
            )
            db.add(leader_notification)
            notifications.append(leader_notification)
    
    db.commit()
    return len(overdue_loans)


def get_overdue_summary(db, group_id=None):
    """
    Get summary of all overdue loans in system or specific group
    Returns: dict with overdue stats
    """
    today = date.today()
    
    query = db.query(Loan).filter(
        Loan.status.in_(["Active", "Overdue", "Default"]),
        Loan.due_date != None,
        Loan.due_date < today,
        Loan.balance > 0
    )
    
    if group_id:
        query = query.filter(Loan.group_id == group_id)
    
    overdue_loans = query.all()
    
    total_overdue_amount = 0.0
    total_fine_amount = 0.0
    overdue_count = 0
    default_count = 0
    
    for loan in overdue_loans:
        days_overdue, fine_amount, status = calculate_fine_amount(loan)
        total_overdue_amount += loan.balance
        total_fine_amount += fine_amount
        
        if status == "Overdue":
            overdue_count += 1
        elif status in ["Default", "Severely Overdue"]:
            default_count += 1
    
    return {
        "total_overdue_loans": len(overdue_loans),
        "overdue_count": overdue_count,
        "default_count": default_count,
        "total_overdue_amount": round(total_overdue_amount, 2),
        "total_fine_amount": round(total_fine_amount, 2),
        "avg_days_overdue": sum((date.today() - loan.due_date).days for loan in overdue_loans) / len(overdue_loans) if overdue_loans else 0
    }


def get_loan_details(loan):
    """
    Get detailed information for a single loan including overdue/fine details
    """
    days_overdue, fine_amount, status = calculate_fine_amount(loan)
    
    return {
        "id": loan.id,
        "loan_id": loan.loan_id,
        "member_id": loan.member_id,
        "amount": loan.amount,
        "balance": loan.balance,
        "disbursed_date": loan.disbursed_date.isoformat() if loan.disbursed_date else None,
        "due_date": loan.due_date.isoformat() if loan.due_date else None,
        "status": loan.status,
        "is_overdue": loan.is_overdue,
        "days_overdue": days_overdue,
        "fine_amount": round(fine_amount, 2),
        "overdue_status": status,
        "total_due": round((loan.balance + fine_amount), 2),
        "created_at": loan.created_at.isoformat() if loan.created_at else None
    }
