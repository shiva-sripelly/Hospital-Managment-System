from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_users: int
    active_users: int
    total_patients: int
    total_doctors: int
    total_appointments: int
    scheduled_appointments: int
    completed_appointments: int
    cancelled_appointments: int
    total_bills: int
    total_revenue: float
    pending_bills: int
    total_prescriptions: int
    total_lab_tests: int
    completed_lab_tests: int
    total_medical_records: int
    unread_notifications: int
