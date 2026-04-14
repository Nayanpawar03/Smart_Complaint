from fastapi import FastAPI
from schemas import ComplaintRequest, PredictionResponse
from predictor import category_client, urgency_bundle, get_category, get_cluster, get_urgency


app = FastAPI(title="Smart Complaint ML Service")

@app.get("/")
def health_check():
    return {"status": "ML service is running"}

@app.post("/predict", response_model=PredictionResponse)
def predict(request: ComplaintRequest):
    category = get_category(request.complaint_text)
    cluster = get_cluster(request.complaint_text, category)
    urgency = get_urgency(
        request.complaint_text,
        category,
        request.duration,
        request.affected_count,
        cluster["cluster_count"]
    )
    return {
        "category": category,
        "cluster_id": cluster["cluster_id"],
        "cluster_count": cluster["cluster_count"],
        "urgency": urgency
    }


