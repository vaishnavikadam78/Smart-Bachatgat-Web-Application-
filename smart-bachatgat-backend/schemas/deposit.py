from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class DepositCreate(BaseModel):
    member_id:   int
    group_id:    int
    amount:      float
    date:        date
    description: Optional[str] = "Monthly Savings"

class DepositOut(BaseModel):
    id:         int
    member_id:  int
    amount:     float
    date:       date
    created_at: Optional[datetime]
    class Config:
        from_attributes = True
