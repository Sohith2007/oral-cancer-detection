import pickle
import joblib
import numpy as np
import torch
import torch.nn as nn
from joblib import Parallel, delayed
import os
from pathlib import Path

# Paths to models
BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = BASE_DIR / "ml" / "models"

# ==========================================
# 1. Attention / Transformer Fusion Layer
# ==========================================
class AttentionTransformerFusion(nn.Module):
    def __init__(self, num_models, hidden_dim=64, num_heads=4):
        super(AttentionTransformerFusion, self).__init__()
        self.num_models = num_models
        self.embedding = nn.Linear(1, hidden_dim)
        self.self_attn = nn.MultiheadAttention(embed_dim=hidden_dim, num_heads=num_heads, batch_first=True)
        self.fc_out = nn.Sequential(
            nn.Linear(hidden_dim * num_models, 32),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        batch_size = x.size(0)
        x = x.unsqueeze(-1)
        x = self.embedding(x)
        attn_out, attn_weights = self.self_attn(x, x, x, need_weights=True)
        attn_out = attn_out.reshape(batch_size, -1)
        out = self.fc_out(attn_out)
        importance_weights = attn_weights.mean(dim=1)
        return out, importance_weights

# ==========================================
# 2. Simultaneous Model Execution Pipeline
# ==========================================
class SimultaneousEnsemblePipeline:
    def __init__(self):
        self.models = []
        self.model_names = []
        
        # Look for models in the models directory
        model_paths = [
            MODELS_DIR / "best_oscc_model.pkl",
            MODELS_DIR / "final_genomic_model.pkl",
            MODELS_DIR / "lightgbm_oral_cancer_model.pkl",
            MODELS_DIR / "oral_cancer_svm_model.joblib"
        ]
        
        for path in model_paths:
            try:
                if path.exists():
                    if path.suffix == '.joblib':
                        self.models.append(joblib.load(path))
                        self.model_names.append(path.name)
                    else:
                        with open(path, 'rb') as f:
                            self.models.append(pickle.load(f))
                            self.model_names.append(path.name)
            except Exception as e:
                print(f"[ERROR] Failed to load {path}: {e}")
                
        selector_path = MODELS_DIR / "feature_selector.pkl"
        self.feature_selector = None
        if selector_path.exists():
            try:
                with open(selector_path, 'rb') as f:
                    self.feature_selector = pickle.load(f)
            except Exception as e:
                print(f"[ERROR] Failed to load feature selector {selector_path}: {e}")
                
        # Initialize Fusion Layer
        self.fusion_layer = AttentionTransformerFusion(num_models=len(self.models))
        
    def _predict_single_model(self, model, X):
        if hasattr(model, 'n_features_in_') and X.shape[1] > model.n_features_in_:
            X_model = X[:, :model.n_features_in_]
        elif hasattr(model, 'feature_name_') and X.shape[1] > len(model.feature_name_):
             X_model = X[:, :len(model.feature_name_)]
        else:
            X_model = X
            
        if hasattr(model, "predict_proba"):
            return model.predict_proba(X_model)[:, 1]
        elif hasattr(model, "predict"):
            return model.predict(X_model)
        else:
            raise ValueError(f"Model {type(model)} does not have predict_proba or predict methods.")

    def _explain_single_model(self, model, X_sample):
        """Attempts to explain which features contributed most to the model's decision for this sample."""
        try:
            # If the model has feature importances (e.g., XGBoost, LightGBM)
            if hasattr(model, "feature_importances_"):
                importances = model.feature_importances_
                
                # Check feature count
                if hasattr(model, 'n_features_in_') and X_sample.shape[1] > model.n_features_in_:
                    x_adj = X_sample[:, :model.n_features_in_]
                elif hasattr(model, 'feature_name_') and X_sample.shape[1] > len(model.feature_name_):
                     x_adj = X_sample[:, :len(model.feature_name_)]
                else:
                    x_adj = X_sample
                    
                # Naive Local Importance: Global Importance * Local Feature Value
                local_contributions = importances * x_adj[0]
                
                # Get top 3 indices
                top_indices = np.argsort(local_contributions)[-3:][::-1]
                
                # Get names if available
                names = getattr(model, "feature_names_in_", None)
                if not names and hasattr(model, "feature_name_"):
                    names = model.feature_name_
                    
                explanation = []
                for idx in top_indices:
                    name = names[idx] if names is not None else f"Feature_{idx}"
                    explanation.append(f"{name} (Contribution Score: {local_contributions[idx]:.4f})")
                
                return ", ".join(explanation)
            else:
                return "Black-box model (No intrinsic feature importances available)"
        except Exception:
            return "Explanation generation failed for this model"

    def predict_simultaneously(self, X_raw):
        # Convert to numpy array if it is a list
        if isinstance(X_raw, list):
            X_raw = np.array(X_raw)
            if len(X_raw.shape) == 1:
                X_raw = X_raw.reshape(1, -1)
                
        if self.feature_selector is not None:
            X = self.feature_selector.transform(X_raw)
        else:
            X = X_raw
            
        predictions = Parallel(n_jobs=len(self.models), prefer="threads")(
            delayed(self._predict_single_model)(model, X) for model in self.models
        )
        
        # Calculate explanations synchronously (could be parallelized but it's fast)
        explanations = []
        for model in self.models:
            explanations.append(self._explain_single_model(model, X))
                
        base_preds = np.column_stack(predictions)
        tensor_preds = torch.tensor(base_preds.tolist(), dtype=torch.float32)
        
        self.fusion_layer.eval() 
        with torch.no_grad():
            final_output, attention_weights = self.fusion_layer(tensor_preds)
            
        return (
            np.array(final_output.tolist()), 
            base_preds, 
            np.array(attention_weights.tolist()),
            explanations
        )

# Create a singleton instance to be used by the FastAPI router
pipeline_instance = SimultaneousEnsemblePipeline()
