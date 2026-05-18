from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.user import User
from app.schemas.dashboard import DashboardStats


def get_dashboard_stats(db: Session) -> DashboardStats:
    total_users = db.scalar(select(func.count()).select_from(User)) or 0
    active_users = db.scalar(select(func.count()).select_from(User).where(User.is_active.is_(True))) or 0
    total_patients = db.scalar(select(func.count()).select_from(Patient)) or 0
    total_doctors = db.scalar(select(func.count()).select_from(Doctor)) or 0
    total_appointments = db.scalar(select(func.count()).select_from(Appointment)) or 0
    scheduled_appointments = (
        db.scalar(
            select(func.count())
            .select_from(Appointment)
            .where(Appointment.status == AppointmentStatus.scheduled)
        )
        or 0
    )
    completed_appointments = (
        db.scalar(
            select(func.count())
            .select_from(Appointment)
            .where(Appointment.status == AppointmentStatus.completed)
        )
        or 0
    )
    cancelled_appointments = (
        db.scalar(
            select(func.count())
            .select_from(Appointment)
            .where(Appointment.status == AppointmentStatus.cancelled)
        )
        or 0
    )

    return DashboardStats(
        total_users=total_users,
        active_users=active_users,
        total_patients=total_patients,
        total_doctors=total_doctors,
        total_appointments=total_appointments,
        scheduled_appointments=scheduled_appointments,
        completed_appointments=completed_appointments,
        cancelled_appointments=cancelled_appointments,
    )
