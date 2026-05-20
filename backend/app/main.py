from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import SessionLocal
from app.routers import (
    ai,
    appointments,
    audit_logs,
    auth,
    billing,
    dashboard,
    doctors,
    inventory,
    lab_tests,
    medical_records,
    medicine_sales,
    medicines,
    notifications,
    patients,
    payroll,
    prescriptions,
    reports,
    staff,
    users,
)
from app.services.audit_service import create_audit_log
from app.utils.security import decode_access_token

app = FastAPI(title=settings.project_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def audit_tracking_middleware(request, call_next):
    response = await call_next(request)
    if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
        return response
    if request.url.path.startswith(("/static", "/audit-logs")):
        return response

    token = request.headers.get("authorization", "").replace("Bearer ", "", 1)
    payload = decode_access_token(token) if token else None
    user_id = int(payload["sub"]) if payload and payload.get("sub") else None
    module_name = request.url.path.strip("/").split("/")[0] or "root"
    with SessionLocal() as db:
        create_audit_log(
            db,
            action=request.method,
            module_name=module_name,
            description=f"{request.method} {request.url.path} -> {response.status_code}",
            user_id=user_id,
        )
    return response


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
app.include_router(medicines.router, prefix=settings.api_prefix)
app.include_router(medicine_sales.router, prefix=settings.api_prefix)
app.include_router(inventory.router, prefix=settings.api_prefix)
app.include_router(staff.router, prefix=settings.api_prefix)
app.include_router(payroll.router, prefix=settings.api_prefix)
app.include_router(reports.router, prefix=settings.api_prefix)
app.include_router(audit_logs.router, prefix=settings.api_prefix)
app.include_router(ai.router, prefix=settings.api_prefix)
app.include_router(prescriptions.router, prefix=settings.api_prefix)
app.include_router(lab_tests.router, prefix=settings.api_prefix)
app.include_router(medical_records.router, prefix=settings.api_prefix)
app.include_router(notifications.router, prefix=settings.api_prefix)
app.include_router(dashboard.router, prefix=settings.api_prefix)
app.include_router(users.router, prefix=settings.api_prefix)

static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=static_dir), name="static")
