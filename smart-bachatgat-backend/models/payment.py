from sqlalchemy import Column, Integer, String, Float, Text, TIMESTAMP, ForeignKey, Boolean
from sqlalchemy.sql import func
from database import Base

class Payment(Base):
    __tablename__ = "payments"
    id             = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(30), unique=True, nullable=False)
    member_id      = Column(Integer, ForeignKey("members.id"), nullable=False)
    group_id       = Column(Integer, ForeignKey("groups.id"), nullable=False)
    amount         = Column(Float, nullable=False)
    payment_type   = Column(String(20), nullable=False)  # Online/Offline
    payment_mode   = Column(String(30), nullable=True)   # UPI/Bank/Cash etc
    status         = Column(String(20), default="Pending")  # Pending/Success/Failed
    purpose        = Column(String(100), nullable=True)
    notes          = Column(Text, nullable=True)
    created_at     = Column(TIMESTAMP, server_default=func.now())