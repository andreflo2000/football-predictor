import numpy as np


class CalibratedXGB:
    """Wrapper XGBoost + calibrare isotonica manuala (compatibil sklearn nou)."""
    def __init__(self, model, calibrators, n_classes):
        self.model       = model
        self.calibrators = calibrators
        self.n_classes   = n_classes

    def predict_proba(self, X):
        raw = self.model.predict_proba(X)
        cal = np.column_stack([
            self.calibrators[i].predict(raw[:, i])
            for i in range(self.n_classes)
        ])
        cal = np.clip(cal, 1e-6, 1)
        cal = cal / cal.sum(axis=1, keepdims=True)
        return cal

    def predict(self, X):
        return self.predict_proba(X).argmax(axis=1)

    @property
    def feature_importances_(self):
        return self.model.feature_importances_
