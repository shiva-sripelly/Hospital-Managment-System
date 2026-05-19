from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine
from app.models import Appointment, Bill, Doctor, LabTest, MedicalRecord, Notification, Patient, Prescription, PrescriptionItem, User
from app.routers import appointments, auth, billing, dashboard, doctors, lab_tests, medical_records, notifications, patients, prescriptions, users

app = FastAPI(title=settings.project_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Hospital Management System API"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(patients.router, prefix=settings.api_prefix)
app.include_router(doctors.router, prefix=settings.api_prefix)
app.include_router(appointments.router, prefix=settings.api_prefix)
app.include_router(billing.router, prefix=settings.api_prefix)
app.include_router(billing.bills_router, prefix=settings.api_prefix)
app.include_router(prescriptions.router, prefix=settings.api_prefix)
app.include_router(lab_tests.router, prefix=settings.api_prefix)
app.include_router(medical_records.router, prefix=settings.api_prefix)
app.include_router(notifications.router, prefix=settings.api_prefix)
app.include_router(dashboard.router, prefix=settings.api_prefix)
app.include_router(users.router, prefix=settings.api_prefix)

static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=static_dir), name="static")
