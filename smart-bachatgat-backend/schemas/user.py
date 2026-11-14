from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    name:     str
    username: str
    email:    Optional[EmailStr] = None
    password: str
    role:     str
    phone:    Optional[str] = None
    group_id: Optional[int] = None

class UserOut(BaseModel):
    id:         int
    name:       str
    username:   str
    role:       str
    is_active:  bool
    created_at: Optional[datetime]
    class Config:
        from_attributes = True