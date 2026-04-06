from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import date


class TransactionCreate(BaseModel):
    date: date
    description: str
    category: str
    amount: float
    type: Literal["IN", "OUT"]


class TransactionUpdate(BaseModel):
    date: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    type: Optional[str] = None

    model_config = {"extra": "ignore"}


class Transaction(TransactionCreate):
    id: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class ConfigUpdate(BaseModel):
    opening_balance: Optional[float] = None
    saving_goal: Optional[float] = None
    categories: Optional[list[str]] = None
    income_categories: Optional[list[str]] = None
