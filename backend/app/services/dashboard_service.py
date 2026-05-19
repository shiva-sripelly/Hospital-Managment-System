from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.appointment import Appointment, AppointmentStatus
from app.models.billing import Bill, PaymentStatus
from app.models.doctor import Doctor
from app.models.lab_test import LabTest, LabTestStatus
from app.models.medical_record import MedicalRecord
from app.models.notification import Notification
from app.models.patient import Patient
from app.models.prescription import Prescription
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
    total_bills = db.scalar(select(func.count()).select_from(Bill)) or 0
    total_revenue = db.scalar(select(func.coalesce(func.sum(Bill.total_amount), 0)).where(Bill.payment_status == PaymentStatus.paid)) or 0
    pending_bills = db.scalar(select(func.count()).select_from(Bill).where(Bill.payment_status == PaymentStatus.pending)) or 0
    total_prescriptions = db.scalar(select(func.count()).select_from(Prescription)) or 0
    total_lab_tests = db.scalar(select(func.count()).select_from(LabTest)) or 0
    completed_lab_tests = db.scalar(select(func.count()).select_from(LabTest).where(LabTest.test_status == LabTestStatus.completed)) or 0
    total_medical_records = db.scalar(select(func.count()).select_from(MedicalRecord)) or 0
    unread_notifications = db.scalar(select(func.count()).select_from(Notification).where(Notification.is_read.is_(False))) or 0

    return DashboardStats(
        total_users=total_users,
        active_users=active_users,
        total_patients=total_patients,
        total_doctors=total_doctors,
        total_appointments=total_appointments,
        scheduled_appointments=scheduled_appointments,
        completed_appointments=completed_appointments,
        cancelled_appointments=cancelled_appointments,
        total_bills=total_bills,
        total_revenue=float(total_revenue),
        pending_bills=pending_bills,
        total_prescriptions=total_prescriptions,
        total_lab_tests=total_lab_tests,
        completed_lab_tests=completed_lab_tests,
        total_medical_records=total_medical_records,
        unread_notifications=unread_notifications,
    )
