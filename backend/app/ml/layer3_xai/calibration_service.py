import numpy as np
import pickle
from sklearn.isotonic import IsotonicRegression
import os

class ConfidenceCalibrator:
    """
    Healthcare-Grade Confidence Calibration
    Converts raw, often overconfident Neural Network sigmoid outputs into 
    statistically reliable true probabilities using Isotonic Regression.
    """
    def __init__(self, save_path="app/ml/models/isotonic_calibrator.pkl"):
        self.calibrator = None
        self.save_path = save_path
        self._load_if_exists()

    def _load_if_exists(self):
        if os.path.exists(self.save_path):
            with open(self.save_path, 'rb') as f:
                self.calibrator = pickle.load(f)

    def fit(self, raw_predictions, true_labels):
        """
        Trains the Isotonic Regressor.
        MUST be called using a hold-out validation dataset (NOT the training data)
        so the calibrator learns the true distribution of errors.
        
        Args:
            raw_predictions: 1D array of PyTorch model outputs (e.g. from 0.0 to 1.0)
            true_labels: 1D array of actual ground truths (0 or 1)
        """
        # Isotonic regression requires 1D arrays
        raw_predictions = np.array(raw_predictions).flatten()
        true_labels = np.array(true_labels).flatten()
        
        # out_of_bounds='clip' ensures that if the model sees a probability 
        # higher or lower than anything in the validation set, it just clips it to [0, 1]
        self.calibrator = IsotonicRegression(out_of_bounds='clip')
        self.calibrator.fit(raw_predictions, true_labels)
        
        # Save the calibrator alongside the PyTorch weights
        os.makedirs(os.path.dirname(self.save_path), exist_ok=True)
        with open(self.save_path, 'wb') as f:
            pickle.dump(self.calibrator, f)
            
        print(f"✅ Calibration model fitted and saved to {self.save_path}")

    def calibrate(self, raw_prediction):
        """
        Used in the production POST /predict endpoint. 
        Converts the Fusion Layer's raw output into a trusted clinical probability.
        """
        if self.calibrator is None:
            # Fallback for development if the calibrator hasn't been trained yet
            print("[WARNING] Confidence Calibrator not trained. Returning raw uncalibrated PyTorch probability.")
            return raw_prediction
            
        # Ensure it's an iterable for sklearn
        is_scalar = np.isscalar(raw_prediction) or (isinstance(raw_prediction, np.ndarray) and raw_prediction.ndim == 0)
        
        if is_scalar:
            pred_array = np.array([raw_prediction])
        else:
            pred_array = np.array(raw_prediction).flatten()
            
        # Map the raw score to the true calibrated probability
        calibrated_prob = self.calibrator.predict(pred_array)
        
        if is_scalar:
            return float(calibrated_prob[0])
        return calibrated_prob.tolist()
