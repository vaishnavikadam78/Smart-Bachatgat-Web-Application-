from sqlalchemy import Column, Integer, Float, Date, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from database import Base

class Repayment(Base):
    __tablename__ = "repayments"
    id                 = Column(Integer, primary_key=True, index=True)
    loan_id            = Column(Integer, ForeignKey("loans.id"),   nullable=False)
    member_id          = Column(Integer, ForeignKey("members.id"), nullable=False)
    installment_amount = Column(Float,   nullable=False)
    payment_date       = Column(Date,    nullable=False)
    remaining_balance  = Column(Float,   nullable=False)
    recorded_by        = Column(Integer, ForeignKey("users.id"),   nullable=False)
    created_at         = Column(TIMESTAMP, server_default=func.now())