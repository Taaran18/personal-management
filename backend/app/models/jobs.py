from pydantic import BaseModel
from typing import Optional, List
from datetime import date


SOURCES = ["LinkedIn", "Company Site", "Referral", "Job Board", "Cold Outreach", "Indeed", "Naukri", "Other"]

STAGES = [
    "Applied", "Screening",
    "Interview Round 1", "Interview Round 2", "Interview Round 3",
    "Interview Round 4", "Interview Round 5", "Interview Round 6",
    "Offer Received", "Offer Accepted", "Offer Declined",
    "Rejected", "Withdrawn", "Ghosted",
]

JOB_TYPES    = ["Full-time", "Part-time", "Contract", "Internship", "Freelance"]
WORK_MODES   = ["Remote", "Hybrid", "On-site"]
INTERVIEW_TYPES   = ["Phone", "Video", "In-person", "Technical", "Take-home", "HR", "Final"]
INTERVIEW_OUTCOMES = ["Pending", "Passed", "Failed"]


class ApplicationCreate(BaseModel):
    company_name: str
    job_title: str
    job_url: Optional[str] = None
    source: str = "LinkedIn"
    current_status: str = "Applied"
    application_date: date
    interview_rounds_done: int = 0
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    location: Optional[str] = None
    job_type: str = "Full-time"
    work_mode: str = "Hybrid"
    salary_expected: Optional[float] = None
    salary_offered: Optional[float] = None
    notes: Optional[str] = None
    follow_up_date: Optional[date] = None
    tags: Optional[List[str]] = None


class ApplicationUpdate(BaseModel):
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    job_url: Optional[str] = None
    source: Optional[str] = None
    current_status: Optional[str] = None
    application_date: Optional[date] = None
    last_updated_date: Optional[date] = None
    interview_rounds_done: Optional[int] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    work_mode: Optional[str] = None
    salary_expected: Optional[float] = None
    salary_offered: Optional[float] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None
    follow_up_date: Optional[date] = None
    tags: Optional[List[str]] = None


class StageLogCreate(BaseModel):
    application_id: str
    stage: str
    date_of_update: date
    notes: Optional[str] = None


class InterviewCreate(BaseModel):
    application_id: str
    interview_date: Optional[date] = None
    interview_time: Optional[str] = None
    interview_type: str = "Video"
    round_number: int = 1
    interviewer_name: Optional[str] = None
    prep_notes: Optional[str] = None
    questions_asked: Optional[str] = None
    outcome: str = "Pending"
    feedback: Optional[str] = None


class InterviewUpdate(BaseModel):
    interview_date: Optional[date] = None
    interview_time: Optional[str] = None
    interview_type: Optional[str] = None
    round_number: Optional[int] = None
    interviewer_name: Optional[str] = None
    prep_notes: Optional[str] = None
    questions_asked: Optional[str] = None
    outcome: Optional[str] = None
    feedback: Optional[str] = None
