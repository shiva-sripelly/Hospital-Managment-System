from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.reports import PatientRiskInsight, Recommendation
from app.services.ai_service import patient_risk_insights, recommendations

router = APIRouter(prefix="/ai", tags=["AI Patient Insights"], dependencies=[Depends(get_current_user)])


@router.get("/patient-risk", response_model=list[PatientRiskInsight])
def read_patient_risk(patient_id: int | None = Query(None, ge=1), db: Session = Depends(get_db)) -> list[PatientRiskInsight]:
    return patient_risk_insights(db, patient_id=patient_id)


@router.get("/recommendation", response_model=list[Recommendation])
def read_recommendations(patient_id: int | None = Query(None, ge=1), db: Session = Depends(get_db)) -> list[Recommendation]:
    return recommendations(db, patient_id=patient_id)
