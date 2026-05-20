from decimal import Decimal

from pydantic import BaseModel


class RevenueReport(BaseModel):
    billing_revenue: Decimal
    pharmacy_revenue: Decimal
    total_revenue: Decimal
    paid_bills: int
    paid_medicine_sales: int


class PatientSummaryReport(BaseModel):
    total_patients: int
    total_appointments: int
    total_prescriptions: int
    total_lab_tests: int


class DoctorPerformanceReport(BaseModel):
    doctor_id: int
    doctor_name: str
    appointments: int
    prescriptions: int
    lab_tests: int


class InventoryReport(BaseModel):
    total_medicines: int
    low_stock_count: int
    expired_count: int
    inventory_value: Decimal


class PatientRiskInsight(BaseModel):
    patient_id: int
    patient_name: str
    risk_level: str
    risk_score: int
    reasons: list[str]


class Recommendation(BaseModel):
    title: str
    description: str
