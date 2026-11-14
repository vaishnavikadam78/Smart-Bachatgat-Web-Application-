from sqlalchemy import Column, Integer, String, Float, Date, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from database import Base

class Group(Base):
    __tablename__ = "groups"
    id            = Column(Integer, primary_key=True, index=True)
    group_id      = Column(String(10),  unique=True, nullable=False)
    name          = Column(String(100), nullable=False)
    leader_id     = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by    = Column(Integer, ForeignKey("users.id"), nullable=True)
    opening_date  = Column(Date,        nullable=False)
    meeting_day   = Column(String(20),  nullable=True)
    location      = Column(String(200), nullable=True)
    total_savings = Column(Float,       default=0.0)
    status        = Column(String(20),  default="Active")
    created_at    = Column(TIMESTAMP,   server_default=func.now())