from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import salary, books, habits, projects, jobs, auth

app = FastAPI(title="Personal Management API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(salary.router)
app.include_router(books.router)
app.include_router(habits.router)
app.include_router(projects.router)
app.include_router(jobs.router)
app.include_router(auth.router)



@app.get("/")
async def root():
    return {"message": "Personal Management API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
