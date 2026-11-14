from sqlalchemy import Column, Integer, String, Float, Date, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from database import Base

class Deposit(Base):
    __tablename__ = "deposits"
    id          = Column(Integer, primary_key=True, index=True)
    member_id   = Column(Integer, ForeignKey("members.id"), nullable=False)
    group_id    = Column(Integer, ForeignKey("groups.id"),  nullable=False)
    amount      = Column(Float,   nullable=False)
    date        = Column(Date,    nullable=False)
    description = Column(String(200), nullable=True)
    recorded_by = Column(Integer, ForeignKey("users.id"),   nullable=False)
    created_at  = Column(TIMESTAMP, server_default=func.now())