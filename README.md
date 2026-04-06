# Personal Management System

A full-stack personal management system built with Next.js, FastAPI, and Supabase.

## Modules

- **Salary Manager** — Transactions, Ledger, Monthly Summary, Dashboard, Config
- **Book Library** — Library, Reading Sessions, Reviews, Dashboard
- **Habits Tracker** — Weekly Grid, Streaks, Freeze, Notes, Milestones, Calendar Heatmap
- **Project Manager** — Kanban Board, Tasks, Milestones, Updates, Progress Tracking
- **Job Applications** — Applications, Pipeline, Analytics, Timeline, Offers

## Tech Stack

- **Frontend:** Next.js + TypeScript + Tailwind CSS + Recharts
- **Backend:** FastAPI + Python
- **Database:** Supabase (PostgreSQL)

---

## Project Structure

```text
Personal-Management/
├── frontend/          # Next.js app
│   ├── src/
│   │   ├── app/       # Pages (salary, books, habits, projects, jobs)
│   │   ├── components/
│   │   └── lib/       # API clients and utilities
│   └── package.json
├── backend/           # FastAPI app
│   ├── app/
│   │   ├── routers/   # salary, books, habits, projects, jobs
│   │   ├── models/    # Pydantic request/response models
│   │   └── database.py
│   ├── main.py
│   └── requirements.txt
└── .gitignore
```

---

## Setup

### 1. Supabase

Create a project at [supabase.com](https://supabase.com) and run the SQL below to create all tables.

#### Salary Manager

```sql
CREATE TABLE salary_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT CHECK (type IN ('IN','OUT')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE salary_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_balance NUMERIC(12,2) DEFAULT 0,
  saving_goal NUMERIC(12,2) DEFAULT 7200,
  categories TEXT[] DEFAULT ARRAY[
    'Food & Dining','Rent','Transport','Utilities',
    'Entertainment','Shopping','Healthcare','Education',
    'Investment / SIP','EMI','Salary Credit',
    'Other Income','Miscellaneous'
  ]
);
```

#### Book Library

```sql
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  genre TEXT,
  total_pages INTEGER,
  cover_url TEXT,
  status TEXT DEFAULT 'to_read',
  rating INTEGER,
  review TEXT,
  started_at DATE,
  finished_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  pages_read INTEGER NOT NULL,
  duration_min INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Habits Tracker

```sql
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT DEFAULT '✅',
  color TEXT DEFAULT '#f97316',
  sort_order INTEGER DEFAULT 0,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT TRUE,
  notes TEXT,
  is_freeze BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habit_id, date)
);
```

#### Project Manager

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'personal',
  status TEXT DEFAULT 'active',
  priority TEXT DEFAULT 'medium',
  tech_stack JSONB DEFAULT '[]',
  github_url TEXT,
  live_url TEXT,
  start_date DATE,
  deadline DATE,
  progress INTEGER DEFAULT 0,
  client_name TEXT,
  color TEXT DEFAULT '#f97316',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Job Applications

```sql
CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'applied',
  applied_date DATE,
  source TEXT,
  location TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  notes TEXT,
  job_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE job_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES job_applications(id) ON DELETE CASCADE,
  round TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  outcome TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate       # macOS/Linux
# venv\Scripts\activate        # Windows

pip install -r requirements.txt

# Add your Supabase credentials
cp .env.example .env
# Set SUPABASE_URL and SUPABASE_KEY in .env

uvicorn main:app --reload --port 8000
```

API docs available at <http://localhost:8000/docs>

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit <http://localhost:3000>

---

## Environment Variables

**Backend** (`backend/.env`):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-or-service-role-key
```

**Frontend** (`frontend/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Deployment

- **Frontend:** Deploy `frontend/` to Vercel — set `NEXT_PUBLIC_API_URL` to your backend URL
- **Backend:** Deploy `backend/` to Render — add `SUPABASE_URL` and `SUPABASE_KEY` as environment variables
