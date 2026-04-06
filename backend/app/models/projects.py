from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "personal"          # personal | freelance | office
    status: str = "active"          # active | on_hold | completed | cancelled
    priority: str = "medium"        # low | medium | high | urgent
    tech_stack: Optional[list] = []
    github_url: Optional[str] = None
    live_url: Optional[str] = None
    start_date: Optional[date] = None
    deadline: Optional[date] = None
    progress: int = 0
    client_name: Optional[str] = None
    color: Optional[str] = "#f97316"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    tech_stack: Optional[list] = None
    github_url: Optional[str] = None
    live_url: Optional[str] = None
    start_date: Optional[date] = None
    deadline: Optional[date] = None
    progress: Optional[int] = None
    client_name: Optional[str] = None
    color: Optional[str] = None


class TaskCreate(BaseModel):
    project_id: str
    title: str
    description: Optional[str] = None
    status: str = "todo"            # todo | in_progress | done
    priority: str = "medium"
    due_date: Optional[date] = None
    sort_order: int = 0


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    sort_order: Optional[int] = None
    completed_at: Optional[str] = None


class MilestoneCreate(BaseModel):
    project_id: str
    title: str
    due_date: Optional[date] = None


class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    due_date: Optional[date] = None
    completed_at: Optional[date] = None


class UpdateCreate(BaseModel):
    project_id: str
    content: str
