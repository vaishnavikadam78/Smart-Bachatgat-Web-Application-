from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class LoanCreate(BaseModel):
    loan_id:        str
    member_id:      int
    group_id:       int
    amount:         float
    interest_rate:  float = 2.0
    disbursed_date: date
    due_date:       Optional[date] = None

class LoanOut(BaseModel):
    id:          int
    loan_id:     str
    amount:      float
    amount_paid: float
    balance:     float
    status:      str
    class Config:
        from_attributes = True