from sqlalchemy import Column, Integer, String, Float, Date, TIMESTAMP, Text, ForeignKey
from sqlalchemy.sql import func
from database import Base

class Member(Base):
    __tablename__ = "members"
    id            = Column(Integer, primary_key=True, index=True)
    member_id     = Column(String(10),  unique=True, nullable=False)
    group_id      = Column(Integer, ForeignKey("groups.id"), nullable=False)
    leader_id     = Column(Integer, ForeignKey("users.id"), nullable=True)
    name          = Column(String(100), nullable=False)
    phone         = Column(String(15),  nullable=False)
    email         = Column(String(100), nullable=True)
    address       = Column(Text,        nullable=True)
    aadhar_no     = Column(String(20),  nullable=True)
    occupation    = Column(String(100), nullable=True)
    total_savings = Column(Float,       default=0.0)
    total_loans   = Column(Float,       default=0.0)
    meetings_att  = Column(Integer,     default=0)
    join_date     = Column(Date,        nullable=False)
    status        = Column(String(20),  default="Active")
    created_at    = Column(TIMESTAMP,   server_default=func.now())