from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from database import Base

class Gallery(Base):
    __tablename__ = "gallery"
    id          = Column(Integer, primary_key=True, index=True)
    group_id    = Column(Integer, ForeignKey("groups.id"),   nullable=False)
    meeting_id  = Column(Integer, ForeignKey("meetings.id"), nullable=True)
    image_url   = Column(String(500), nullable=False)
    caption     = Column(String(200), nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"),    nullable=False)
    created_at  = Column(TIMESTAMP, server_default=func.now())