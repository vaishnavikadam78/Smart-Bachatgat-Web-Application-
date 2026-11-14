from sqlalchemy import Column, Integer, String, Text, Date, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from database import Base

class Meeting(Base):
    __tablename__ = "meetings"
    id           = Column(Integer, primary_key=True, index=True)
    group_id     = Column(Integer, ForeignKey("groups.id"), nullable=True)
    title        = Column(String(100), nullable=False)
    agenda       = Column(Text,        nullable=True)
    date         = Column(Date,        nullable=False)
    time         = Column(String(20),  nullable=True)
    venue        = Column(String(200), nullable=True)
    attendance   = Column(Integer,     nullable=True)
    notes        = Column(Text,        nullable=True)
    scheduled_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at   = Column(TIMESTAMP, server_default=func.now())