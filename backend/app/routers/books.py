from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import date, datetime, timedelta
from collections import defaultdict
import uuid

from app.database import supabase
from app.models.books import BookCreate, BookUpdate, SessionCreate, SessionUpdate

router = APIRouter(prefix="/books", tags=["books"])


# ─── Stats ───────────────────────────────────────────────────────────────────

@router.get("/stats/summary")
async def get_stats_summary(month: Optional[str] = Query(None)):
    """
    month: optional YYYY-MM string. When provided, session stats are scoped to that month.
    Book counts (total, completed, reading etc.) are always cumulative.
    """
    import calendar as _cal

    books_result = supabase.table("books").select("id,status,total_pages,genre,rating,started_at,completed_at").execute()
    books = books_result.data

    # Determine date range for sessions
    actual_today = date.today()
    if month:
        try:
            y, m = int(month.split("-")[0]), int(month.split("-")[1])
            month_start = date(y, m, 1)
            last_day = _cal.monthrange(y, m)[1]
            month_end = min(date(y, m, last_day), actual_today)
            sessions_result = (
                supabase.table("reading_sessions")
                .select("session_date,pages_read,reading_minutes")
                .gte("session_date", str(month_start))
                .lte("session_date", str(month_end))
                .execute()
            )
            reference_end = month_end
        except Exception:
            month = None

    if not month:
        sessions_result = supabase.table("reading_sessions").select("session_date,pages_read,reading_minutes").execute()
        reference_end = actual_today

    sessions = sessions_result.data

    total_books = len(books)
    completed = sum(1 for b in books if b["status"] == "Completed")
    reading = sum(1 for b in books if b["status"] == "Reading")
    not_started = sum(1 for b in books if b["status"] == "Not Started")
    on_hold = sum(1 for b in books if b["status"] == "On Hold")
    total_pages_read = sum(s["pages_read"] or 0 for s in sessions)
    total_minutes = sum(s["reading_minutes"] or 0 for s in sessions)

    # Genre breakdown
    genre_counts: dict = defaultdict(int)
    for b in books:
        genre_counts[b["genre"]] += 1

    # Avg pages/day
    session_dates = set(s["session_date"] for s in sessions)
    avg_pages_per_day = round(total_pages_read / len(session_dates), 1) if session_dates else 0

    # Streak: consecutive days ending at reference_end
    streak = 0
    check_date = reference_end
    while str(check_date) in session_dates:
        streak += 1
        check_date -= timedelta(days=1)
    if streak == 0:
        check_date = reference_end - timedelta(days=1)
        while str(check_date) in session_dates:
            streak += 1
            check_date -= timedelta(days=1)

    return {
        "total_books": total_books,
        "completed": completed,
        "reading": reading,
        "not_started": not_started,
        "on_hold": on_hold,
        "total_pages_read": total_pages_read,
        "total_minutes": total_minutes,
        "avg_pages_per_day": avg_pages_per_day,
        "streak_days": streak,
        "genre_counts": dict(genre_counts),
    }


@router.get("/stats/trends")
async def get_stats_trends(
    period: str = Query("daily", description="daily | weekly | monthly"),
    month: Optional[str] = Query(None, description="YYYY-MM — when set, daily period shows that month's days"),
):
    import calendar as _cal

    actual_today = date.today()

    # When a specific month is requested with daily period, show just that month's days
    if month and period == "daily":
        try:
            y, m_int = int(month.split("-")[0]), int(month.split("-")[1])
            month_start = date(y, m_int, 1)
            last_day = _cal.monthrange(y, m_int)[1]
            month_end = min(date(y, m_int, last_day), actual_today)
            sessions_result = (
                supabase.table("reading_sessions")
                .select("session_date,pages_read,reading_minutes")
                .gte("session_date", str(month_start))
                .lte("session_date", str(month_end))
                .execute()
            )
            sessions = sessions_result.data
            buckets: dict = {}
            cur = month_start
            while cur <= month_end:
                buckets[str(cur)] = {"label": cur.strftime("%d %b"), "pages": 0, "minutes": 0}
                cur += timedelta(days=1)
            for s in sessions:
                if s["session_date"] in buckets:
                    buckets[s["session_date"]]["pages"] += s["pages_read"] or 0
                    buckets[s["session_date"]]["minutes"] += s["reading_minutes"] or 0
            return {"period": "daily", "data": list(buckets.values())}
        except Exception:
            pass

    sessions_result = supabase.table("reading_sessions").select("session_date,pages_read,reading_minutes").execute()
    sessions = sessions_result.data

    today = actual_today

    if period == "daily":
        # Last 30 days
        buckets: dict = {}
        for i in range(29, -1, -1):
            d = today - timedelta(days=i)
            buckets[str(d)] = {"label": d.strftime("%d %b"), "pages": 0, "minutes": 0}
        for s in sessions:
            if s["session_date"] in buckets:
                buckets[s["session_date"]]["pages"] += s["pages_read"] or 0
                buckets[s["session_date"]]["minutes"] += s["reading_minutes"] or 0
        return {"period": "daily", "data": list(buckets.values())}

    elif period == "weekly":
        # Last 12 weeks
        buckets = {}
        current_monday = today - timedelta(days=today.weekday())
        for i in range(11, -1, -1):
            monday = current_monday - timedelta(weeks=i)
            key = str(monday)
            buckets[key] = {
                "label": monday.strftime("%d %b"),
                "week_start": key,
                "pages": 0,
                "minutes": 0,
            }
        for s in sessions:
            session_d = date.fromisoformat(s["session_date"])
            monday = session_d - timedelta(days=session_d.weekday())
            key = str(monday)
            if key in buckets:
                buckets[key]["pages"] += s["pages_read"] or 0
                buckets[key]["minutes"] += s["reading_minutes"] or 0
        return {"period": "weekly", "data": list(buckets.values())}

    elif period == "monthly":
        # Last 12 months
        buckets = {}
        for i in range(11, -1, -1):
            # Go back i months from current
            year = today.year
            month = today.month - i
            while month <= 0:
                month += 12
                year -= 1
            key = f"{year}-{month:02d}"
            buckets[key] = {
                "label": datetime(year, month, 1).strftime("%b %Y"),
                "pages": 0,
                "minutes": 0,
            }
        for s in sessions:
            key = s["session_date"][:7]
            if key in buckets:
                buckets[key]["pages"] += s["pages_read"] or 0
                buckets[key]["minutes"] += s["reading_minutes"] or 0
        return {"period": "monthly", "data": list(buckets.values())}

    raise HTTPException(status_code=400, detail="period must be daily, weekly, or monthly")


# ─── Sessions ────────────────────────────────────────────────────────────────

@router.get("/sessions")
async def get_sessions(
    book_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
):
    query = supabase.table("reading_sessions").select("*").order("session_date", desc=True).limit(limit)
    if book_id:
        query = query.eq("book_id", book_id)
    result = query.execute()
    return {"data": result.data, "count": len(result.data)}


@router.post("/sessions")
async def create_session(session: SessionCreate):
    # Fetch book to validate and check pages
    book_result = supabase.table("books").select("*").eq("id", session.book_id).execute()
    if not book_result.data:
        raise HTTPException(status_code=404, detail="Book not found")
    book = book_result.data[0]

    if session.to_page < session.from_page:
        raise HTTPException(status_code=400, detail="to_page must be >= from_page")
    if session.to_page > book["total_pages"]:
        raise HTTPException(status_code=400, detail=f"to_page exceeds total pages ({book['total_pages']})")

    data = {
        "id": str(uuid.uuid4()),
        "book_id": session.book_id,
        "session_date": str(session.session_date),
        "from_page": session.from_page,
        "to_page": session.to_page,
        "reading_minutes": session.reading_minutes,
        "notes": session.notes,
    }
    result = supabase.table("reading_sessions").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create session")

    # Auto-update book status
    book_update: dict = {}
    if book["status"] == "Not Started":
        book_update["status"] = "Reading"
        book_update["started_at"] = str(session.session_date)
    if session.to_page >= book["total_pages"]:
        book_update["status"] = "Completed"
        book_update["completed_at"] = str(session.session_date)
        if not book.get("started_at"):
            book_update["started_at"] = str(session.session_date)

    if book_update:
        supabase.table("books").update(book_update).eq("id", session.book_id).execute()

    return result.data[0]


@router.patch("/sessions/{session_id}")
async def update_session(session_id: str, session: SessionUpdate):
    data = {k: str(v) if isinstance(v, date) else v
            for k, v in session.model_dump().items() if v is not None}
    supabase.table("reading_sessions").update(data).eq("id", session_id).execute()
    result = supabase.table("reading_sessions").select("*").eq("id", session_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")
    return result.data[0]


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    supabase.table("reading_sessions").delete().eq("id", session_id).execute()
    return {"message": "Deleted successfully"}


# ─── Reviews ─────────────────────────────────────────────────────────────────

@router.get("/reviews")
async def get_reviews(status: Optional[str] = None):
    # Fetch books
    query = supabase.table("books").select("*").order("created_at", desc=True)
    if status:
        query = query.eq("status", status)
    books_result = query.execute()
    books = books_result.data

    if not books:
        return {"data": []}

    # Fetch all sessions that have notes, for these books
    book_ids = [b["id"] for b in books]
    sessions_result = (
        supabase.table("reading_sessions")
        .select("*")
        .order("session_date", desc=False)
        .execute()
    )
    # Group sessions by book_id
    sessions_by_book: dict = {}
    for s in sessions_result.data:
        sessions_by_book.setdefault(s["book_id"], []).append(s)

    result = []
    for book in books:
        sessions = sessions_by_book.get(book["id"], [])
        notes = [s for s in sessions if s.get("notes")]
        total_pages_read = sum(s.get("pages_read") or 0 for s in sessions)
        progress_pct = round((total_pages_read / book["total_pages"]) * 100, 1) if book["total_pages"] else 0
        result.append({
            **book,
            "session_notes": notes,
            "total_pages_read": total_pages_read,
            "progress_pct": min(progress_pct, 100.0),
        })

    return {"data": result}


# ─── Books CRUD ──────────────────────────────────────────────────────────────

@router.get("")
async def get_books(
    status: Optional[str] = None,
    genre: Optional[str] = None,
):
    query = supabase.table("books").select("*").order("created_at", desc=True)
    if status:
        query = query.eq("status", status)
    if genre:
        query = query.eq("genre", genre)
    result = query.execute()
    return {"data": result.data, "count": len(result.data)}


@router.post("")
async def create_book(book: BookCreate):
    data = book.model_dump()
    data["id"] = str(uuid.uuid4())
    data["status"] = "Not Started"
    result = supabase.table("books").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create book")
    return result.data[0]


@router.get("/{book_id}")
async def get_book(book_id: str):
    book_result = supabase.table("books").select("*").eq("id", book_id).execute()
    if not book_result.data:
        raise HTTPException(status_code=404, detail="Book not found")

    sessions_result = (
        supabase.table("reading_sessions")
        .select("*")
        .eq("book_id", book_id)
        .order("session_date", desc=True)
        .execute()
    )

    book = book_result.data[0]
    sessions = sessions_result.data
    total_pages_read = sum(s["pages_read"] or 0 for s in sessions)
    progress_pct = round((total_pages_read / book["total_pages"]) * 100, 1) if book["total_pages"] else 0

    return {
        **book,
        "sessions": sessions,
        "total_pages_read": total_pages_read,
        "progress_pct": min(progress_pct, 100.0),
    }


@router.patch("/{book_id}")
async def update_book(book_id: str, book: BookUpdate):
    data = {}
    for k, v in book.model_dump().items():
        if v is not None:
            data[k] = str(v) if isinstance(v, date) else v

    supabase.table("books").update(data).eq("id", book_id).execute()
    result = supabase.table("books").select("*").eq("id", book_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Book not found")
    return result.data[0]


@router.delete("/{book_id}")
async def delete_book(book_id: str):
    supabase.table("books").delete().eq("id", book_id).execute()
    return {"message": "Deleted successfully"}
