from pydantic import BaseModel
from typing import Optional
from datetime import date


class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#10b981"
    sort_order: Optional[int] = 0


class HabitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class HabitLogToggle(BaseModel):
    habit_id: str
    log_date: date
    completed: bool
