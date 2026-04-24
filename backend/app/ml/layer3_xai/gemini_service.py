import google.generativeai as genai
from app.core.config import settings

# Configure Gemini with the API Key from settings
genai.configure(api_key=settings.GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

def generate_clinical_insight(
    final_risk_score: float, 
    base_model_predictions: dict, 
    explainability_attention: dict,
    feature_dependencies: dict
) -> str:
    """
    Takes the mathematical outputs from the Fusion Layer (Risk Score, Base Predictions, Attention Weights)
    and uses Gemini to translate it into a readable clinical insight.
    """
    
    # Format the data into a prompt
    prompt = f"""
    You are an AI assistant for an Oral Cancer Diagnostic tool.
    Translate the following machine learning model outputs into a short, easy-to-understand 
    clinical insight for a doctor. Do not be overly definitive (always recommend clinical correlation).
    Keep it under 4-5 sentences.

    --- DATA ---
    Final AI Fused Risk Score: {final_risk_score:.4f} (0.0 to 1.0 scale, >0.5 usually indicates higher risk)
    
    Base Model Predictions:
    {base_model_predictions}
    
    Transformer Attention Weights (How much the Fusion Layer trusted each model):
    {explainability_attention}
    
    Feature Dependencies (Which specific patient features drove each model's prediction):
    {feature_dependencies}
    ---
    
    Generate the clinical insight paragraph explaining what the final risk score means, why the fusion layer 
    chose that score based on the attention weights, and mention the specific features (dependencies) that drove 
    the models' decisions if available.
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"Could not generate AI insight due to an error: {str(e)}"
