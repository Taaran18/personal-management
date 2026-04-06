from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import date, timedelta
from collections import defaultdict
import uuid

from app.database import supabase
from app.models.jobs import (
    ApplicationCreate, ApplicationUpdate, StageLogCreate,
    InterviewCreate, InterviewUpdate, STAGES,
)

router = APIRouter(prefix="/jobs", tags=["jobs"])

ACTIVE_STAGES = {
    "Applied", "Screening",
    "Interview Round 1", "Interview Round 2", "Interview Round 3",
    "Interview Round 4", "Interview Round 5", "Interview Round 6",
    "Offer Received",
}

INTERVIEW_STAGES = {s for s in STAGES if s.startswith("Interview Round")}

PIPELINE_GROUPS = {
    "Applied":      ["Applied"],
    "Screening":    ["Screening"],
    "Interviewing": [f"Interview Round {i}" for i in range(1, 7)],
    "Offer":        ["Offer Received", "Offer Accepted", "Offer Declined"],
    "Closed":       ["Rejected", "Withdrawn", "Ghosted"],
}

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _enrich_app(a: dict, today: date) -> dict:
    app_date = date.fromisoformat(a["application_date"])
    last_upd  = date.fromisoformat(a["last_updated_date"])
    a["days_since_application"] = (today - app_date).days
    a["days_since_last_update"] = (today - last_upd).days
    a["is_stale"] = (
        a["days_since_last_update"] >= 7 and a["current_status"] in ACTIVE_STAGES
    )
    # follow_up urgency
    if a.get("follow_up_date"):
        fud = date.fromisoformat(a["follow_up_date"])
        delta = (fud - today).days
        if delta < 0:
            a["follow_up_urgency"] = "overdue"
        elif delta == 0:
            a["follow_up_urgency"] = "today"
        elif delta <= 3:
            a["follow_up_urgency"] = "soon"
        else:
            a["follow_up_urgency"] = "future"
    else:
        a["follow_up_urgency"] = None
    return a


# ─── Applications ─────────────────────────────────────────────────────────────

@router.get("/applications")
async def get_applications(
    status:     Optional[str] = Query(None),
    source:     Optional[str] = Query(None),
    tag:        Optional[str] = Query(None),
    from_date:  Optional[str] = Query(None),
    to_date:    Optional[str] = Query(None),
    active_only: bool = Query(True),
):
    query = supabase.table("job_applications").select("*").order("application_date", desc=True)
    if active_only:
        query = query.eq("is_active", True)
    if status:
        query = query.eq("current_status", status)
    if source:
        query = query.eq("source", source)
    if from_date:
        query = query.gte("application_date", from_date)
    if to_date:
        query = query.lte("application_date", to_date)

    result = query.execute()
    today = date.today()
    apps = [_enrich_app(a, today) for a in result.data]

    # tag filter (Postgres array contains — filter in python since supabase-py doesn't have `cs`)
    if tag:
        apps = [a for a in apps if tag in (a.get("tags") or [])]

    return {"data": apps, "count": len(apps)}


@router.post("/applications")
async def create_application(body: ApplicationCreate):
    app_id = str(uuid.uuid4())
    today_str = str(date.today())
    data = body.model_dump()
    data["id"] = app_id
    data["application_date"] = str(data["application_date"])
    data["last_updated_date"] = today_str
    data["is_active"] = True
    if data.get("follow_up_date"):
        data["follow_up_date"] = str(data["follow_up_date"])
    if data.get("tags") is None:
        data["tags"] = []

    result = supabase.table("job_applications").insert(data).execute()
    if not result.data:
        raise HTTPException(500, "Failed to create application")

    supabase.table("job_stage_logs").insert({
        "id": str(uuid.uuid4()),
        "application_id": app_id,
        "stage": body.current_status,
        "date_of_update": today_str,
        "notes": "Application created",
    }).execute()

    return result.data[0]


@router.put("/applications/{app_id}")
async def update_application(app_id: str, body: ApplicationUpdate):
    existing_res = supabase.table("job_applications").select("current_status").eq("id", app_id).execute()
    if not existing_res.data:
        raise HTTPException(404, "Application not found")
    old_status = existing_res.data[0]["current_status"]

    updates = {}
    for k, v in body.model_dump().items():
        if v is not None:
            updates[k] = v
        elif k == "tags":
            updates[k] = []  # allow clearing tags

    if "application_date" in updates:
        updates["application_date"] = str(updates["application_date"])
    if "follow_up_date" in updates and updates["follow_up_date"]:
        updates["follow_up_date"] = str(updates["follow_up_date"])

    updates["last_updated_date"] = str(date.today())

    result = supabase.table("job_applications").update(updates).eq("id", app_id).execute()
    if not result.data:
        raise HTTPException(404, "Application not found")

    new_status = updates.get("current_status")
    if new_status and new_status != old_status:
        supabase.table("job_stage_logs").insert({
            "id": str(uuid.uuid4()),
            "application_id": app_id,
            "stage": new_status,
            "date_of_update": str(date.today()),
            "notes": f"Status changed from {old_status} to {new_status}",
        }).execute()

    return result.data[0]


@router.delete("/applications/{app_id}")
async def delete_application(app_id: str):
    supabase.table("job_applications").update({"is_active": False}).eq("id", app_id).execute()
    return {"ok": True}


# ─── Stage Logs ───────────────────────────────────────────────────────────────

@router.get("/applications/{app_id}/logs")
async def get_stage_logs(app_id: str):
    result = (
        supabase.table("job_stage_logs")
        .select("*")
        .eq("application_id", app_id)
        .order("date_of_update")
        .execute()
    )
    logs = result.data
    for i, log in enumerate(logs):
        if i == 0:
            log["days_since_prev"] = 0
        else:
            prev = date.fromisoformat(logs[i - 1]["date_of_update"])
            cur  = date.fromisoformat(log["date_of_update"])
            log["days_since_prev"] = (cur - prev).days
    return {"data": logs, "count": len(logs)}


@router.post("/stage-logs")
async def add_stage_log(body: StageLogCreate):
    data = body.model_dump()
    data["id"] = str(uuid.uuid4())
    data["date_of_update"] = str(data["date_of_update"])
    result = supabase.table("job_stage_logs").insert(data).execute()
    if not result.data:
        raise HTTPException(500, "Failed to add log")
    supabase.table("job_applications").update({
        "current_status": body.stage,
        "last_updated_date": str(body.date_of_update),
    }).eq("id", body.application_id).execute()
    return result.data[0]


# ─── Interviews ───────────────────────────────────────────────────────────────

@router.get("/applications/{app_id}/interviews")
async def get_interviews(app_id: str):
    result = (
        supabase.table("job_interviews")
        .select("*")
        .eq("application_id", app_id)
        .order("round_number")
        .execute()
    )
    return {"data": result.data, "count": len(result.data)}


@router.post("/interviews")
async def create_interview(body: InterviewCreate):
    data = body.model_dump()
    data["id"] = str(uuid.uuid4())
    if data.get("interview_date"):
        data["interview_date"] = str(data["interview_date"])
    result = supabase.table("job_interviews").insert(data).execute()
    if not result.data:
        raise HTTPException(500, "Failed to create interview note")
    return result.data[0]


@router.put("/interviews/{interview_id}")
async def update_interview(interview_id: str, body: InterviewUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "interview_date" in updates:
        updates["interview_date"] = str(updates["interview_date"])
    result = supabase.table("job_interviews").update(updates).eq("id", interview_id).execute()
    if not result.data:
        raise HTTPException(404, "Interview not found")
    return result.data[0]


@router.delete("/interviews/{interview_id}")
async def delete_interview(interview_id: str):
    supabase.table("job_interviews").delete().eq("id", interview_id).execute()
    return {"ok": True}


# ─── Pipeline ─────────────────────────────────────────────────────────────────

@router.get("/pipeline")
async def get_pipeline():
    result = (
        supabase.table("job_applications")
        .select("*")
        .eq("is_active", True)
        .order("last_updated_date", desc=True)
        .execute()
    )
    today = date.today()
    groups: dict = {g: [] for g in PIPELINE_GROUPS}
    for a in result.data:
        a = _enrich_app(a, today)
        for group, stages in PIPELINE_GROUPS.items():
            if a["current_status"] in stages:
                groups[group].append(a)
                break
    return {"groups": groups, "total": len(result.data)}


# ─── Offers ───────────────────────────────────────────────────────────────────

@router.get("/offers")
async def get_offers():
    offer_statuses = ["Offer Received", "Offer Accepted", "Offer Declined"]
    result = (
        supabase.table("job_applications")
        .select("*")
        .eq("is_active", True)
        .in_("current_status", offer_statuses)
        .order("application_date", desc=True)
        .execute()
    )
    today = date.today()
    offers = [_enrich_app(a, today) for a in result.data]

    # Summary stats
    salaries_offered = [o["salary_offered"] for o in offers if o.get("salary_offered")]
    avg_salary = round(sum(salaries_offered) / len(salaries_offered)) if salaries_offered else None
    accepted = sum(1 for o in offers if o["current_status"] == "Offer Accepted")
    declined = sum(1 for o in offers if o["current_status"] == "Offer Declined")
    pending  = sum(1 for o in offers if o["current_status"] == "Offer Received")

    return {
        "data": offers,
        "count": len(offers),
        "summary": {
            "total": len(offers),
            "accepted": accepted,
            "declined": declined,
            "pending": pending,
            "avg_salary_offered": avg_salary,
        },
    }


# ─── Timeline ─────────────────────────────────────────────────────────────────

@router.get("/timeline")
async def get_timeline(active_only: bool = Query(True)):
    query = supabase.table("job_applications").select("*").order("application_date")
    if active_only:
        query = query.eq("is_active", True)
    result = query.execute()
    today = date.today()
    apps = [_enrich_app(a, today) for a in result.data]

    # Fetch all stage logs for these apps
    app_ids = [a["id"] for a in apps]
    logs_result = supabase.table("job_stage_logs").select("*").order("date_of_update").execute()
    logs_by_app: dict = defaultdict(list)
    for l in logs_result.data:
        if l["application_id"] in app_ids:
            logs_by_app[l["application_id"]].append(l)

    for a in apps:
        a["stage_logs"] = logs_by_app.get(a["id"], [])

    return {"data": apps, "count": len(apps)}


# ─── Analytics ────────────────────────────────────────────────────────────────

@router.get("/analytics")
async def get_analytics():
    apps_result = supabase.table("job_applications").select("*").eq("is_active", True).execute()
    apps = apps_result.data
    if not apps:
        return {"stage_times": [], "day_of_week": [], "has_data": False}

    logs_result = supabase.table("job_stage_logs").select("*").order("date_of_update").execute()
    logs_by_app: dict = defaultdict(list)
    for l in logs_result.data:
        logs_by_app[l["application_id"]].append(l)

    today = date.today()

    # ── Time in Stage ─────────────────────────────────────────────────────────
    # For each application, compute days spent in each stage before moving forward
    stage_durations: dict = defaultdict(list)

    for a in apps:
        app_logs = sorted(logs_by_app[a["id"]], key=lambda x: x["date_of_update"])
        for i in range(len(app_logs) - 1):
            cur_stage = app_logs[i]["stage"]
            cur_date  = date.fromisoformat(app_logs[i]["date_of_update"])
            nxt_date  = date.fromisoformat(app_logs[i + 1]["date_of_update"])
            days = (nxt_date - cur_date).days
            if days >= 0:
                stage_durations[cur_stage].append(days)

        # Last stage: time until today (if active) or last_updated
        if app_logs:
            last_stage = app_logs[-1]["stage"]
            last_date  = date.fromisoformat(app_logs[-1]["date_of_update"])
            if a["current_status"] in ACTIVE_STAGES:
                stage_durations[last_stage].append((today - last_date).days)

    # Order by STAGES list, merge interview rounds into "Interviewing"
    stage_time_rows = []
    interview_combined: list = []
    for stage in STAGES:
        durations = stage_durations.get(stage, [])
        if not durations:
            continue
        avg_days = round(sum(durations) / len(durations), 1)
        if stage.startswith("Interview Round"):
            interview_combined.extend(durations)
            continue
        stage_time_rows.append({"stage": stage, "avg_days": avg_days, "count": len(durations)})

    if interview_combined:
        stage_time_rows.insert(
            next((i for i, r in enumerate(stage_time_rows) if r["stage"] == "Offer Received"), len(stage_time_rows)),
            {
                "stage": "Interviewing",
                "avg_days": round(sum(interview_combined) / len(interview_combined), 1),
                "count": len(interview_combined),
            },
        )

    # ── Response Rate by Day of Week ─────────────────────────────────────────
    # day 0 = Monday (isoweekday - 1)
    day_totals: dict   = defaultdict(int)
    day_responses: dict = defaultdict(int)

    for a in apps:
        try:
            app_date = date.fromisoformat(a["application_date"])
            dow = app_date.weekday()  # 0=Mon, 6=Sun
            day_totals[dow] += 1
            app_logs = logs_by_app[a["id"]]
            got_response = any(
                l["stage"] in ("Screening", "Interview Round 1")
                for l in app_logs
            )
            if got_response:
                day_responses[dow] += 1
        except Exception:
            pass

    dow_data = []
    for i in range(7):
        total = day_totals.get(i, 0)
        responses = day_responses.get(i, 0)
        dow_data.append({
            "day": DAY_NAMES[i],
            "short": DAY_NAMES[i][:3],
            "total": total,
            "responses": responses,
            "response_rate": round(responses / total * 100, 1) if total > 0 else 0,
        })

    return {
        "stage_times": stage_time_rows,
        "day_of_week": dow_data,
        "has_data": True,
    }


# ─── Dashboard ────────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def get_dashboard():
    result = supabase.table("job_applications").select("*").eq("is_active", True).execute()
    apps = result.data
    today = date.today()

    if not apps:
        return _empty_dashboard()

    total   = len(apps)
    active  = sum(1 for a in apps if a["current_status"] in ACTIVE_STAGES)
    offers_received = sum(1 for a in apps if a["current_status"] in {"Offer Received", "Offer Accepted", "Offer Declined"})
    offers_accepted = sum(1 for a in apps if a["current_status"] == "Offer Accepted")
    rejections = sum(1 for a in apps if a["current_status"] == "Rejected")
    ghosted    = sum(1 for a in apps if a["current_status"] == "Ghosted")
    withdrawn  = sum(1 for a in apps if a["current_status"] == "Withdrawn")
    offer_rate = round(offers_received / total * 100, 1) if total > 0 else 0

    logs_res = supabase.table("job_stage_logs").select("*").execute()
    logs_by_app: dict = defaultdict(list)
    for l in logs_res.data:
        logs_by_app[l["application_id"]].append(l)

    days_to_response: list = []
    avg_interview_rounds_list: list = []
    for a in apps:
        app_logs = sorted(logs_by_app[a["id"]], key=lambda x: x["date_of_update"])
        app_date = date.fromisoformat(a["application_date"])
        for lg in app_logs:
            if lg["stage"] in ("Screening", "Interview Round 1"):
                resp_date = date.fromisoformat(lg["date_of_update"])
                days_to_response.append((resp_date - app_date).days)
                break
        rounds = sum(1 for lg in app_logs if lg["stage"].startswith("Interview Round"))
        if rounds > 0:
            avg_interview_rounds_list.append(rounds)

    avg_days_to_response  = round(sum(days_to_response) / len(days_to_response), 1) if days_to_response else None
    avg_interview_rounds  = round(sum(avg_interview_rounds_list) / len(avg_interview_rounds_list), 1) if avg_interview_rounds_list else None

    status_counts: dict = defaultdict(int)
    for a in apps:
        status_counts[a["current_status"]] += 1

    source_data: dict = defaultdict(lambda: {"total": 0, "interviews": 0, "offers": 0})
    for a in apps:
        src = a["source"]
        source_data[src]["total"] += 1
        if a["interview_rounds_done"] > 0 or a["current_status"].startswith("Interview"):
            source_data[src]["interviews"] += 1
        if a["current_status"] in {"Offer Received", "Offer Accepted", "Offer Declined"}:
            source_data[src]["offers"] += 1

    source_breakdown = [
        {
            "source": src,
            "total": v["total"],
            "interviews": v["interviews"],
            "offers": v["offers"],
            "interview_rate": round(v["interviews"] / v["total"] * 100, 1) if v["total"] else 0,
            "offer_rate": round(v["offers"] / v["total"] * 100, 1) if v["total"] else 0,
        }
        for src, v in sorted(source_data.items(), key=lambda x: x[1]["total"], reverse=True)
    ]

    funnel = {
        "Applied":      status_counts.get("Applied", 0) + sum(status_counts.get(s, 0) for s in STAGES if s != "Applied"),
        "Screening":    sum(status_counts.get(s, 0) for s in STAGES if s != "Applied"),
        "Interviewing": sum(status_counts.get(s, 0) for s in STAGES if s.startswith("Interview") or s in {"Offer Received", "Offer Accepted", "Offer Declined"}),
        "Offer":        sum(status_counts.get(s, 0) for s in ["Offer Received", "Offer Accepted", "Offer Declined"]),
        "Accepted":     status_counts.get("Offer Accepted", 0),
    }

    # Stale applications
    stale = []
    for a in apps:
        if a["current_status"] not in ACTIVE_STAGES:
            continue
        last_upd = date.fromisoformat(a["last_updated_date"])
        days_stale = (today - last_upd).days
        if days_stale >= 7:
            stale.append({
                "id": a["id"],
                "company_name": a["company_name"],
                "job_title": a["job_title"],
                "current_status": a["current_status"],
                "days_since_last_update": days_stale,
            })
    stale.sort(key=lambda x: x["days_since_last_update"], reverse=True)

    # Follow-up reminders (due today or overdue)
    follow_up_reminders = []
    for a in apps:
        if not a.get("follow_up_date"):
            continue
        fud = date.fromisoformat(a["follow_up_date"])
        delta = (fud - today).days
        if delta <= 1:  # overdue or today or tomorrow
            follow_up_reminders.append({
                "id": a["id"],
                "company_name": a["company_name"],
                "job_title": a["job_title"],
                "current_status": a["current_status"],
                "follow_up_date": a["follow_up_date"],
                "days_delta": delta,
                "urgency": "overdue" if delta < 0 else "today" if delta == 0 else "soon",
            })
    follow_up_reminders.sort(key=lambda x: x["days_delta"])

    recent = sorted(apps, key=lambda x: x["application_date"], reverse=True)[:5]
    for r in recent:
        r["days_since_application"] = (today - date.fromisoformat(r["application_date"])).days

    monthly: dict = defaultdict(int)
    for a in apps:
        monthly[a["application_date"][:7]] += 1
    monthly_trend = []
    for i in range(5, -1, -1):
        m = today.replace(day=1) - timedelta(days=30 * i)
        key = f"{m.year}-{m.month:02d}"
        monthly_trend.append({"month": m.strftime("%b %Y"), "key": key, "count": monthly.get(key, 0)})

    return {
        "summary": {
            "total": total,
            "active": active,
            "offers_received": offers_received,
            "offers_accepted": offers_accepted,
            "rejections": rejections,
            "ghosted": ghosted,
            "withdrawn": withdrawn,
            "offer_rate": offer_rate,
            "avg_days_to_response": avg_days_to_response,
            "avg_interview_rounds": avg_interview_rounds,
        },
        "status_breakdown": dict(status_counts),
        "source_breakdown": source_breakdown,
        "pipeline_funnel": funnel,
        "stale_applications": stale[:10],
        "follow_up_reminders": follow_up_reminders[:10],
        "recent_applications": recent,
        "monthly_trend": monthly_trend,
    }


def _empty_dashboard() -> dict:
    return {
        "summary": {
            "total": 0, "active": 0, "offers_received": 0, "offers_accepted": 0,
            "rejections": 0, "ghosted": 0, "withdrawn": 0,
            "offer_rate": 0, "avg_days_to_response": None, "avg_interview_rounds": None,
        },
        "status_breakdown": {},
        "source_breakdown": [],
        "pipeline_funnel": {"Applied": 0, "Screening": 0, "Interviewing": 0, "Offer": 0, "Accepted": 0},
        "stale_applications": [],
        "follow_up_reminders": [],
        "recent_applications": [],
        "monthly_trend": [],
    }


# ─── Meta ─────────────────────────────────────────────────────────────────────

@router.get("/meta")
async def get_meta():
    from app.models.jobs import SOURCES, JOB_TYPES, WORK_MODES, INTERVIEW_TYPES, INTERVIEW_OUTCOMES
    return {
        "stages": STAGES,
        "sources": SOURCES,
        "job_types": JOB_TYPES,
        "work_modes": WORK_MODES,
        "interview_types": INTERVIEW_TYPES,
        "interview_outcomes": INTERVIEW_OUTCOMES,
    }
