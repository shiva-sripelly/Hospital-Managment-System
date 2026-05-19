from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MedicalRecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    file_name: str
    file_type: str
    file_path: str
    uploaded_by: int
    created_at: datetime
