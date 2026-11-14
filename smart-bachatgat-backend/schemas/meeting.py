from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class MeetingCreate(BaseModel):
    group_id: int
    title:    str
    agenda:   Optional[str] = None
    date:     date
    time:     Optional[str] = None
    venue:    Optional[str] = None

class MeetingOut(BaseModel):
    id:         int
    title:      str
    date:       date
    attendance: Optional[int]
    class Config:
        from_attributes = True