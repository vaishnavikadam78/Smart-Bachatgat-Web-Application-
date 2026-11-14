from sqlalchemy import Column, Integer, String, Text, Boolean, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from database import Base

class Notification(Base):
    __tablename__ = "notifications"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"),  nullable=False)
    group_id   = Column(Integer, ForeignKey("groups.id"), nullable=True)
    title      = Column(String(100), nullable=False)
    message    = Column(Text,        nullable=False)
    type       = Column(String(30),  default="info")
    is_read    = Column(Boolean,     default=False)
    created_at = Column(TIMESTAMP,   server_default=func.now())