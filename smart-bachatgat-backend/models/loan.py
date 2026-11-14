from sqlalchemy import Column, Integer, String, Float, Date, TIMESTAMP, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from database import Base
from enum import Enum

class LoanStatus(str, Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    ACTIVE = "Active"
    OVERDUE = "Overdue"
    DEFAULT = "Default"
    CLOSED = "Closed"

class Loan(Base):
    __tablename__ = "loans"
    id             = Column(Integer, primary_key=True, index=True)
    loan_id        = Column(String(10),  unique=True, nullable=False)
    member_id      = Column(Integer, ForeignKey("members.id"), nullable=False)
    group_id       = Column(Integer, ForeignKey("groups.id"),  nullable=False)
    amount         = Column(Float,   nullable=False)
    interest_rate  = Column(Float,   default=2.0)
    disbursed_date = Column(Date,    nullable=False)
    due_date       = Column(Date,    nullable=True)
    amount_paid    = Column(Float,   default=0.0)
    balance        = Column(Float,   nullable=False)
    status         = Column(String(20), default="Active")
    loan_state     = Column(String(20), default="Pending")  # Pending, Approved, Active, Overdue, Default, Closed
    approved_by    = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes          = Column(Text, nullable=True)
    overdue_date   = Column(Date, nullable=True)  # Date loan became overdue
    fine_amount    = Column(Float, default=0.0)   # Accumulated fine
    penalty_pct    = Column(Float, default=5.0)   # Penalty % per month
    is_overdue     = Column(Boolean, default=False)  # Flag for overdue status
    created_at     = Column(TIMESTAMP, server_default=func.now())