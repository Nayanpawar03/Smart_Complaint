# -*- coding: utf-8 -*-
"""
ml_engine.py
------------
Production-ready multilingual complaint clustering engine.
Importable as a module; no code executes on import.
"""

# ================================================================
#  IMPORTS
# ================================================================

import os
import re
import json
import warnings

import numpy as np
import pandas as pd
from db import get_connection
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

warnings.filterwarnings("ignore")


# ================================================================
#  CONFIGURATION
# ================================================================

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"

DATASET_PATH       = "ML_Project_Complaint_Dataset_2000.csv"
CLUSTER_STORE_PATH = "v3_cluster_store.json"

BASE_CENTROID_THRESHOLD  = 0.56
BASE_NEIGHBOUR_THRESHOLD = 0.62

COMBINED_WEIGHT_CENTROID  = 0.40
COMBINED_WEIGHT_NEIGHBOUR = 0.60
COMBINED_THRESHOLD        = 0.61

ADAPTIVE_BOOST_PER_10    = 0.002

MERGE_CENTROID_THRESHOLD = 0.70
MERGE_EVERY_N            = 10

MAX_MEMBERS_STORED = 60


# ================================================================
#  MODEL LOADING
# ================================================================

model    = SentenceTransformer(MODEL_NAME)
EMBED_DIM = model.get_sentence_embedding_dimension()


# ================================================================
#  GLOBAL STATE  (loaded once at import time)
# ================================================================

df       = None   # populated by _ensure_loaded()
clusters = None   # populated by _ensure_loaded()


def _ensure_loaded():
    """Lazy-load dataset and cluster store into global state."""
    global df, clusters
    if df is None:
        df = load_dataset()
    if clusters is None:
        clusters = load_store()


# ================================================================
#  TEXT PREPROCESSING
# ================================================================

def clean_text(text: str) -> str:
    """
    Light normalisation:
      - lowercase
      - keep ASCII alphanumeric and Devanagari (Hindi script)
      - strip punctuation / special characters
      - collapse whitespace
    """
    text = str(text).lower()
    text = re.sub(r"[^\w\u0900-\u097F\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ================================================================
#  CLUSTER STORE FUNCTIONS
# ================================================================

def load_store(path: str = CLUSTER_STORE_PATH) -> list:
    """Load cluster store from JSON. Returns list of cluster dicts."""
    if not os.path.exists(path):
        return []
    with open(path) as f:
        raw = json.load(f)
    for c in raw:
        c["centroid"] = np.array(c["centroid"], dtype=np.float32)
        c["members"]  = [np.array(m, dtype=np.float32) for m in c["members"]]
    return raw


def save_store(clusters: list, path: str = CLUSTER_STORE_PATH) -> None:
    """Persist cluster store to JSON."""
    out = []
    for c in clusters:
        out.append({
            "cluster_id":   c["cluster_id"],
            "count":        c["count"],
            "centroid":     c["centroid"].tolist(),
            "members":      [m.tolist() for m in c["members"]],
            "sample_texts": c["sample_texts"],
            "complaints_since_last_merge": c.get("complaints_since_last_merge", 0),
            "category":     c["category"],
        })
    with open(path, "w") as f:
        json.dump(out, f)


def _next_id(clusters: list) -> int:
    return 1 if not clusters else max(c["cluster_id"] for c in clusters) + 1


def _make_cluster(cid: int, emb: np.ndarray, text: str, category: str) -> dict:
    """Create a brand-new cluster from a single embedding."""
    return {
        "cluster_id":   cid,
        "count":        1,
        "category":     category,
        "centroid":     emb.astype(np.float32).copy(),
        "members":      [emb.astype(np.float32).copy()],
        "sample_texts": [text],
        "complaints_since_last_merge": 1,
    }


def _add_to_cluster(cluster: dict, emb: np.ndarray, text: str, new_category: str) -> bool:
    """
    Incrementally update a cluster with a new member (in-place).

    Uses Welford's online mean:
        new_mean = old_mean + (x - old_mean) / new_count

    Returns True if added, False if category mismatch.
    """
    if cluster["category"] != new_category:
        return False

    n     = cluster["count"] + 1
    emb_f = emb.astype(np.float32)

    cluster["centroid"] = cluster["centroid"] + (emb_f - cluster["centroid"]) / n
    cluster["count"]    = n
    cluster["complaints_since_last_merge"] = cluster.get("complaints_since_last_merge", 0) + 1

    cluster["members"].append(emb_f.copy())
    if len(cluster["members"]) > MAX_MEMBERS_STORED:
        cluster["members"].pop(0)

    cluster["sample_texts"].append(text)
    if len(cluster["sample_texts"]) > MAX_MEMBERS_STORED:
        cluster["sample_texts"].pop(0)

    return True


# ================================================================
#  SIMILARITY ENGINE
# ================================================================

def _adaptive_threshold(cluster_count: int) -> float:
    """Return combined-score threshold for a cluster of given size."""
    boost = (cluster_count // 10) * ADAPTIVE_BOOST_PER_10
    return COMBINED_THRESHOLD + boost


def find_best_cluster(
    emb: np.ndarray,
    clusters: list,
    input_category: str,
) -> tuple:
    """
    Two-stage cluster matching.

    Stage 1 — centroid pre-filter (O(k)).
    Stage 2 — neighbour confirmation (O(candidates × members)).

    Returns (best_index, combined_score, centroid_sim, neighbour_sim).
    Returns (-1, 0, 0, 0) when no suitable cluster is found.
    """
    if not clusters:
        return -1, 0.0, 0.0, 0.0

    emb_2d       = emb.reshape(1, -1)
    centroids    = np.stack([c["centroid"] for c in clusters])
    centroid_sims = cosine_similarity(emb_2d, centroids)[0]

    candidates = [
        i for i, sim in enumerate(centroid_sims)
        if sim >= BASE_CENTROID_THRESHOLD
    ]

    if not candidates:
        return -1, 0.0, float(np.max(centroid_sims)), 0.0

    best_idx      = -1
    best_combined = -1.0
    best_c_sim    = 0.0
    best_n_sim    = 0.0

    for i in candidates:
        if clusters[i]["category"] != input_category:
            continue

        c_sim = float(centroid_sims[i])

        members_matrix = np.stack(clusters[i]["members"])
        member_sims    = cosine_similarity(emb_2d, members_matrix)[0]
        n_sim          = float(np.max(member_sims))

        if n_sim < BASE_NEIGHBOUR_THRESHOLD:
            continue

        combined  = COMBINED_WEIGHT_CENTROID * c_sim + COMBINED_WEIGHT_NEIGHBOUR * n_sim
        threshold = _adaptive_threshold(clusters[i]["count"])

        if combined >= threshold and combined > best_combined:
            best_combined = combined
            best_idx      = i
            best_c_sim    = c_sim
            best_n_sim    = n_sim

    return best_idx, best_combined, best_c_sim, best_n_sim


# ================================================================
#  MERGE LOGIC
# ================================================================

def merge_similar_clusters(
    clusters: list,
    df: pd.DataFrame,
    threshold: float = MERGE_CENTROID_THRESHOLD,
) -> tuple:
    """
    Merge clusters using member-level similarity + category constraint.

    Only merges clusters that share the same category.

    Returns (clusters, df, n_merges).
    """
    n_merges   = 0
    merged_away = set()
    k           = len(clusters)

    for i in range(k):
        if clusters[i]["cluster_id"] in merged_away:
            continue

        for j in range(i + 1, k):
            if clusters[j]["cluster_id"] in merged_away:
                continue

            cat_i = clusters[i].get("category", "unknown")
            cat_j = clusters[j].get("category", "unknown")

            if cat_i != cat_j:
                continue

            members_i  = np.stack(clusters[i]["members"])
            members_j  = np.stack(clusters[j]["members"])
            sim_matrix = cosine_similarity(members_i, members_j)
            max_sim    = float(np.max(sim_matrix))
            avg_sim    = float(np.mean(sim_matrix))

            if max_sim < threshold and avg_sim < 0.55:
                continue

            if clusters[i]["count"] >= clusters[j]["count"]:
                survivor, victim = i, j
            else:
                survivor, victim = j, i

            n_s     = clusters[survivor]["count"]
            n_v     = clusters[victim]["count"]
            n_total = n_s + n_v

            clusters[survivor]["centroid"] = (
                clusters[survivor]["centroid"] * n_s +
                clusters[victim]["centroid"]   * n_v
            ) / n_total

            clusters[survivor]["count"] = n_total

            combined_members = clusters[survivor]["members"] + clusters[victim]["members"]
            clusters[survivor]["members"] = combined_members[-MAX_MEMBERS_STORED:]

            combined_texts = clusters[survivor]["sample_texts"] + clusters[victim]["sample_texts"]
            clusters[survivor]["sample_texts"] = combined_texts[-MAX_MEMBERS_STORED:]

            clusters[survivor]["category"] = cat_i
            clusters[survivor]["complaints_since_last_merge"] = 0

            victim_id   = clusters[victim]["cluster_id"]
            survivor_id = clusters[survivor]["cluster_id"]

            mask = df["cluster_id"] == victim_id
            df.loc[mask, "cluster_id"]    = survivor_id
            df.loc[mask, "cluster_count"] = n_total
            df.loc[df["cluster_id"] == survivor_id, "cluster_count"] = n_total

            merged_away.add(victim_id)
            n_merges += 1

    clusters = [c for c in clusters if c["cluster_id"] not in merged_away]
    return clusters, df, n_merges


def build_issue_groups(clusters: list, issue_threshold: float = 0.60) -> dict:
    """
    Second-layer clustering: groups clusters into higher-level issue groups.

    Returns a cluster_id → issue_id mapping.
    """
    if not clusters:
        return {}

    centroids  = np.stack([c["centroid"] for c in clusters])
    sim_matrix = cosine_similarity(centroids)

    n       = len(clusters)
    visited = [False] * n
    issue_map = {}
    issue_id  = 1

    for i in range(n):
        if visited[i]:
            continue

        queue     = [i]
        visited[i] = True

        while queue:
            current = queue.pop()
            cid     = clusters[current]["cluster_id"]
            issue_map[cid] = issue_id

            for j in range(n):
                if not visited[j] and sim_matrix[current, j] >= issue_threshold:
                    visited[j] = True
                    queue.append(j)

        issue_id += 1

    return issue_map


# ================================================================
#  DATASET I/O
# ================================================================

def load_dataset(path: str = DATASET_PATH) -> pd.DataFrame:
    conn = get_connection()
    df = pd.read_sql(
        "SELECT id, description AS complaint_text, cluster_id, cluster_count, department AS category FROM complaints",
        conn
    )
    conn.close()
    for col in ["cluster_id", "cluster_count", "issue_id"]:
        if col not in df.columns:
            df[col] = pd.NA
    return df



def save_dataset(df: pd.DataFrame, path: str = DATASET_PATH) -> None:
    if df.empty:
        return

    conn = get_connection()
    cur = conn.cursor()

    for _, row in df.iterrows():
        if pd.isna(row.get("cluster_id")):
            continue

        cluster_id = int(row["cluster_id"]) if pd.notna(row["cluster_id"]) else -1
        cluster_count = int(row["cluster_count"]) if pd.notna(row["cluster_count"]) else 0

        cur.execute(
            """UPDATE complaints 
               SET cluster_id = %s, cluster_count = %s
               WHERE description = %s""",
            (cluster_id, cluster_count, row.get("complaint_text", ""))
        )

    conn.commit()
    cur.close()
    conn.close()


def sync_counts(df: pd.DataFrame, clusters: list) -> pd.DataFrame:
    """Ensure every row's cluster_count matches the cluster's true count."""
    cid_to_count     = {c["cluster_id"]: c["count"] for c in clusters}
    df["cluster_count"] = df["cluster_id"].map(cid_to_count)
    return df


# ================================================================
#  BOOTSTRAP FUNCTION  (run manually, not on import)
# ================================================================

def bootstrap_dataset(
    dataset_path: str = DATASET_PATH,
    store_path: str   = CLUSTER_STORE_PATH,
) -> pd.DataFrame:
    """
    Assign cluster_id / cluster_count to all unassigned rows.
    Saves updated CSV and cluster store on completion.
    Call once after a reset; do not call on every import.
    """
    df         = load_dataset(dataset_path)
    unassigned = df[df["cluster_id"].isna()]

    if unassigned.empty:
        return df

    clusters   = load_store(store_path)
    texts      = unassigned["complaint_text"].fillna("").apply(clean_text).tolist()
    categories = unassigned["category"].tolist()

    embeddings = model.encode(
        texts,
        batch_size=64,
        show_progress_bar=True,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )

    assigned_ids    = []
    new_cluster_cnt = 0

    for emb, text, category in zip(embeddings, texts, categories):
        best_idx, combined, c_sim, n_sim = find_best_cluster(emb, clusters, category)

        if best_idx >= 0:
            added = _add_to_cluster(clusters[best_idx], emb, text, category)
            if added:
                cid = clusters[best_idx]["cluster_id"]
            else:
                cid = _next_id(clusters)
                clusters.append(_make_cluster(cid, emb, text, category))
                new_cluster_cnt += 1
        else:
            cid = _next_id(clusters)
            clusters.append(_make_cluster(cid, emb, text, category))
            new_cluster_cnt += 1

        assigned_ids.append(cid)

    df.loc[unassigned.index, "cluster_id"] = assigned_ids
    df = sync_counts(df, clusters)

    clusters, df, _ = merge_similar_clusters(clusters, df)
    df = sync_counts(df, clusters)

    save_dataset(df, dataset_path)
    save_store(clusters, store_path)

    return df


# ================================================================
#  MAIN FUNCTION — process_new_complaint()
# ================================================================

def process_new_complaint(
    new_text: str,
    new_category: str,
    dataset_path: str = DATASET_PATH,
    store_path: str   = CLUSTER_STORE_PATH,
) -> dict:
    """
    Process one new complaint end-to-end.

    Steps
    -----
    1. Load dataset + cluster store (global, loaded once)
    2. Clean and encode complaint
    3. Two-stage cluster matching
    4. Assign existing cluster OR create new one
    5. Append new row to DataFrame
    6. Sync cluster_count across all rows in cluster
    7. Optionally run cluster-merge every MERGE_EVERY_N complaints
    8. Save CSV + cluster store
    9. Return result dict

    Returns
    -------
    {
        "cluster_id":     int,
        "cluster_count":  int,
        "is_new_cluster": bool,
        "centroid_sim":   float,
        "neighbour_sim":  float,
        "combined_score": float,
        "cleaned_text":   str,
        "issue_id":       int,
        "category":       str,
    }
    """
    global df, clusters
    _ensure_loaded()

    # 2. Clean + encode
    cleaned = clean_text(new_text)
    emb     = model.encode(
        [cleaned],
        normalize_embeddings=True,
        convert_to_numpy=True,
    )[0]

    # 3 & 4. Match or create
    best_idx, combined, c_sim, n_sim = find_best_cluster(emb, clusters, new_category)
    is_new = False

    if best_idx >= 0:
        added = _add_to_cluster(clusters[best_idx], emb, cleaned, new_category)
        if added:
            cid = clusters[best_idx]["cluster_id"]
        else:
            cid = _next_id(clusters)
            clusters.append(_make_cluster(cid, emb, cleaned, new_category))
            is_new   = True
            combined = c_sim = n_sim = 0.0
    else:
        cid = _next_id(clusters)
        clusters.append(_make_cluster(cid, emb, cleaned, new_category))
        is_new   = True
        combined = c_sim = n_sim = 0.0

    final_count = next(c["count"] for c in clusters if c["cluster_id"] == cid)

    # 5. Append new row
    new_row = {col: pd.NA for col in df.columns}
    new_row["complaint_text"] = new_text
    new_row["cluster_id"]     = cid
    new_row["cluster_count"]  = final_count
    new_row["category"]       = new_category
    df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)

    # 6. Sync counts
    df = sync_counts(df, clusters)
    issue_map    = build_issue_groups(clusters)
    df["issue_id"] = df["cluster_id"].map(issue_map)

    # 7. Periodic merge
    total_since = sum(c.get("complaints_since_last_merge", 0) for c in clusters)
    if MERGE_EVERY_N > 0 and total_since >= MERGE_EVERY_N:
        clusters, df, n_merges = merge_similar_clusters(clusters, df)
        df = sync_counts(df, clusters)
        for c in clusters:
            c["complaints_since_last_merge"] = 0
        if n_merges:
            final_count = next(
                (c["count"] for c in clusters if c["cluster_id"] == cid),
                final_count,
            )

    # 8. Persist
    save_dataset(df, dataset_path)
    save_store(clusters, store_path)

    # 9. Return
    return {
        "cluster_id":     int(cid),
        "cluster_count":  int(final_count),
        "is_new_cluster": is_new,
        "centroid_sim":   round(c_sim, 4),
        "neighbour_sim":  round(n_sim, 4),
        "combined_score": round(combined, 4),
        "cleaned_text":   cleaned,
        "issue_id":       int(issue_map.get(cid, -1)),
        "category":       new_category,
    }


# ================================================================
#  UTILITY FUNCTIONS
# ================================================================

def run_manual_merge(
    dataset_path: str = DATASET_PATH,
    store_path: str   = CLUSTER_STORE_PATH,
    threshold: float  = MERGE_CENTROID_THRESHOLD,
) -> int:
    """Trigger a merge scan immediately without waiting for MERGE_EVERY_N."""
    df_local       = load_dataset(dataset_path)
    clusters_local = load_store(store_path)
    clusters_local, df_local, n_merges = merge_similar_clusters(
        clusters_local, df_local, threshold
    )
    df_local = sync_counts(df_local, clusters_local)
    save_dataset(df_local, dataset_path)
    save_store(clusters_local, store_path)
    return n_merges


def cluster_summary(dataset_path: str = DATASET_PATH, top_n: int = 20) -> pd.DataFrame:
    """Return a DataFrame summarising the largest clusters."""
    df_local = pd.read_csv(dataset_path)
    summary  = (
        df_local.groupby("cluster_id")
        .agg(size=("complaint_text", "count"), sample=("complaint_text", "first"))
        .sort_values("size", ascending=False)
        .head(top_n)
    )
    summary["sample"] = summary["sample"].str[:80]
    return summary


def show_cluster(
    cluster_id: int,
    dataset_path: str = DATASET_PATH,
    max_rows: int = 10,
) -> pd.DataFrame:
    """Return complaints belonging to a specific cluster."""
    df_local = pd.read_csv(dataset_path)
    rows     = df_local[df_local["cluster_id"] == cluster_id][
        ["complaint_text", "cluster_count"]
    ]
    return rows.head(max_rows)


def reset_clusters(
    dataset_path: str = DATASET_PATH,
    store_path: str   = CLUSTER_STORE_PATH,
) -> None:
    """Wipe cluster columns and store. Run bootstrap_dataset() after."""
    df_local = pd.read_csv(dataset_path)
    df_local.drop(columns=["cluster_id", "cluster_count"], errors="ignore", inplace=True)
    df_local.to_csv(dataset_path, index=False)
    if os.path.exists(store_path):
        os.remove(store_path)


# ================================================================
#  ENTRY POINT
# ================================================================

if __name__ == "__main__":
    print("ML Engine ready")
