from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.billing import Bill, PaymentStatus
from app.models.doctor import Doctor
from app.models.lab_test import LabTest
from app.models.patient import Patient
from app.models.pharmacy import Medicine, MedicineSale
from app.models.prescription import Prescription


def decimal_value(value) -> Decimal:
    return Decimal(str(value or 0))


def revenue_report(db: Session) -> dict:
    billing_revenue = db.scalar(select(func.coalesce(func.sum(Bill.total_amount), 0)).where(Bill.payment_status == PaymentStatus.paid))
    pharmacy_revenue = db.scalar(select(func.coalesce(func.sum(MedicineSale.total_amount), 0)).where(MedicineSale.payment_status == PaymentStatus.paid))
    paid_bills = db.scalar(select(func.count(Bill.id)).where(Bill.payment_status == PaymentStatus.paid))
    paid_sales = db.scalar(select(func.count(MedicineSale.id)).where(MedicineSale.payment_status == PaymentStatus.paid))
    billing = decimal_value(billing_revenue)
    pharmacy = decimal_value(pharmacy_revenue)
    return {
        "billing_revenue": billing,
        "pharmacy_revenue": pharmacy,
        "total_revenue": billing + pharmacy,
        "paid_bills": paid_bills or 0,
        "paid_medicine_sales": paid_sales or 0,
    }


def patient_summary_report(db: Session) -> dict:
    return {
        "total_patients": db.scalar(select(func.count(Patient.id))) or 0,
        "total_appointments": db.scalar(select(func.count(Appointment.id))) or 0,
        "total_prescriptions": db.scalar(select(func.count(Prescription.id))) or 0,
        "total_lab_tests": db.scalar(select(func.count(LabTest.id))) or 0,
    }


def doctor_performance_report(db: Session) -> list[dict]:
    doctors = list(db.scalars(select(Doctor).order_by(Doctor.full_name.asc())))
    rows = []
    for doctor in doctors:
        rows.append({
            "doctor_id": doctor.id,
            "doctor_name": doctor.full_name,
            "appointments": db.scalar(select(func.count(Appointment.id)).where(Appointment.doctor_id == doctor.id)) or 0,
            "prescriptions": db.scalar(select(func.count(Prescription.id)).where(Prescription.doctor_id == doctor.id)) or 0,
            "lab_tests": db.scalar(select(func.count(LabTest.id)).where(LabTest.doctor_id == doctor.id)) or 0,
        })
    return rows


def inventory_report(db: Session, threshold: int = 10) -> dict:
    today = date.today()
    inventory_value = db.scalar(select(func.coalesce(func.sum(Medicine.stock_quantity * Medicine.unit_price), 0)))
    return {
        "total_medicines": db.scalar(select(func.count(Medicine.id))) or 0,
        "low_stock_count": db.scalar(select(func.count(Medicine.id)).where(Medicine.stock_quantity <= threshold)) or 0,
        "expired_count": db.scalar(select(func.count(Medicine.id)).where(Medicine.expiry_date < today)) or 0,
        "inventory_value": decimal_value(inventory_value),
    }
