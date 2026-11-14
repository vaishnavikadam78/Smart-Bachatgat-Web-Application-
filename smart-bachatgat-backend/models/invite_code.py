from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class InviteCode(Base):
    __tablename__ = "invite_codes"

    id         = Column(Integer, primary_key=True, index=True)
    code       = Column(String(20), unique=True, nullable=False)
    group_id   = Column(Integer, ForeignKey("groups.id"), nullable=False)
    leader_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    max_uses   = Column(Integer, default=10)
    used_count = Column(Integer, default=0)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)