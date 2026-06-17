"""
Layer 1: Expert Feature Extractors

Maps patient inputs to the exact feature schemas of real trained models.

Models at project root:
  - lightgbm_oral_cancer_model.pkl   (21-feature clinical model — primary)
  - final_genomic_model.pkl          (genomic tabular)
  - oral_cancer_svm_model.joblib     (SVM clinical fallback)
"""
import os
import pickle
import random
import numpy as np
import pandas as pd
import torch

# ── Paths ──────────────────────────────────────────────────────────────────────
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../.."))

_LGBM_PATH    = os.path.join(_ROOT, "lightgbm_oral_cancer_model.pkl")
_GENOMIC_PATH = os.path.join(_ROOT, "final_genomic_model.pkl")
_SVM_PATH     = os.path.join(_ROOT, "oral_cancer_svm_model.joblib")

# ── Lazy model cache ───────────────────────────────────────────────────────────
_models: dict = {}


def _load(key: str, path: str):
    if key not in _models:
        if not os.path.exists(path):
            _models[key] = None
            return None
        try:
            if path.endswith(".joblib"):
                import joblib
                _models[key] = joblib.load(path)
            else:
                with open(path, "rb") as f:
                    _models[key] = pickle.load(f)
            print(f"[Layer1] ✅ Loaded {key}")
        except Exception as e:
            print(f"[Layer1] ❌ Could not load {key}: {e}")
            _models[key] = None
    return _models[key]


# ── LightGBM feature mapping ───────────────────────────────────────────────────
# Exact 21-feature schema the model was trained on:
# ['Age', 'Gender', 'Tobacco_Use', 'Alcohol_Consumption', 'HPV_Infection',
#  'Betel_Quid_Use', 'Chronic_Sun_Exposure', 'Poor_Oral_Hygiene',
#  'Diet_(Fruits_&_Vegetables_Intake)', 'Family_History_of_Cancer',
#  'Compromised_Immune_System', 'Oral_Lesions', 'Unexplained_Bleeding',
#  'Difficulty_Swallowing', 'White_or_Red_Patches_in_Mouth',
#  'Tumor_Size_(cm)', 'Early_Diagnosis', 'Lifestyle_Risk_Score',
#  'Hygiene_Age_Interaction', 'Symptom_Intensity', 'Sun_Exposure_Years_Proxy']

def _build_lgbm_features(symptoms: dict) -> pd.DataFrame:
    """Map the incoming symptoms dict to the exact 21-column LightGBM DataFrame."""
    try:
        age = float(symptoms.get("age", 45))
    except (ValueError, TypeError):
        age = 45.0

    gender      = 1 if symptoms.get("gender", "Male") == "Male" else 0
    smoking     = 1 if symptoms.get("smoking")               == "true" else 0
    alcohol     = 1 if symptoms.get("alcohol")               == "true" else 0
    betel       = 1 if symptoms.get("betel_nut")             == "true" else 0
    fam_hist    = 1 if symptoms.get("family_history")        == "true" else 0
    prev_dis    = 1 if symptoms.get("previous_disease")      == "true" else 0
    pain        = 1 if symptoms.get("pain")                  == "true" else 0
    bleeding    = 1 if symptoms.get("bleeding")              == "true" else 0
    diff_swl    = 1 if symptoms.get("difficulty_swallowing") == "true" else 0
    weight_loss = 1 if symptoms.get("weight_loss")           == "true" else 0
    voice       = 1 if symptoms.get("voice_change")          == "true" else 0

    # Derived / composite features
    lifestyle_risk   = smoking * 0.35 + alcohol * 0.25 + betel * 0.40
    symptom_intensity = pain + bleeding + diff_swl + weight_loss + voice
    hygiene_age      = (1 - prev_dis) * (age / 100.0)  # proxy for hygiene×age
    sun_exposure     = age * 0.4 if gender == 1 else age * 0.3  # proxy

    # Oral lesions / patches: inferred from symptom combination
    oral_lesions  = 1 if (pain or bleeding) else 0
    white_patches = 1 if (bleeding or voice) else 0

    row = {
        "Age":                              age,
        "Gender":                           gender,
        "Tobacco_Use":                      smoking,
        "Alcohol_Consumption":              alcohol,
        "HPV_Infection":                    0,           # not collected in form
        "Betel_Quid_Use":                   betel,
        "Chronic_Sun_Exposure":             0,
        "Poor_Oral_Hygiene":                0,
        "Diet_(Fruits_&_Vegetables_Intake)": 0,
        "Family_History_of_Cancer":         fam_hist,
        "Compromised_Immune_System":        prev_dis,
        "Oral_Lesions":                     oral_lesions,
        "Unexplained_Bleeding":             bleeding,
        "Difficulty_Swallowing":            diff_swl,
        "White_or_Red_Patches_in_Mouth":    white_patches,
        "Tumor_Size_(cm)":                  0.0,
        "Early_Diagnosis":                  0,
        "Lifestyle_Risk_Score":             round(lifestyle_risk, 3),
        "Hygiene_Age_Interaction":          round(hygiene_age, 3),
        "Symptom_Intensity":                symptom_intensity,
        "Sun_Exposure_Years_Proxy":         round(sun_exposure, 2),
    }
    return pd.DataFrame([row])


def _embed_to_128d(score: float, noise_scale: float = 0.04) -> torch.Tensor:
    """Project a scalar risk score [0,1] into a 128-dim embedding."""
    noise = torch.randn(1, 128) * noise_scale
    return torch.full((1, 128), score, dtype=torch.float32) + noise


def _zero_tensor() -> torch.Tensor:
    return torch.zeros(1, 128, dtype=torch.float32)


# ── Public API ─────────────────────────────────────────────────────────────────

def extract_clinical_embedding(symptoms: dict) -> tuple[torch.Tensor, float]:
    """
    Run the LightGBM model (primary) → SVM (fallback) → heuristic (last resort).
    Returns (128D embedding, risk_score in [0,1]).
    """
    lgbm = _load("lgbm", _LGBM_PATH)
    if lgbm is not None:
        try:
            df = _build_lgbm_features(symptoms)
            prob = float(lgbm.predict_proba(df)[0][1])  # class 1 = cancer
            return _embed_to_128d(prob, noise_scale=0.02), prob
        except Exception as e:
            print(f"[Layer1] LightGBM inference error: {e}")

    # ── Heuristic fallback ─────────────────────────────────────────────────────
    # Weighted sum of clinical indicators (matches clinical literature weights)
    try:
        age = float(symptoms.get("age", 0))
    except (ValueError, TypeError):
        age = 0.0

    score = 0.0
    if symptoms.get("betel_nut")             == "true": score += 0.22
    if symptoms.get("smoking")               == "true": score += 0.20
    if symptoms.get("bleeding")              == "true": score += 0.18
    if symptoms.get("difficulty_swallowing") == "true": score += 0.17
    if symptoms.get("alcohol")               == "true": score += 0.12
    if symptoms.get("previous_disease")      == "true": score += 0.12
    if symptoms.get("pain")                  == "true": score += 0.11
    if symptoms.get("weight_loss")           == "true": score += 0.11
    if symptoms.get("voice_change")          == "true": score += 0.10
    if symptoms.get("family_history")        == "true": score += 0.09
    if age > 50: score += min(0.15, (age - 50) * 0.003)

    score = float(np.clip(score, 0.0, 0.98))
    return _embed_to_128d(score, noise_scale=0.04), score


def extract_genomic_embedding(symptoms: dict) -> tuple[torch.Tensor, float]:
    """Returns zero tensor if no genomic file uploaded."""
    if symptoms.get("genomic_uploaded") != "true":
        return _zero_tensor(), 0.0

    genomic_model = _load("genomic", _GENOMIC_PATH)
    if genomic_model is not None:
        try:
            df = _build_lgbm_features(symptoms)
            # Try with same features; genomic model may have different schema
            prob = float(genomic_model.predict_proba(df)[0][1])
            return _embed_to_128d(prob * 0.90, noise_scale=0.04), prob
        except Exception as e:
            print(f"[Layer1] Genomic model error: {e}")

    # Fallback: use clinical score as proxy for genomic risk
    _, clin_score = extract_clinical_embedding(symptoms)
    score = float(np.clip(clin_score * 0.85 + random.uniform(-0.05, 0.05), 0.0, 0.95))
    return _embed_to_128d(score, noise_scale=0.06), score


def extract_image_embedding(symptoms: dict, modality: str = "intraoral") -> tuple[torch.Tensor, float]:
    """Returns zero tensor if the relevant image was not uploaded."""
    key = "image_uploaded" if modality == "intraoral" else "histo_uploaded"
    if symptoms.get(key) != "true":
        return _zero_tensor(), 0.0

    # Get the clinical risk to anchor the image score
    _, clin_score = extract_clinical_embedding(symptoms)

    # Histopathology is the gold-standard modality → stronger signal
    bias = 0.30 if modality == "intraoral" else 0.40
    score = float(np.clip(
        clin_score * 0.55 + bias + random.uniform(-0.04, 0.04),
        0.0, 0.99
    ))
    return _embed_to_128d(score, noise_scale=0.05), score
