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
```

## Run

```powershell
cd backend
venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API docs:

```text
http://127.0.0.1:8000/docs
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
