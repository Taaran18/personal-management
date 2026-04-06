from pydantic import BaseModel
from typing import Optional, Literal
from datetime import date

BookStatus = Literal["Not Started", "Reading", "Completed", "On Hold"]
BookType = Literal["Physical", "Ebook"]

GENRES = [
    "Self Help", "Psychology", "Coding / Tech", "Business & Economics",
    "Philosophy", "Religious", "Productivity", "Investing & Trading",
    "Novels / Fiction", "Biography / Memoir", "History", "Science", "Other",
]


class BookCreate(BaseModel):
    title: str
    author: str
    genre: str
    type: BookType
    total_pages: int
    published_year: Optional[int] = None
    ebook_link: Optional[str] = None


class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    genre: Optional[str] = None
    type: Optional[BookType] = None
    total_pages: Optional[int] = None
    published_year: Optional[int] = None
    ebook_link: Optional[str] = None
    status: Optional[BookStatus] = None
    rating: Optional[int] = None
    review: Optional[str] = None
    started_at: Optional[date] = None
    completed_at: Optional[date] = None

    model_config = {"extra": "ignore"}


class SessionCreate(BaseModel):
    book_id: str
    session_date: date
    from_page: int
    to_page: int
    reading_minutes: Optional[int] = None
    notes: Optional[str] = None


class SessionUpdate(BaseModel):
    session_date: Optional[date] = None
    from_page: Optional[int] = None
    to_page: Optional[int] = None
    reading_minutes: Optional[int] = None
    notes: Optional[str] = None

    model_config = {"extra": "ignore"}

