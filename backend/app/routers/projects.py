from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import date, datetime, timedelta
from collections import defaultdict

from app.database import supabase
from app.models.projects import (
    ProjectCreate, ProjectUpdate,
    TaskCreate, TaskUpdate,
    MilestoneCreate, MilestoneUpdate,
    UpdateCreate,
)

router = APIRouter(prefix="/projects", tags=["projects"])


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _auto_progress(tasks: list) -> int:
    if not tasks:
        return 0
    done = sum(1 for t in tasks if t["status"] == "done")
    return round(done / len(tasks) * 100)


# ─── Projects ────────────────────────────────────────────────────────────────

@router.get("")
async def get_projects(
    type: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
):
    q = supabase.table("projects").select("*").order("created_at", desc=True)
    if type:
        q = q.eq("type", type)
    if status:
        q = q.eq("status", status)
    if priority:
        q = q.eq("priority", priority)
    result = q.execute()
    return {"data": result.data}


@router.post("")
async def create_project(body: ProjectCreate):
    payload = body.model_dump(exclude_none=True)
    for date_field in ("start_date", "deadline"):
        if date_field in payload and payload[date_field]:
            payload[date_field] = str(payload[date_field])
    result = supabase.table("projects").insert(payload).execute()
    if not result.data:
        raise HTTPException(500, "Failed to create project")
    return result.data[0]


@router.get("/stats/summary")
async def get_stats_summary():
    projects_result = supabase.table("projects").select("*").execute()
    tasks_result = supabase.table("project_tasks").select("id,project_id,status,due_date,priority").execute()

    projects = projects_result.data
    tasks = tasks_result.data
    today = date.today()

    total = len(projects)
    active = sum(1 for p in projects if p["status"] == "active")
    on_hold = sum(1 for p in projects if p["status"] == "on_hold")
    completed = sum(1 for p in projects if p["status"] == "completed")
    cancelled = sum(1 for p in projects if p["status"] == "cancelled")

    by_type = defaultdict(int)
    for p in projects:
        by_type[p["type"]] += 1

    total_tasks = len(tasks)
    done_tasks = sum(1 for t in tasks if t["status"] == "done")
    pending_tasks = sum(1 for t in tasks if t["status"] == "todo")
    in_progress_tasks = sum(1 for t in tasks if t["status"] == "in_progress")
    overdue_tasks = sum(
        1 for t in tasks
        if t["status"] != "done" and t["due_date"] and t["due_date"] < str(today)
    )

    # Upcoming deadlines (next 14 days)
    two_weeks = str(today + timedelta(days=14))
    upcoming = [
        p for p in projects
        if p["status"] == "active" and p.get("deadline")
        and str(today) <= p["deadline"] <= two_weeks
    ]
    upcoming.sort(key=lambda p: p["deadline"])

    # Overdue projects
    overdue_projects = [
        p for p in projects
        if p["status"] == "active" and p.get("deadline") and p["deadline"] < str(today)
    ]

    # Avg progress of active projects
    active_projects = [p for p in projects if p["status"] == "active"]
    avg_progress = round(sum(p.get("progress", 0) for p in active_projects) / len(active_projects)) if active_projects else 0

    return {
        "total": total,
        "active": active,
        "on_hold": on_hold,
        "completed": completed,
        "cancelled": cancelled,
        "by_type": dict(by_type),
        "total_tasks": total_tasks,
        "done_tasks": done_tasks,
        "pending_tasks": pending_tasks,
        "in_progress_tasks": in_progress_tasks,
        "overdue_tasks": overdue_tasks,
        "overdue_projects": len(overdue_projects),
        "upcoming_deadlines": upcoming[:5],
        "avg_progress": avg_progress,
    }


@router.get("/tasks")
async def get_all_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    project_id: Optional[str] = None,
):
    q = supabase.table("project_tasks").select("*").order("created_at", desc=True)
    if status:
        q = q.eq("status", status)
    if priority:
        q = q.eq("priority", priority)
    if project_id:
        q = q.eq("project_id", project_id)
    tasks = q.execute().data

    # Attach project name
    projects = supabase.table("projects").select("id,name,color,type").execute().data
    proj_map = {p["id"]: p for p in projects}
    for t in tasks:
        t["project"] = proj_map.get(t["project_id"])

    return {"data": tasks}


@router.get("/{project_id}")
async def get_project(project_id: str):
    proj = supabase.table("projects").select("*").eq("id", project_id).execute()
    if not proj.data:
        raise HTTPException(404, "Project not found")
    project = proj.data[0]

    tasks = supabase.table("project_tasks").select("*").eq("project_id", project_id).order("sort_order").execute().data
    milestones = supabase.table("project_milestones").select("*").eq("project_id", project_id).order("due_date").execute().data
    updates = supabase.table("project_updates").select("*").eq("project_id", project_id).order("created_at", desc=True).execute().data

    return {
        **project,
        "tasks": tasks,
        "milestones": milestones,
        "updates": updates,
    }


@router.patch("/{project_id}")
async def update_project(project_id: str, body: ProjectUpdate):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No fields to update")
    for date_field in ("start_date", "deadline"):
        if date_field in updates and updates[date_field]:
            updates[date_field] = str(updates[date_field])
    updates["updated_at"] = datetime.utcnow().isoformat()
    result = supabase.table("projects").update(updates).eq("id", project_id).execute()
    if not result.data:
        raise HTTPException(404, "Project not found")
    return result.data[0]


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    supabase.table("projects").delete().eq("id", project_id).execute()
    return {"ok": True}


# ─── Tasks ───────────────────────────────────────────────────────────────────

@router.post("/tasks/create")
async def create_task(body: TaskCreate):
    payload = body.model_dump(exclude_none=True)
    if "due_date" in payload and payload["due_date"]:
        payload["due_date"] = str(payload["due_date"])
    result = supabase.table("project_tasks").insert(payload).execute()
    if not result.data:
        raise HTTPException(500, "Failed to create task")
    return result.data[0]


@router.patch("/tasks/{task_id}")
async def update_task(task_id: str, body: TaskUpdate):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No fields to update")
    if "due_date" in updates and updates["due_date"]:
        updates["due_date"] = str(updates["due_date"])

    # Auto-set completed_at when marking done
    if updates.get("status") == "done":
        updates.setdefault("completed_at", datetime.utcnow().isoformat())
    elif updates.get("status") in ("todo", "in_progress"):
        updates["completed_at"] = None

    result = supabase.table("project_tasks").update(updates).eq("id", task_id).execute()
    if not result.data:
        raise HTTPException(404, "Task not found")

    # Auto-update project progress from tasks
    task = result.data[0]
    all_tasks = supabase.table("project_tasks").select("status").eq("project_id", task["project_id"]).execute().data
    new_progress = _auto_progress(all_tasks)
    supabase.table("projects").update({"progress": new_progress, "updated_at": datetime.utcnow().isoformat()}).eq("id", task["project_id"]).execute()

    return task


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    task = supabase.table("project_tasks").select("project_id").eq("id", task_id).execute()
    supabase.table("project_tasks").delete().eq("id", task_id).execute()
    # Recalculate progress
    if task.data:
        pid = task.data[0]["project_id"]
        all_tasks = supabase.table("project_tasks").select("status").eq("project_id", pid).execute().data
        supabase.table("projects").update({"progress": _auto_progress(all_tasks)}).eq("id", pid).execute()
    return {"ok": True}


# ─── Milestones ──────────────────────────────────────────────────────────────

@router.post("/milestones/create")
async def create_milestone(body: MilestoneCreate):
    payload = body.model_dump(exclude_none=True)
    if "due_date" in payload and payload["due_date"]:
        payload["due_date"] = str(payload["due_date"])
    result = supabase.table("project_milestones").insert(payload).execute()
    return result.data[0] if result.data else {}


@router.patch("/milestones/{milestone_id}")
async def update_milestone(milestone_id: str, body: MilestoneUpdate):
    updates = body.model_dump(exclude_none=True)
    for f in ("due_date", "completed_at"):
        if f in updates and updates[f]:
            updates[f] = str(updates[f])
    result = supabase.table("project_milestones").update(updates).eq("id", milestone_id).execute()
    return result.data[0] if result.data else {}


@router.delete("/milestones/{milestone_id}")
async def delete_milestone(milestone_id: str):
    supabase.table("project_milestones").delete().eq("id", milestone_id).execute()
    return {"ok": True}


# ─── Updates / Notes ─────────────────────────────────────────────────────────

@router.post("/updates/create")
async def create_update(body: UpdateCreate):
    result = supabase.table("project_updates").insert(body.model_dump()).execute()
    return result.data[0] if result.data else {}


@router.delete("/updates/{update_id}")
async def delete_update(update_id: str):
    supabase.table("project_updates").delete().eq("id", update_id).execute()
    return {"ok": True}
