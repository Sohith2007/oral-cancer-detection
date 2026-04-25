from typing import Any, Dict, Optional

import google.generativeai as genai

from app.core.config import settings


def _get_model():
    if not settings.GEMINI_API_KEY:
        return None

    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel("gemini-1.5-flash")


def _build_local_clinical_summary(
    final_risk_score: float,
    base_model_predictions: dict,
    explainability_attention: dict,
    feature_dependencies: dict,
    previous_prediction: Optional[Dict[str, Any]] = None,
) -> str:
    risk_band = "higher-risk" if final_risk_score >= 0.5 else "lower-risk"
    lead_model = max(explainability_attention, key=explainability_attention.get) if explainability_attention else "ensemble"
    dependency_summary = feature_dependencies.get(lead_model, "No model-specific explanation available.")
    summary = (
        f"The fused model output is {final_risk_score:.2f}, which falls in the {risk_band} range. "
        f"The strongest contributing branch was {lead_model}, and the reported factors were: {dependency_summary}. "
        "This explanation was generated locally because the external clinical-summary model is unavailable."
    )

    if previous_prediction:
        previous_score = previous_prediction.get("final_risk_score")
        if previous_score is not None:
            previous_score = float(previous_score)
            delta = final_risk_score - previous_score
            trend = "increased" if delta > 0.02 else "decreased" if delta < -0.02 else "remained stable"
            summary = (
                f"Progress: The fused score {trend} compared with the matched prior result "
                f"({previous_score:.2f} to {final_risk_score:.2f}). "
                f"Current Assessment: The current output remains in the {risk_band} range. "
                f"Reasoning: {dependency_summary}"
            )

    return summary


def generate_clinical_insight(
    final_risk_score: float,
    base_model_predictions: dict,
    explainability_attention: dict,
    feature_dependencies: dict,
    previous_prediction: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Translate machine-learning outputs into a clinician-friendly summary.
    Falls back to a local deterministic summary when Gemini is not configured.
    """

    comparison_block = ""
    response_format = "Return a single concise clinical paragraph."

    if previous_prediction:
        comparison_block = f"""
    --- PREVIOUS MATCHED PREDICTION FOR SAME USER + SAME INPUT ---
    Previous Final Risk Score: {previous_prediction.get('final_risk_score')}
    Previous Base Model Predictions: {previous_prediction.get('base_model_predictions')}
    Previous Attention Weights: {previous_prediction.get('explainability_attention')}
    Previous Feature Dependencies: {previous_prediction.get('feature_dependencies')}
    Previous Clinical Insight: {previous_prediction.get('clinical_insight')}
    Previous Created At: {previous_prediction.get('created_at')}
    ---
        """
        response_format = (
            "Return 3 short sections with headings: Progress, Current Assessment, Reasoning. "
            "In Progress, compare previous and current outputs; in Reasoning, explain why any changes occurred or why they remained stable."
        )

    prompt = f"""
    You are an AI assistant for an Oral Cancer Diagnostic tool.
    Translate the following machine learning outputs into an easy-to-understand clinical summary.
    Do not be overly definitive (always recommend clinical correlation).

    --- DATA ---
    Final AI Fused Risk Score: {final_risk_score:.4f} (0.0 to 1.0 scale, >0.5 usually indicates higher risk)

    Base Model Predictions:
    {base_model_predictions}

    Transformer Attention Weights (How much the Fusion Layer trusted each model):
    {explainability_attention}

    Feature Dependencies (Which specific patient features drove each model's prediction):
    {feature_dependencies}
    ---
    {comparison_block}

    {response_format}
    """

    model = _get_model()
    if model is None:
        return _build_local_clinical_summary(
            final_risk_score,
            base_model_predictions,
            explainability_attention,
            feature_dependencies,
            previous_prediction,
        )

    try:
        response = model.generate_content(prompt)
        text = getattr(response, "text", "").strip()
        if text:
            return text
    except Exception as exc:
        print(f"[Gemini Warning] Falling back to local summary: {exc}")

    return _build_local_clinical_summary(
        final_risk_score,
        base_model_predictions,
        explainability_attention,
        feature_dependencies,
        previous_prediction,
    )
