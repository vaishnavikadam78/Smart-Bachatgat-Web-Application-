from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from database import Base

class Report(Base):
    __tablename__ = "reports"
    id           = Column(Integer, primary_key=True, index=True)
    group_id     = Column(Integer, ForeignKey("groups.id"), nullable=False)
    title        = Column(String(100), nullable=False)
    type         = Column(String(30),  nullable=False)
    file_url     = Column(String(500), nullable=True)
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at   = Column(TIMESTAMP, server_default=func.now())