from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import date, datetime
from dateutil.relativedelta import relativedelta
from collections import defaultdict
import uuid

from app.database import supabase
from app.models.salary import TransactionCreate, TransactionUpdate, ConfigUpdate

router = APIRouter(prefix="/salary", tags=["salary"])

INCOME_CATEGORIES = ["Salary Credit", "Other Income", "Reimbursed"]

EXPENSE_CATEGORIES = [
    "Food & Dining", "Rent", "Transport", "Fuel", "Utilities",
    "Entertainment", "Gaming", "Movies & Events", "Shopping", "Healthcare",
    "Family Expenses", "Personal Care", "Education", "Stationery",
    "Investment / SIP", "EMI", "Groceries", "Home & Electronics",
    "Lending / Given", "Miscellaneous",
]

CATEGORIES = INCOME_CATEGORIES + EXPENSE_CATEGORIES


# ─── Transactions ────────────────────────────────────────────────────────────

@router.get("/transactions")
async def get_transactions(
    month: Optional[str] = Query(None, description="Format: YYYY-MM"),
    category: Optional[str] = None,
    type: Optional[str] = None,
):
    query = supabase.table("salary_transactions").select("*").order("date", desc=False)

    if month:
        year, mon = month.split("-")
        start = f"{year}-{mon}-01"
        last_day = (datetime(int(year), int(mon), 1) + relativedelta(months=1) - relativedelta(days=1)).day
        end = f"{year}-{mon}-{last_day:02d}"
        query = query.gte("date", start).lte("date", end)

    if category:
        query = query.eq("category", category)
    if type:
        query = query.eq("type", type)

    result = query.execute()
    return {"data": result.data, "count": len(result.data)}


@router.post("/transactions")
async def create_transaction(tx: TransactionCreate):
    data = tx.model_dump()
    data["id"] = str(uuid.uuid4())
    data["date"] = str(data["date"])
    result = supabase.table("salary_transactions").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create transaction")
    return result.data[0]


@router.put("/transactions/{tx_id}")
async def update_transaction(tx_id: str, tx: TransactionUpdate):
    data = {k: v for k, v in tx.model_dump().items() if v is not None}
    supabase.table("salary_transactions").update(data).eq("id", tx_id).execute()
    result = supabase.table("salary_transactions").select("*").eq("id", tx_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return result.data[0]


@router.delete("/transactions/{tx_id}")
async def delete_transaction(tx_id: str):
    result = supabase.table("salary_transactions").delete().eq("id", tx_id).execute()
    return {"message": "Deleted successfully"}


# ─── Ledger ──────────────────────────────────────────────────────────────────

@router.get("/ledger")
async def get_ledger(month: Optional[str] = Query(None, description="Format: YYYY-MM")):
    config = _get_config()

    query = supabase.table("salary_transactions").select("*").order("date", desc=False).order("created_at", desc=False)

    if month:
        year, mon = month.split("-")
        start = f"{year}-{mon}-01"
        last_day = (datetime(int(year), int(mon), 1) + relativedelta(months=1) - relativedelta(days=1)).day
        end = f"{year}-{mon}-{last_day:02d}"
        query = query.gte("date", start).lte("date", end)

    result = query.execute()
    transactions = result.data

    # Compute running balance starting from 0
    balance = 0
    ledger_rows = []
    total_credits = 0
    total_debits = 0

    for tx in transactions:
        if tx["type"] == "IN":
            balance += tx["amount"]
            total_credits += tx["amount"]
        else:
            balance -= tx["amount"]
            total_debits += tx["amount"]

        ledger_rows.append({
            **tx,
            "balance": round(balance, 2),
            "credit": tx["amount"] if tx["type"] == "IN" else None,
            "debit": tx["amount"] if tx["type"] == "OUT" else None,
        })

    saving_goal = config.get("saving_goal", 7200)
    net_flow = total_credits - total_debits

    summary = {
        "opening_balance": 0,
        "total_credits": round(total_credits, 2),
        "total_debits": round(total_debits, 2),
        "net_flow": round(net_flow, 2),
        "closing_balance": round(balance, 2),
        "saving_goal": saving_goal,
        "status": "Above Goal" if net_flow >= saving_goal else "Below Goal",
    }

    return {"ledger": ledger_rows, "summary": summary}


# ─── Monthly Summary ─────────────────────────────────────────────────────────

@router.get("/monthly-summary")
async def get_monthly_summary():
    config = _get_config()
    saving_goal = config.get("saving_goal", 7200)

    result = supabase.table("salary_transactions").select("*").order("date").execute()
    transactions = result.data

    # Group by month
    monthly = defaultdict(lambda: {"income": 0.0, "expenses": 0.0, "category_breakdown": defaultdict(float)})

    for tx in transactions:
        month_key = tx["date"][:7]  # YYYY-MM
        if tx["type"] == "IN":
            monthly[month_key]["income"] += tx["amount"]
        else:
            monthly[month_key]["expenses"] += tx["amount"]
        monthly[month_key]["category_breakdown"][tx["category"]] += tx["amount"]

    # Build all 12 months of current year
    current_year = datetime.now().year
    rows = []
    yearly_income = 0
    yearly_expenses = 0

    for m in range(1, 13):
        key = f"{current_year}-{m:02d}"
        label = datetime(current_year, m, 1).strftime("%b-%Y")
        data = monthly.get(key, {"income": 0.0, "expenses": 0.0, "category_breakdown": {}})
        income = round(data["income"], 2)
        expenses = round(data["expenses"], 2)
        net = round(income - expenses, 2)
        saving_pct = round((net / income * 100), 2) if income > 0 else 0
        budget_used_pct = round((expenses / income * 100), 2) if income > 0 else 0

        rows.append({
            "month": label,
            "month_key": key,
            "income": income,
            "expenses": expenses,
            "net_savings": net,
            "saving_pct": saving_pct,
            "vs_goal": "Above Goal" if net >= saving_goal else ("Below Goal" if income > 0 else "—"),
            "budget_used_pct": budget_used_pct,
            "category_breakdown": dict(data["category_breakdown"]),
        })
        yearly_income += income
        yearly_expenses += expenses

    yearly_net = round(yearly_income - yearly_expenses, 2)
    yearly_saving_pct = round((yearly_net / yearly_income * 100), 2) if yearly_income > 0 else 0

    # Category breakdown across all months
    all_category = defaultdict(lambda: defaultdict(float))
    for tx in transactions:
        if tx["date"].startswith(str(current_year)):
            month_key = tx["date"][:7]
            all_category[tx["category"]][month_key] += tx["amount"]

    return {
        "months": rows,
        "yearly": {
            "income": round(yearly_income, 2),
            "expenses": round(yearly_expenses, 2),
            "net_savings": yearly_net,
            "saving_pct": yearly_saving_pct,
            "vs_goal": "Above Goal" if yearly_net >= saving_goal * 12 else "Below Goal",
            "budget_used_pct": round((yearly_expenses / yearly_income * 100), 2) if yearly_income > 0 else 0,
        },
        "category_matrix": {cat: dict(months) for cat, months in all_category.items()},
        "categories": CATEGORIES,
    }


# ─── Dashboard ───────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def get_dashboard(month: Optional[str] = Query(None, description="Format: YYYY-MM")):
    config = _get_config()
    saving_goal = config.get("saving_goal", 7200)

    now = datetime.now()

    if month:
        year_str, mon_str = month.split("-")
        year, mon = int(year_str), int(mon_str)
    else:
        year, mon = now.year, now.month

    start = f"{year}-{mon:02d}-01"
    last_day = (datetime(year, mon, 1) + relativedelta(months=1) - relativedelta(days=1)).day
    end = f"{year}-{mon:02d}-{last_day:02d}"

    # For past months, days_elapsed = full month; for current month, use today
    is_current = (year == now.year and mon == now.month)
    if is_current:
        days_elapsed = now.day
        days_left = last_day - now.day
    else:
        days_elapsed = last_day
        days_left = 0

    result = supabase.table("salary_transactions").select("*").gte("date", start).lte("date", end).execute()
    txns = result.data

    income = sum(t["amount"] for t in txns if t["type"] == "IN")
    expenses = sum(t["amount"] for t in txns if t["type"] == "OUT")
    net_savings = income - expenses
    saving_pct = round((net_savings / income * 100), 2) if income > 0 else 0

    daily_avg = round(expenses / days_elapsed, 2) if days_elapsed > 0 else 0
    projected = round(daily_avg * last_day, 2) if is_current else expenses

    # Category breakdown
    cat_breakdown = defaultdict(float)
    for tx in txns:
        cat_breakdown[tx["category"]] += tx["amount"]

    # Yearly data
    all_result = supabase.table("salary_transactions").select("*").gte("date", f"{year}-01-01").lte("date", f"{year}-12-31").execute()
    all_txns = all_result.data

    monthly_data = defaultdict(lambda: {"income": 0.0, "expenses": 0.0})
    for tx in all_txns:
        mk = tx["date"][:7]
        if tx["type"] == "IN":
            monthly_data[mk]["income"] += tx["amount"]
        else:
            monthly_data[mk]["expenses"] += tx["amount"]

    yearly_overview = []
    for m in range(1, 13):
        key = f"{year}-{m:02d}"
        label = datetime(year, m, 1).strftime("%b-%Y")
        data = monthly_data.get(key, {"income": 0.0, "expenses": 0.0})
        s = round(data["income"] - data["expenses"], 2)
        yearly_overview.append({
            "month": label,
            "income": round(data["income"], 2),
            "expenses": round(data["expenses"], 2),
            "savings": s,
            "saving_pct": round((s / data["income"] * 100), 2) if data["income"] > 0 else 0,
            "goal": saving_goal,
        })

    # This month spending by category (only OUT, dynamic — handles any category)
    spending: dict = {}
    for tx in txns:
        if tx["type"] == "OUT":
            spending[tx["category"]] = round(spending.get(tx["category"], 0) + tx["amount"], 2)

    return {
        "this_month": {
            "income": round(income, 2),
            "expenses": round(expenses, 2),
            "savings": round(net_savings, 2),
            "saving_pct": saving_pct,
            "goal_status": "Above Goal" if net_savings >= saving_goal else "Below Goal",
            "days_left": days_left,
            "days_elapsed": days_elapsed,
            "daily_avg_spend": daily_avg,
            "projected_spend": projected,
            "saving_goal": saving_goal,
        },
        "category_breakdown": dict(cat_breakdown),
        "spending_by_category": spending,
        "yearly_overview": yearly_overview,
        "recent_transactions": sorted(txns, key=lambda x: x["date"], reverse=True)[:10],
    }


# ─── Weekly Analytics ────────────────────────────────────────────────────────

@router.get("/weekly")
async def get_weekly(offset: int = Query(0, description="Weeks back from current (0=this week, 1=last week, etc.)")):
    from datetime import timedelta
    today_date = date.today()
    current_monday = today_date - timedelta(days=today_date.weekday())
    monday = current_monday - timedelta(weeks=offset)
    last_monday = monday - timedelta(days=7)
    last_sunday = monday - timedelta(days=1)
    effective_today = today_date if offset == 0 else monday + timedelta(days=6)

    week_end = monday + timedelta(days=6)
    week_result = supabase.table("salary_transactions").select("*").gte("date", str(monday)).lte("date", str(week_end)).order("date").execute()
    last_result = supabase.table("salary_transactions").select("*").gte("date", str(last_monday)).lte("date", str(last_sunday)).execute()

    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    days = []
    week_income = 0.0
    week_expenses = 0.0

    for i in range(7):
        day_date = monday + timedelta(days=i)
        day_txns = [t for t in week_result.data if t["date"] == str(day_date)]
        day_in = sum(t["amount"] for t in day_txns if t["type"] == "IN")
        day_out = sum(t["amount"] for t in day_txns if t["type"] == "OUT")
        week_income += day_in
        week_expenses += day_out
        days.append({
            "day": day_names[i],
            "date": str(day_date),
            "income": round(day_in, 2),
            "expenses": round(day_out, 2),
            "is_future": day_date > today_date,
        })

    last_week_expenses = sum(t["amount"] for t in last_result.data if t["type"] == "OUT")
    last_week_income = sum(t["amount"] for t in last_result.data if t["type"] == "IN")

    cat_breakdown: dict = defaultdict(float)
    for t in week_result.data:
        if t["type"] == "OUT":
            cat_breakdown[t["category"]] += t["amount"]

    config = _get_config()
    saving_goal = config.get("saving_goal", 7200)

    return {
        "week_start": str(monday),
        "week_end": str(week_end),
        "today": str(today_date),
        "offset": offset,
        "days": days,
        "total_income": round(week_income, 2),
        "total_expenses": round(week_expenses, 2),
        "net": round(week_income - week_expenses, 2),
        "last_week_income": round(last_week_income, 2),
        "last_week_expenses": round(last_week_expenses, 2),
        "weekly_saving_goal": round(saving_goal / 4.33, 2),
        "category_breakdown": dict(sorted(cat_breakdown.items(), key=lambda x: x[1], reverse=True)),
    }


# ─── Config ──────────────────────────────────────────────────────────────────

@router.get("/config")
async def get_config():
    return _get_config()


@router.put("/config")
async def update_config(cfg: ConfigUpdate):
    data = {k: v for k, v in cfg.model_dump().items() if v is not None}
    data.pop("opening_balance", None)  # opening_balance is no longer used
    existing = supabase.table("salary_config").select("*").limit(1).execute()

    if existing.data:
        result = supabase.table("salary_config").update(data).eq("id", existing.data[0]["id"]).execute()
    else:
        data["id"] = str(uuid.uuid4())
        data.setdefault("categories", CATEGORIES)
        result = supabase.table("salary_config").insert(data).execute()

    return result.data[0] if result.data else {"message": "Updated"}


@router.get("/categories")
async def get_categories():
    config = _get_config()
    return {
        "categories": config.get("categories", CATEGORIES),
        "income_categories": config.get("income_categories", ["Salary Credit", "Other Income"]),
    }


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_config() -> dict:
    result = supabase.table("salary_config").select("*").limit(1).execute()
    if result.data:
        cfg = result.data[0]
        if not cfg.get("income_categories"):
            cfg["income_categories"] = ["Salary Credit", "Other Income"]
        return cfg
    return {"saving_goal": 7200, "categories": CATEGORIES, "income_categories": ["Salary Credit", "Other Income"]}
