"""
Gemini Clinical Insight Service
Uses google-genai (new SDK) with fallback to google-generativeai (old SDK).
All prompt data comes dynamically from the patient's analysis results.
"""
from app.core.config import settings

# ── SDK selection: prefer new google-genai, fall back to legacy ────────────────
_client = None
_model_name = "gemini-2.0-flash"

try:
    from google import genai as _genai_new
    _client = _genai_new.Client(api_key=settings.GEMINI_API_KEY)
    _USE_NEW_SDK = True
except Exception:
    try:
        import google.generativeai as _genai_old
        _genai_old.configure(api_key=settings.GEMINI_API_KEY)
        _legacy_model = _genai_old.GenerativeModel(_model_name)
        _USE_NEW_SDK = False
    except Exception:
        _legacy_model = None
        _USE_NEW_SDK = False


def generate_clinical_insight(
    final_risk_score: float,
    base_model_predictions: dict,
    explainability_attention: dict,
    feature_dependencies: dict,
) -> str:
    """
    Translates live ML outputs into a human-readable clinical insight.
    Every value in the prompt is derived dynamically from this patient's analysis.
    """
    # Active modalities (weight > 0) — fully dynamic
    active_modalities = [
        f"{mod} ({w}%)" for mod, w in explainability_attention.items() if w > 0
    ]
    modality_str = ", ".join(active_modalities) if active_modalities else "Clinical data only"

    # Top clinical drivers — fully dynamic from SHAP
    top_drivers = sorted(
        feature_dependencies.items(), key=lambda kv: abs(kv[1]), reverse=True
    )[:4]
    drivers_str = ", ".join(
        f"{k} ({v:+.1f})" for k, v in top_drivers
    ) if top_drivers else "No specific drivers identified"

    risk_pct = final_risk_score * 100
    risk_band = (
        "HIGH" if final_risk_score >= 0.70 else
        "MODERATE-HIGH" if final_risk_score >= 0.50 else
        "MODERATE" if final_risk_score >= 0.30 else
        "LOW"
    )

    # Build fully dynamic context from live model outputs
    model_scores_str = "\n".join(
        f"  • {k}: {v}" for k, v in base_model_predictions.items()
    )

    prompt = f"""You are a clinical AI assistant for an Oral Cancer Diagnostic Decision Support System.

The following are LIVE machine learning outputs for THIS SPECIFIC PATIENT. 
Translate them into a concise, factual 3-4 sentence clinical insight for the reviewing doctor.
Always recommend clinical correlation. Do NOT use generic statements.

--- PATIENT-SPECIFIC ANALYSIS RESULTS ---
Overall Calibrated Risk Score: {risk_pct:.1f}% ({risk_band} RISK)

Individual Model Scores:
{model_scores_str}

Active Data Modalities & Transformer Attention Weights:
  {modality_str}

Top Clinical/Visual Drivers (SHAP-style importance):
  {drivers_str}

Instructions:
- Reference the specific confidence percentage ({risk_pct:.1f}%)
- Mention which modalities were active (from attention weights above)  
- Name the specific top features that drove the prediction
- State clearly whether this warrants urgent referral or monitoring
- Keep under 4 sentences
---"""

    try:
        if _USE_NEW_SDK and _client is not None:
            response = _client.models.generate_content(
                model=_model_name,
                contents=prompt,
            )
            return response.text.strip()
        elif not _USE_NEW_SDK and _legacy_model is not None:
            response = _legacy_model.generate_content(prompt)
            return response.text.strip()
        else:
            return _local_fallback(risk_pct, risk_band, modality_str, drivers_str)
    except Exception as e:
        return _local_fallback(risk_pct, risk_band, modality_str, drivers_str, error=str(e))


def _local_fallback(risk_pct, risk_band, modalities, drivers, error=None) -> str:
    """
    Fully dynamic fallback summary generated from real analysis values
    when Gemini API is unavailable — zero hardcoded text.
    """
    err_note = f" (Gemini API unavailable: {error})" if error else ""
    return (
        f"AI analysis yielded a {risk_band} risk classification with a calibrated confidence "
        f"of {risk_pct:.1f}%{err_note}. "
        f"The fusion model weighted the following active modalities: {modalities}. "
        f"The primary drivers identified were: {drivers}. "
        f"Clinical correlation and physical examination are recommended before any diagnostic conclusion."
    )
