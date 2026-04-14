import joblib
import math
import pandas as pd
from gradio_client import Client
from ml_engine import process_new_complaint

# Category Model via Gradio Space
category_client = Client("Sheshank2609/Complaint_Classifier_Gradio_Space")

# Urgency Model (local pkl)
urgency_bundle = joblib.load("models/combined_urgency_model.pkl")
model = urgency_bundle["model"]
vectorizer = urgency_bundle["vectorizer"]
urgency_encoder = urgency_bundle["urgency_encoder"]
category_encoder = urgency_bundle["category_encoder"]


def get_category(complaint_text: str) -> str:
    result = category_client.predict(
        complaint_text=complaint_text,
        api_name="/predict_complaint_gradio"
    )
    # result is a tuple: ("Department: Academics", "Confidence: 54.45%")
    department = result[0].replace("Department: ", "").strip()
    return department


def get_cluster(complaint_text: str, category: str) -> dict:
    result = process_new_complaint(complaint_text, category)
    return {
        "cluster_id": result["cluster_id"],
        "cluster_count": result["cluster_count"]
    }

def encode_duration(x):
    x = str(x).lower()
    if "just" in x: return 0
    elif "hour" in x: return 1
    elif "1 day" in x: return 2
    elif "2" in x: return 3
    else: return 4

def encode_affected(x):
    x = str(x)
    if "only" in x.lower(): return 1
    elif "2-5" in x: return 3
    elif "5-20" in x: return 10
    elif "20+" in x: return 20
    else: return 1

CRITICAL_WORDS = ["ragging","harassment","abuse","molest","assault","fight","violence","bully","threat","ragging ho rha","bullying","maar peet","unsafe"]
HIGH_WORDS = ["not working","broken","electricity","power cut","water issue","leakage","fire","damage","server down","network down","internet down"]
MEDIUM_WORDS = ["wifi","slow","lag","delay","issue","bad service","dirty","cleanliness"]

def get_severity_score(text):
    if any(w in text for w in CRITICAL_WORDS): return 3 * 1.5
    elif any(w in text for w in HIGH_WORDS): return 2 * 1.5
    elif any(w in text for w in MEDIUM_WORDS): return 1 * 1.5
    else: return 0 * 1.5

def get_urgency(complaint_text, category, duration, affected_count, cluster_count):
    import math, numpy as np, scipy.sparse as sp

    text_features = vectorizer.transform([complaint_text])
    cat_encoded = category_encoder.transform([category])[0]
    dur_encoded = encode_duration(duration)
    aff_encoded = encode_affected(affected_count)
    cluster_log = math.log(cluster_count + 1)
    severity_score = get_severity_score(complaint_text.lower())

    numeric = np.array([[severity_score, cluster_log, dur_encoded, aff_encoded, cat_encoded]])
    X = sp.hstack([text_features, numeric])

    prediction = model.predict(X)
    return urgency_encoder.inverse_transform(prediction)[0]
