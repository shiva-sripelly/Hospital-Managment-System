from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.lab_test import LabTest
from app.models.patient import Patient
from app.models.prescription import Prescription


def patient_risk_insights(db: Session, patient_id: int | None = None) -> list[dict]:
    query = select(Patient)
    if patient_id is not None:
        query = query.where(Patient.id == patient_id)
    patients = list(db.scalars(query.order_by(Patient.full_name.asc()).limit(50)))
    since = date.today() - timedelta(days=90)
    insights = []

    for patient in patients:
        reasons = []
        score = 0
        appointments = db.scalar(
            select(func.count(Appointment.id)).where(
                Appointment.patient_id == patient.id,
                Appointment.appointment_date >= since,
            )
        ) or 0
        prescriptions = db.scalar(select(func.count(Prescription.id)).where(Prescription.patient_id == patient.id)) or 0
        lab_tests = db.scalar(select(func.count(LabTest.id)).where(LabTest.patient_id == patient.id)) or 0

        if appointments >= 4:
            score += 35
            reasons.append("Frequent visits in the last 90 days")
        if prescriptions >= 3:
            score += 25
            reasons.append("Multiple prescriptions recorded")
        if lab_tests >= 3:
            score += 20
            reasons.append("Repeated laboratory investigations")
        if patient.blood_group is None:
            score += 10
            reasons.append("Incomplete blood group information")
        if not reasons:
            reasons.append("No major risk signals from available records")

        risk_level = "low"
        if score >= 60:
            risk_level = "high"
        elif score >= 30:
            risk_level = "medium"

        insights.append({
            "patient_id": patient.id,
            "patient_name": patient.full_name,
            "risk_level": risk_level,
            "risk_score": min(score, 100),
            "reasons": reasons,
        })

    return insights


def recommendations(db: Session, patient_id: int | None = None) -> list[dict]:
    insights = patient_risk_insights(db, patient_id)
    if not insights:
        return [{"title": "No patient data", "description": "Add patient activity to generate recommendations."}]

    high_risk = [item for item in insights if item["risk_level"] == "high"]
    medium_risk = [item for item in insights if item["risk_level"] == "medium"]
    rows = []
    if high_risk:
        rows.append({
            "title": "Prioritize high-risk follow-ups",
            "description": f"{len(high_risk)} patient(s) show high risk signals based on visits, prescriptions, and lab activity.",
        })
    if medium_risk:
        rows.append({
            "title": "Review medium-risk patients",
            "description": f"{len(medium_risk)} patient(s) may benefit from routine review and updated vitals.",
        })
    rows.append({
        "title": "Keep medical profiles complete",
        "description": "Missing blood group or sparse clinical history lowers insight quality. Update records during visits.",
    })
    return rows
