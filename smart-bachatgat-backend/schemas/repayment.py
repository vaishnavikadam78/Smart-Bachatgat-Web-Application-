from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

class RepaymentCreate(BaseModel):
    loan_id:            int
    member_id:          int
    installment_amount: float
    payment_date:       date

class RepaymentOut(BaseModel):
    id:                int
    installment_amount: float
    payment_date:      date
    remaining_balance: float
    class Config:
        from_attributes = True