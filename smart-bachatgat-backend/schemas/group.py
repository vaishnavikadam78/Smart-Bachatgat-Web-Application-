from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class GroupCreate(BaseModel):
    name:         str
    group_id:     str
    leader_id:    int
    opening_date: date
    meeting_day:  Optional[str] = None
    location:     Optional[str] = None

class GroupOut(BaseModel):
    id:            int
    group_id:      str
    name:          str
    total_savings: float
    status:        str
    created_at:    Optional[datetime]
    class Config:
        from_attributes = True