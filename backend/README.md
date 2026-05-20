# Hospital Management System Backend

FastAPI backend for the Hospital Management System.

## Setup

```powershell
cd backend
venv\Scripts\python.exe -m pip install -r requirements.txt
```

Create or update `.env` with your PostgreSQL credentials. `DATABASE_URL` is required; the backend does not fall back to SQLite.

```env
DATABASE_URL=postgresql+psycopg://postgres:root@localhost:5432/hospital_management_db
SECRET_KEY=replace-with-a-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=60
APP_ENV=development
CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
```

For production, set `APP_ENV=production`, use a strong unique `SECRET_KEY`, and run Alembic migrations before starting the app.

## Run

```powershell
cd backend
venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API docs:

```text
http://127.0.0.1:8000/docs
```

## Migrations

Alembic is configured for production-safe schema changes.

Create a migration after model changes:

```powershell
cd backend
venv\Scripts\python.exe -m alembic revision --autogenerate -m "describe change"
```

Apply migrations:

```powershell
cd backend
venv\Scripts\python.exe -m alembic upgrade head
```

## Phase 1 Endpoints

```text
POST   /auth/register
POST   /auth/login
GET    /auth/profile

POST   /patients
GET    /patients
GET    /patients/{id}
PUT    /patients/{id}
DELETE /patients/{id}

POST   /doctors
GET    /doctors
GET    /doctors/{id}
PUT    /doctors/{id}
DELETE /doctors/{id}

POST   /appointments
GET    /appointments
GET    /appointments/{id}
PUT    /appointments/{id}
DELETE /appointments/{id}

GET    /dashboard/stats
```

## Phase 3 Endpoints

```text
POST   /medicines
GET    /medicines
GET    /medicines/{id}
PUT    /medicines/{id}
DELETE /medicines/{id}

POST   /medicine-sales
GET    /medicine-sales
GET    /medicine-sales/{id}

GET    /inventory/logs
POST   /inventory/logs
GET    /inventory/low-stock

POST   /staff
GET    /staff
GET    /staff/{id}
PUT    /staff/{id}
DELETE /staff/{id}

POST   /payroll/generate
GET    /payroll
GET    /payroll/{id}

GET    /reports/revenue
GET    /reports/patient-summary
GET    /reports/doctor-performance
GET    /reports/inventory-report

GET    /audit-logs
GET    /ai/patient-risk
GET    /ai/recommendation
```

Example register payload:

```json
{
  "full_name": "Admin User",
  "email": "admin@example.com",
  "password": "password123",
  "role": "admin"
}
```

Example login payload:

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```
