"""
Layer 3 – XAI Engine
Provides modality-specific explainability.

NOTE: heavy imports (cv2, shap, grad_cam) are lazy-loaded inside methods
so that importing this module does NOT crash on missing optional packages.
"""
import numpy as np
import torch


class XAIEngine:
    """
    Provides Grad-CAM heatmaps for image modalities and SHAP values for
    tabular/genomic modalities.  Heavy optional dependencies are imported
    lazily so the module can be imported even when those packages are absent.
    """

    # ── 1. Image modalities (Grad-CAM) ────────────────────────────────────────
    def generate_gradcam_heatmap(self, model, input_tensor, original_image, target_layer):
        """
        Generate a Grad-CAM heatmap overlaid on the original image.

        Args:
            model:          PyTorch CNN/ResNet model.
            input_tensor:   (1, C, H, W) tensor fed to the model.
            original_image: RGB image array (H, W, 3) normalised to [0, 1].
            target_layer:   Last conv layer (e.g. model.layer4[-1]).

        Returns:
            visualization: uint8 RGB array with heatmap overlay.
        """
        try:
            from pytorch_grad_cam import GradCAM
            from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
            from pytorch_grad_cam.utils.image import show_cam_on_image
        except ImportError:
            raise ImportError("pytorch-grad-cam is not installed. Run: pip install grad-cam")

        cam = GradCAM(model=model, target_layers=[target_layer])
        targets = [ClassifierOutputTarget(1)]  # class 1 = malignant
        grayscale_cam = cam(input_tensor=input_tensor, targets=targets)[0, :]

        if original_image.max() > 1.0:
            original_image = original_image / 255.0

        return show_cam_on_image(original_image, grayscale_cam, use_rgb=True)

    # ── 2. Tabular / genomic modalities (SHAP) ────────────────────────────────
    def generate_shap_values(self, model, patient_data, feature_names=None):
        """
        Compute SHAP values for Clinical or Genomic data.

        Args:
            model:          Trained sklearn-compatible model (LightGBM, SVM, …).
            patient_data:   1D feature array or DataFrame row for this patient.
            feature_names:  Column names; auto-detected if None.

        Returns:
            sorted_impacts: Dict of top-5 features and their ± SHAP contribution.
        """
        try:
            import shap
        except ImportError:
            raise ImportError("shap is not installed. Run: pip install shap")

        if hasattr(model, 'feature_importances_'):
            explainer = shap.TreeExplainer(model)
        else:
            explainer = shap.Explainer(model)

        shap_values = explainer(patient_data)
        values = shap_values.values[0] if hasattr(shap_values, 'values') else shap_values[0]

        if feature_names is None:
            feature_names = (
                model.feature_name_
                if hasattr(model, 'feature_name_')
                else [f"Feature_{i}" for i in range(len(values))]
            )

        impacts = {name: float(val) for name, val in zip(feature_names, values)}
        return dict(sorted(impacts.items(), key=lambda kv: abs(kv[1]), reverse=True)[:5])


class ConfidenceCalibrator:
    """
    Production-grade confidence calibration using a pre-fitted Isotonic
    Regression model (saved to disk by calibration_service.py).

    Falls back to a simple piecewise curve when no calibrator has been
    fitted yet (typical in early development / demo mode).
    """

    _CALIBRATOR_PATH = "app/ml/models/isotonic_calibrator.pkl"

    def __init__(self):
        self._iso = self._try_load()

    def _try_load(self):
        import os, pickle
        if os.path.exists(self._CALIBRATOR_PATH):
            try:
                with open(self._CALIBRATOR_PATH, "rb") as f:
                    return pickle.load(f)
            except Exception:
                pass
        return None

    def calibrate(self, raw_prob: float) -> float:
        """Map a raw model output (0–1) to a calibrated clinical confidence."""
        if self._iso is not None:
            arr = np.array([raw_prob])
            return float(np.clip(self._iso.predict(arr)[0], 0.0, 1.0))

        # Fallback: piecewise calibration curve (conservative for medical use)
        p = float(raw_prob)
        if p < 0.15:
            return p * 0.5          # very low → push further down
        elif p < 0.40:
            return p * 0.85         # below threshold → moderate suppression
        elif p < 0.60:
            return p                # borderline → keep as-is
        elif p < 0.80:
            return min(0.99, p + 0.05)   # likely positive → slight boost
        else:
            return min(0.99, p + 0.08)   # high confidence → stronger boost
