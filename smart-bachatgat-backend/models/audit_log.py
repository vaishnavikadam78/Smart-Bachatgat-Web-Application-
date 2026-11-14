from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    action     = Column(String(100), nullable=False)
    table_name = Column(String(50),  nullable=True)
    record_id  = Column(Integer,     nullable=True)
    details    = Column(Text,        nullable=True)
    ip_address = Column(String(50),  nullable=True)
    created_at = Column(TIMESTAMP,   server_default=func.now())