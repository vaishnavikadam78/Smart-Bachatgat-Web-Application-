from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class MemberCreate(BaseModel):
    member_id:  str
    group_id:   int
    name:       str
    phone:      str
    email:      Optional[str] = None
    address:    Optional[str] = None
    aadhar_no:  Optional[str] = None
    occupation: Optional[str] = None
    join_date:  date

class MemberOut(BaseModel):
    id:            int
    member_id:     str
    name:          str
    phone:         str
    total_savings: float
    total_loans:   float
    meetings_att:  int
    status:        str
    class Config:
        from_attributes = True