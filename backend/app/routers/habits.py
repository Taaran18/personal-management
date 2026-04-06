from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import date, datetime, timedelta
from collections import defaultdict
import calendar as _cal

from app.database import supabase
from app.models.habits import HabitCreate, HabitUpdate, HabitLogToggle

router = APIRouter(prefix="/habits", tags=["habits"])


# ─── Habits CRUD ─────────────────────────────────────────────────────────────

@router.get("")
async def get_habits(include_archived: bool = Query(False)):
    if include_archived:
        result = supabase.table("habits").select("*").order("sort_order").execute()
    else:
        result = supabase.table("habits").select("*").eq("is_active", True).order("sort_order").execute()
    return {"data": result.data}


@router.post("")
async def create_habit(body: HabitCreate):
    result = supabase.table("habits").insert(body.model_dump(exclude_none=True)).execute()
    if not result.data:
        raise HTTPException(500, "Failed to create habit")
    return result.data[0]


@router.patch("/{habit_id}")
async def update_habit(habit_id: str, body: HabitUpdate):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No fields to update")
    result = supabase.table("habits").update(updates).eq("id", habit_id).execute()
    if not result.data:
        raise HTTPException(404, "Habit not found")
    return result.data[0]


@router.delete("/{habit_id}")
async def delete_habit(habit_id: str):
    supabase.table("habits").update({"is_active": False}).eq("id", habit_id).execute()
    return {"ok": True}


# ─── Logs ────────────────────────────────────────────────────────────────────

@router.get("/logs")
async def get_logs(start_date: date = Query(...), end_date: date = Query(...)):
    result = (
        supabase.table("habit_logs")
        .select("*")
        .gte("log_date", str(start_date))
        .lte("log_date", str(end_date))
        .execute()
    )
    lookup: dict = defaultdict(dict)
    for row in result.data:
        lookup[row["habit_id"]][row["log_date"]] = {
            "completed": row["completed"],
            "notes": row.get("notes"),
            "is_freeze": row.get("is_freeze", False),
        }

    # Also fetch freezes for the range
    freezes_result = (
        supabase.table("habit_freezes")
        .select("habit_id,freeze_date,reason")
        .gte("freeze_date", str(start_date))
        .lte("freeze_date", str(end_date))
        .execute()
    )
    freeze_lookup: dict = defaultdict(dict)
    for f in freezes_result.data:
        freeze_lookup[f["habit_id"]][f["freeze_date"]] = {"frozen": True, "reason": f.get("reason")}

    return {"data": result.data, "lookup": lookup, "freezes": freeze_lookup}


@router.post("/logs/toggle")
async def toggle_log(body: HabitLogToggle):
    date_str = str(body.log_date)
    existing = (
        supabase.table("habit_logs")
        .select("id")
        .eq("habit_id", body.habit_id)
        .eq("log_date", date_str)
        .execute()
    )
    payload = {"completed": body.completed}
    if hasattr(body, "notes") and body.notes is not None:
        payload["notes"] = body.notes
    if existing.data:
        result = (
            supabase.table("habit_logs")
            .update(payload)
            .eq("habit_id", body.habit_id)
            .eq("log_date", date_str)
            .execute()
        )
    else:
        result = (
            supabase.table("habit_logs")
            .insert({"habit_id": body.habit_id, "log_date": date_str, **payload})
            .execute()
        )
    return result.data[0] if result.data else {"ok": True}


@router.post("/logs/note")
async def add_log_note(habit_id: str, log_date: date, notes: str):
    date_str = str(log_date)
    existing = (
        supabase.table("habit_logs")
        .select("id")
        .eq("habit_id", habit_id)
        .eq("log_date", date_str)
        .execute()
    )
    if existing.data:
        result = supabase.table("habit_logs").update({"notes": notes}).eq("habit_id", habit_id).eq("log_date", date_str).execute()
    else:
        result = supabase.table("habit_logs").insert({"habit_id": habit_id, "log_date": date_str, "completed": False, "notes": notes}).execute()
    return result.data[0] if result.data else {"ok": True}


# ─── Streak Freeze ────────────────────────────────────────────────────────────

@router.post("/freezes")
async def add_freeze(habit_id: str, freeze_date: date, reason: Optional[str] = None):
    existing = (
        supabase.table("habit_freezes")
        .select("id")
        .eq("habit_id", habit_id)
        .eq("freeze_date", str(freeze_date))
        .execute()
    )
    if existing.data:
        # Remove freeze (toggle off)
        supabase.table("habit_freezes").delete().eq("habit_id", habit_id).eq("freeze_date", str(freeze_date)).execute()
        return {"frozen": False}
    else:
        result = supabase.table("habit_freezes").insert({
            "habit_id": habit_id,
            "freeze_date": str(freeze_date),
            "reason": reason,
        }).execute()
        return {"frozen": True, "data": result.data[0] if result.data else {}}


# ─── Calendar ─────────────────────────────────────────────────────────────────

@router.get("/calendar")
async def get_calendar(year: int = Query(...)):
    """Returns daily completion % for the entire year — used for heatmap."""
    start = date(year, 1, 1)
    end = min(date(year, 12, 31), date.today())

    habits_result = supabase.table("habits").select("id").eq("is_active", True).execute()
    total_habits = len(habits_result.data)
    if total_habits == 0:
        return {"year": year, "data": []}

    logs_result = (
        supabase.table("habit_logs")
        .select("log_date,completed")
        .gte("log_date", str(start))
        .lte("log_date", str(end))
        .eq("completed", True)
        .execute()
    )
    freezes_result = (
        supabase.table("habit_freezes")
        .select("freeze_date")
        .gte("freeze_date", str(start))
        .lte("freeze_date", str(end))
        .execute()
    )

    date_counts: dict = defaultdict(int)
    for l in logs_result.data:
        date_counts[l["log_date"]] += 1

    freeze_dates = set(f["freeze_date"] for f in freezes_result.data)

    data = []
    cur = start
    while cur <= end:
        ds = str(cur)
        done = date_counts.get(ds, 0)
        pct = round(done / total_habits * 100) if total_habits else 0
        data.append({
            "date": ds,
            "completed": done,
            "total": total_habits,
            "pct": pct,
            "frozen": ds in freeze_dates,
        })
        cur += timedelta(days=1)

    return {"year": year, "total_habits": total_habits, "data": data}


# ─── Milestones ───────────────────────────────────────────────────────────────

@router.get("/milestones")
async def get_milestones():
    """Compute milestones dynamically from logs — no separate table needed."""
    habits_result = supabase.table("habits").select("id,name,color").eq("is_active", True).order("sort_order").execute()
    habits = habits_result.data

    logs_result = supabase.table("habit_logs").select("habit_id,log_date,completed").eq("completed", True).execute()
    logs = logs_result.data

    today = date.today()

    # Per-habit logs grouped by habit
    habit_dates: dict = defaultdict(set)
    for l in logs:
        habit_dates[l["habit_id"]].add(l["log_date"])

    milestones = []

    # Global milestones: best week ever
    all_dates: dict = defaultdict(int)
    for l in logs:
        all_dates[l["log_date"]] += 1

    # Compute weekly totals
    if all_dates and habits:
        best_week_pct = 0
        best_week_label = ""
        # Group by Monday
        week_totals: dict = defaultdict(int)
        week_possible: dict = defaultdict(int)
        for ds, cnt in all_dates.items():
            d = date.fromisoformat(ds)
            monday = d - timedelta(days=d.weekday())
            wk = str(monday)
            week_totals[wk] += cnt
            week_possible[wk] += len(habits)
        for wk, total in week_totals.items():
            possible = week_possible[wk]
            pct = round(total / possible * 100) if possible else 0
            if pct > best_week_pct:
                best_week_pct = pct
                d = date.fromisoformat(wk)
                best_week_label = d.strftime("%b %d")

        if best_week_pct >= 70:
            milestones.append({
                "type": "best_week",
                "title": "Best Week Ever",
                "description": f"Week of {best_week_label} — {best_week_pct}% completion",
                "icon": "trophy",
                "color": "#f59e0b",
                "pct": best_week_pct,
            })

    # Per-habit milestones
    for h in habits:
        dates_sorted = sorted(habit_dates[h["id"]])
        if not dates_sorted:
            continue

        # First ever completion
        milestones.append({
            "type": "first_completion",
            "title": f"Started: {h['name']}",
            "description": f"First completed on {dates_sorted[0]}",
            "icon": "star",
            "color": h["color"],
            "habit_name": h["name"],
        })

        # Streak milestones
        # Compute max streak
        max_streak = 0
        cur_streak = 0
        prev = None
        for ds in dates_sorted:
            d = date.fromisoformat(ds)
            if prev and (d - prev).days == 1:
                cur_streak += 1
            else:
                cur_streak = 1
            max_streak = max(max_streak, cur_streak)
            prev = d

        for streak_target, label, icon, color in [
            (7, "7-Day Streak", "flame", "#f97316"),
            (14, "14-Day Streak", "flame", "#ef4444"),
            (21, "21-Day Habit", "award", "#8b5cf6"),
            (30, "30-Day Warrior", "trophy", "#f59e0b"),
        ]:
            if max_streak >= streak_target:
                milestones.append({
                    "type": f"streak_{streak_target}",
                    "title": label,
                    "description": f"{h['name']} — {max_streak} day best streak",
                    "icon": icon,
                    "color": color,
                    "habit_name": h["name"],
                })

        # Perfect week (100% in a week)
        week_map: dict = defaultdict(list)
        for ds in dates_sorted:
            d = date.fromisoformat(ds)
            monday = d - timedelta(days=d.weekday())
            week_map[str(monday)].append(ds)
        for wk, days in week_map.items():
            if len(days) >= 7:
                d = date.fromisoformat(wk)
                milestones.append({
                    "type": "perfect_week",
                    "title": "Perfect Week",
                    "description": f"{h['name']} — week of {d.strftime('%b %d')}",
                    "icon": "award",
                    "color": "#10b981",
                    "habit_name": h["name"],
                })
                break  # only show first perfect week per habit

    # Deduplicate (keep highest tier streak per habit)
    seen = set()
    deduped = []
    for m in milestones:
        key = (m.get("habit_name", ""), m["type"])
        if key not in seen:
            seen.add(key)
            deduped.append(m)

    return {"milestones": deduped, "total": len(deduped)}


# ─── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats/summary")
async def get_stats_summary(reference_date: Optional[date] = Query(None)):
    actual_today = date.today()
    if reference_date:
        last_day = _cal.monthrange(reference_date.year, reference_date.month)[1]
        today = reference_date.replace(day=last_day)
        if today > actual_today:
            today = actual_today
    else:
        today = actual_today

    habits_result = supabase.table("habits").select("id,name,color").eq("is_active", True).order("sort_order").execute()
    habits = habits_result.data
    total_habits = len(habits)

    if total_habits == 0:
        return {
            "today": {"completed": 0, "total": 0, "pct": 0},
            "current_week": {"completed": 0, "total": 0, "pct": 0},
            "current_month": {"completed": 0, "total": 0, "pct": 0},
            "current_quarter": {"completed": 0, "total": 0, "pct": 0},
            "best_week_pct": 0,
            "best_week_label": "",
            "habit_consistency": [],
        }

    ninety_days_ago = today - timedelta(days=120)
    logs_result = (
        supabase.table("habit_logs")
        .select("habit_id,log_date,completed")
        .gte("log_date", str(ninety_days_ago))
        .lte("log_date", str(today))
        .eq("completed", True)
        .execute()
    )
    logs = logs_result.data
    completed_set = set((l["habit_id"], l["log_date"]) for l in logs)

    # --- Today ---
    today_str = str(today)
    today_done = sum(1 for h in habits if (h["id"], today_str) in completed_set)
    today_pct = round(today_done / total_habits * 100) if total_habits else 0

    # --- Current week ---
    week_start = today - timedelta(days=today.weekday())
    week_days = [(week_start + timedelta(days=i)) for i in range(7) if (week_start + timedelta(days=i)) <= today]
    week_possible = total_habits * len(week_days)
    week_done = sum(1 for h in habits for d in week_days if (h["id"], str(d)) in completed_set)
    week_pct = round(week_done / week_possible * 100) if week_possible else 0

    # --- Current month ---
    month_start = today.replace(day=1)
    month_days = [(month_start + timedelta(days=i)) for i in range((today - month_start).days + 1)]
    month_possible = total_habits * len(month_days)
    month_done = sum(1 for h in habits for d in month_days if (h["id"], str(d)) in completed_set)
    month_pct = round(month_done / month_possible * 100) if month_possible else 0

    # --- Current quarter ---
    quarter_month = ((today.month - 1) // 3) * 3 + 1
    quarter_start = today.replace(month=quarter_month, day=1)
    quarter_days = [(quarter_start + timedelta(days=i)) for i in range((today - quarter_start).days + 1)]
    quarter_possible = total_habits * len(quarter_days)
    quarter_done = sum(1 for h in habits for d in quarter_days if (h["id"], str(d)) in completed_set)
    quarter_pct = round(quarter_done / quarter_possible * 100) if quarter_possible else 0

    # --- Best Week Ever ---
    all_date_counts: dict = defaultdict(int)
    for l in logs:
        all_date_counts[l["log_date"]] += 1
    week_totals: dict = defaultdict(int)
    week_possibles: dict = defaultdict(int)
    for ds, cnt in all_date_counts.items():
        d = date.fromisoformat(ds)
        monday = d - timedelta(days=d.weekday())
        wk = str(monday)
        week_totals[wk] += cnt
        week_possibles[wk] += total_habits
    best_week_pct = 0
    best_week_label = ""
    for wk, total in week_totals.items():
        possible = week_possibles[wk]
        pct = round(total / possible * 100) if possible else 0
        if pct > best_week_pct:
            best_week_pct = pct
            d = date.fromisoformat(wk)
            best_week_label = f"Week of {d.strftime('%b %d')}"

    # --- Per-habit consistency (30 days) ---
    thirty_days_ago = today - timedelta(days=29)
    days_30 = [(thirty_days_ago + timedelta(days=i)) for i in range(30)]
    habit_consistency = []
    for h in habits:
        done_30 = sum(1 for d in days_30 if (h["id"], str(d)) in completed_set)
        pct = round(done_30 / 30 * 100)
        streak = 0
        check = today
        while (h["id"], str(check)) in completed_set:
            streak += 1
            check -= timedelta(days=1)
        habit_consistency.append({
            "habit_id": h["id"],
            "name": h["name"],
            "color": h["color"],
            "pct_30d": pct,
            "done_30d": done_30,
            "streak": streak,
        })

    return {
        "today": {"completed": today_done, "total": total_habits, "pct": today_pct},
        "current_week": {"completed": week_done, "total": week_possible, "pct": week_pct},
        "current_month": {"completed": month_done, "total": month_possible, "pct": month_pct},
        "current_quarter": {"completed": quarter_done, "total": quarter_possible, "pct": quarter_pct},
        "best_week_pct": best_week_pct,
        "best_week_label": best_week_label,
        "habit_consistency": habit_consistency,
    }


@router.get("/stats/trends")
async def get_trends(period: str = Query("weekly")):
    today = date.today()
    habits_result = supabase.table("habits").select("id").eq("is_active", True).execute()
    total_habits = len(habits_result.data)
    if total_habits == 0:
        return {"period": period, "data": []}

    if period == "weekly":
        start = today - timedelta(days=6)
        days = [(start + timedelta(days=i)) for i in range(7)]
    elif period == "monthly":
        start = today - timedelta(days=29)
        days = [(start + timedelta(days=i)) for i in range(30)]
    elif period == "quarterly":
        start = today - timedelta(days=89)
        days = [(start + timedelta(days=i)) for i in range(90)]
    else:
        start = today - timedelta(days=364)
        days = [(start + timedelta(days=i)) for i in range(365)]

    logs_result = (
        supabase.table("habit_logs")
        .select("log_date,completed")
        .gte("log_date", str(start))
        .lte("log_date", str(today))
        .eq("completed", True)
        .execute()
    )
    date_counts: dict = defaultdict(int)
    for l in logs_result.data:
        date_counts[l["log_date"]] += 1

    if period == "weekly":
        labels = [d.strftime("%a %d") for d in days]
        data = []
        for i, d in enumerate(days):
            done = date_counts.get(str(d), 0)
            pct = round(done / total_habits * 100) if total_habits else 0
            data.append({"label": labels[i], "date": str(d), "completed": done, "total": total_habits, "pct": pct})
    elif period in ("monthly", "quarterly"):
        week_map: dict = {}
        for d in days:
            wk = d.isocalendar()
            key = f"W{wk.week} ({d.strftime('%b')})"
            if key not in week_map:
                week_map[key] = {"completed": 0, "days": 0}
            week_map[key]["completed"] += date_counts.get(str(d), 0)
            week_map[key]["days"] += 1
        data = []
        for label, v in week_map.items():
            total = total_habits * v["days"]
            pct = round(v["completed"] / total * 100) if total else 0
            data.append({"label": label, "completed": v["completed"], "total": total, "pct": pct})
    else:
        month_map: dict = {}
        for d in days:
            key = d.strftime("%b %Y")
            if key not in month_map:
                month_map[key] = {"completed": 0, "days": 0}
            month_map[key]["completed"] += date_counts.get(str(d), 0)
            month_map[key]["days"] += 1
        data = []
        for label, v in month_map.items():
            total = total_habits * v["days"]
            pct = round(v["completed"] / total * 100) if total else 0
            data.append({"label": label, "completed": v["completed"], "total": total, "pct": pct})

    return {"period": period, "data": data}
