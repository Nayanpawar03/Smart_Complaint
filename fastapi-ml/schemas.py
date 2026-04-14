from pydantic import BaseModel

class ComplaintRequest(BaseModel):
    complaint_text: str
    duration: str
    affected_count: str

class PredictionResponse(BaseModel):
    category: str
    cluster_id: int
    cluster_count: int
    urgency: str
