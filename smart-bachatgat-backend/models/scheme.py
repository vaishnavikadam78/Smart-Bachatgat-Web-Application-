from sqlalchemy import Column, Integer, String, Text, Boolean, Date, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from database import Base

class Scheme(Base):
    __tablename__ = "schemes"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(200), nullable=False)
    category    = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    benefits    = Column(Text, nullable=True)
    eligibility = Column(Text, nullable=True)
    documents   = Column(Text, nullable=True)
    last_date   = Column(Date, nullable=True)
    process     = Column(Text, nullable=True)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(TIMESTAMP, server_default=func.now())

class SchemeApplication(Base):
    __tablename__ = "scheme_applications"
    id        = Column(Integer, primary_key=True, index=True)
    scheme_id = Column(Integer, ForeignKey("schemes.id"), nullable=False)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=False)
    user_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    status    = Column(String(20), default="Pending")  # Pending/Approved/Rejected
    notes     = Column(Text, nullable=True)
    applied_at= Column(TIMESTAMP, server_default=func.now())
    updated_at= Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())