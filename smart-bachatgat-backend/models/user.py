from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, ForeignKey, Enum
from sqlalchemy.sql import func
from database import Base
import enum

class RoleEnum(str, enum.Enum):
    admin  = "admin"
    leader = "leader"
    member = "member"

class User(Base):
    __tablename__ = "users"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(100), nullable=False)
    username   = Column(String(50),  unique=True, nullable=False)
    email      = Column(String(100), unique=True, nullable=True)
    password   = Column(String(255), nullable=False)
    role       = Column(Enum(RoleEnum), nullable=False)
    phone      = Column(String(15),  nullable=True)
    group_id   = Column(Integer, ForeignKey("groups.id"), nullable=True)
    member_id  = Column(String(10),  nullable=True)
    leader_id  = Column(String(10),  nullable=True)
    is_active       = Column(Boolean, default=True)
    email_verified  = Column(Boolean, default=False)
    created_at      = Column(TIMESTAMP, server_default=func.now())
