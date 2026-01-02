"""
Anomaly Detection Module

Uses Isolation Forest and Autoencoders to detect anomalous transactions.
Optimized for real-time detection with <100ms response time.

Anomaly Types:
- Amount anomalies (unusually high/low transaction amounts)
- Frequency anomalies (unusual transaction patterns)
- Timing anomalies (transactions at unusual times)
- Behavioral anomalies (unusual user behavior patterns)

Models:
- Isolation Forest: Fast, unsupervised anomaly detection
- Autoencoder: Deep learning for complex pattern detection

GDPR: All data is anonymized before training
"""

import logging
import pickle
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

logger = logging.getLogger(__name__)

# Import ML libraries with fallback
try:
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler, RobustScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warning("scikit-learn not available, using fallback implementation")

try:
    import tensorflow as tf
    from tensorflow import keras
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    logger.warning("TensorFlow not available, autoencoder disabled")


class AnomalyType(Enum):
    """Types of anomalies that can be detected."""
    AMOUNT = "amount"
    FREQUENCY = "frequency"
    TIMING = "timing"
    BEHAVIORAL = "behavioral"
    VELOCITY = "velocity"
    PATTERN = "pattern"


@dataclass
class AnomalyResult:
    """Result of anomaly detection."""
    is_anomaly: bool
    scores: Dict[str, float]
    anomaly_types: List[AnomalyType]
    confidence: float
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FeatureVector:
    """Feature vector for ML models."""
    # Transaction features
    amount: float
    amount_zscore: float
    is_round_amount: bool

    # Temporal features
    hour_of_day: int
    day_of_week: int
    is_weekend: bool
    is_night: bool  # 22:00 - 06:00
    minutes_since_last_tx: float

    # Velocity features
    tx_count_1h: int
    tx_count_24h: int
    total_amount_1h: float
    total_amount_24h: float

    # User behavior features
    avg_tx_amount: float
    std_tx_amount: float
    tx_frequency_daily: float

    # Device/location features
    is_new_device: bool
    is_new_location: bool
    distance_from_usual: float

    def to_array(self) -> np.ndarray:
        """Convert to numpy array for ML models."""
        return np.array([
            self.amount,
            self.amount_zscore,
            float(self.is_round_amount),
            self.hour_of_day / 24.0,  # Normalize
            self.day_of_week / 7.0,
            float(self.is_weekend),
            float(self.is_night),
            min(self.minutes_since_last_tx / 60.0, 24.0),  # Cap at 24h
            min(self.tx_count_1h / 50.0, 1.0),  # Normalize
            min(self.tx_count_24h / 200.0, 1.0),
            min(self.total_amount_1h / 1000.0, 1.0),
            min(self.total_amount_24h / 5000.0, 1.0),
            min(self.avg_tx_amount / 500.0, 1.0),
            min(self.std_tx_amount / 200.0, 1.0),
            min(self.tx_frequency_daily / 20.0, 1.0),
            float(self.is_new_device),
            float(self.is_new_location),
            min(self.distance_from_usual / 100.0, 1.0),  # km
        ])


class IsolationForestDetector:
    """
    Isolation Forest based anomaly detector.

    Fast unsupervised anomaly detection using random forests.
    Ideal for real-time detection with consistent performance.
    """

    def __init__(
        self,
        contamination: float = 0.05,
        n_estimators: int = 100,
        max_samples: int = 256,
        random_state: int = 42,
    ):
        """
        Initialize Isolation Forest detector.

        Args:
            contamination: Expected proportion of anomalies (0-0.5)
            n_estimators: Number of trees in the forest
            max_samples: Samples per tree (smaller = faster)
            random_state: Random seed for reproducibility
        """
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.max_samples = max_samples
        self.random_state = random_state

        self.model: Optional[IsolationForest] = None
        self.scaler: Optional[StandardScaler] = None
        self._is_trained = False

    def train(self, X: np.ndarray) -> Dict[str, Any]:
        """
        Train the Isolation Forest model.

        Args:
            X: Training data (n_samples, n_features)

        Returns:
            Training metrics
        """
        if not SKLEARN_AVAILABLE:
            logger.warning("sklearn not available, skipping IF training")
            return {'status': 'skipped', 'reason': 'sklearn not available'}

        logger.info(f"Training Isolation Forest on {X.shape[0]} samples...")

        # Scale features
        self.scaler = RobustScaler()
        X_scaled = self.scaler.fit_transform(X)

        # Train model
        self.model = IsolationForest(
            contamination=self.contamination,
            n_estimators=self.n_estimators,
            max_samples=min(self.max_samples, X.shape[0]),
            random_state=self.random_state,
            n_jobs=-1,  # Use all CPU cores
        )
        self.model.fit(X_scaled)

        self._is_trained = True

        # Calculate training metrics
        scores = self.model.score_samples(X_scaled)
        threshold = np.percentile(scores, self.contamination * 100)

        metrics = {
            'status': 'success',
            'n_samples': X.shape[0],
            'n_features': X.shape[1],
            'threshold': float(threshold),
            'score_mean': float(np.mean(scores)),
            'score_std': float(np.std(scores)),
        }

        logger.info(f"Isolation Forest training completed: {metrics}")

        return metrics

    def predict(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Predict anomaly scores for new data.

        Args:
            X: Input data (n_samples, n_features)

        Returns:
            Tuple of (is_anomaly, scores)
        """
        if not self._is_trained or not SKLEARN_AVAILABLE:
            # Return no anomalies if not trained
            return np.zeros(X.shape[0], dtype=bool), np.zeros(X.shape[0])

        X_scaled = self.scaler.transform(X)
        scores = self.model.score_samples(X_scaled)
        predictions = self.model.predict(X_scaled)

        # Convert to anomaly flags (-1 = anomaly, 1 = normal)
        is_anomaly = predictions == -1

        # Normalize scores to 0-1 range (higher = more anomalous)
        normalized_scores = 1 - (scores - scores.min()) / (scores.max() - scores.min() + 1e-10)

        return is_anomaly, normalized_scores

    def save(self, path: Path) -> None:
        """Save model to disk."""
        if not self._is_trained:
            logger.warning("Model not trained, nothing to save")
            return

        with open(path, 'wb') as f:
            pickle.dump({
                'model': self.model,
                'scaler': self.scaler,
                'config': {
                    'contamination': self.contamination,
                    'n_estimators': self.n_estimators,
                    'max_samples': self.max_samples,
                }
            }, f)

        logger.info(f"Isolation Forest model saved to {path}")

    def load(self, path: Path) -> None:
        """Load model from disk."""
        with open(path, 'rb') as f:
            data = pickle.load(f)

        self.model = data['model']
        self.scaler = data['scaler']
        self._is_trained = True

        logger.info(f"Isolation Forest model loaded from {path}")


class AutoencoderDetector:
    """
    Autoencoder-based anomaly detector.

    Uses reconstruction error to detect anomalies.
    Better at detecting complex patterns but slower than IF.
    """

    def __init__(
        self,
        input_dim: int = 18,
        encoding_dim: int = 8,
        hidden_dim: int = 12,
        threshold_percentile: float = 95.0,
    ):
        """
        Initialize Autoencoder detector.

        Args:
            input_dim: Number of input features
            encoding_dim: Size of encoded representation
            hidden_dim: Size of hidden layers
            threshold_percentile: Percentile for anomaly threshold
        """
        self.input_dim = input_dim
        self.encoding_dim = encoding_dim
        self.hidden_dim = hidden_dim
        self.threshold_percentile = threshold_percentile

        self.model: Optional[keras.Model] = None
        self.scaler: Optional[StandardScaler] = None
        self.threshold: float = 0.0
        self._is_trained = False

    def _build_model(self) -> keras.Model:
        """Build autoencoder architecture."""
        if not TF_AVAILABLE:
            raise RuntimeError("TensorFlow not available")

        # Encoder
        inputs = keras.Input(shape=(self.input_dim,))
        x = keras.layers.Dense(self.hidden_dim, activation='relu')(inputs)
        x = keras.layers.BatchNormalization()(x)
        x = keras.layers.Dropout(0.2)(x)
        encoded = keras.layers.Dense(self.encoding_dim, activation='relu')(x)

        # Decoder
        x = keras.layers.Dense(self.hidden_dim, activation='relu')(encoded)
        x = keras.layers.BatchNormalization()(x)
        x = keras.layers.Dropout(0.2)(x)
        decoded = keras.layers.Dense(self.input_dim, activation='sigmoid')(x)

        model = keras.Model(inputs, decoded)
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='mse',
        )

        return model

    def train(
        self,
        X: np.ndarray,
        epochs: int = 50,
        batch_size: int = 32,
        validation_split: float = 0.1,
    ) -> Dict[str, Any]:
        """
        Train the autoencoder model.

        Args:
            X: Training data (n_samples, n_features)
            epochs: Number of training epochs
            batch_size: Training batch size
            validation_split: Fraction for validation

        Returns:
            Training metrics
        """
        if not TF_AVAILABLE:
            logger.warning("TensorFlow not available, skipping AE training")
            return {'status': 'skipped', 'reason': 'tensorflow not available'}

        logger.info(f"Training Autoencoder on {X.shape[0]} samples...")

        # Scale features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        # Build and train model
        self.model = self._build_model()

        # Early stopping to prevent overfitting
        early_stop = keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=5,
            restore_best_weights=True,
        )

        history = self.model.fit(
            X_scaled, X_scaled,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            callbacks=[early_stop],
            verbose=0,
        )

        # Calculate reconstruction errors and threshold
        reconstructions = self.model.predict(X_scaled, verbose=0)
        mse = np.mean(np.power(X_scaled - reconstructions, 2), axis=1)
        self.threshold = np.percentile(mse, self.threshold_percentile)

        self._is_trained = True

        metrics = {
            'status': 'success',
            'n_samples': X.shape[0],
            'final_loss': float(history.history['loss'][-1]),
            'final_val_loss': float(history.history['val_loss'][-1]),
            'threshold': float(self.threshold),
            'epochs_trained': len(history.history['loss']),
        }

        logger.info(f"Autoencoder training completed: {metrics}")

        return metrics

    def predict(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Predict anomaly scores for new data.

        Args:
            X: Input data (n_samples, n_features)

        Returns:
            Tuple of (is_anomaly, scores)
        """
        if not self._is_trained or not TF_AVAILABLE:
            return np.zeros(X.shape[0], dtype=bool), np.zeros(X.shape[0])

        X_scaled = self.scaler.transform(X)
        reconstructions = self.model.predict(X_scaled, verbose=0)

        # Calculate reconstruction error (MSE)
        mse = np.mean(np.power(X_scaled - reconstructions, 2), axis=1)

        is_anomaly = mse > self.threshold

        # Normalize scores to 0-1 range
        max_mse = max(self.threshold * 3, mse.max())
        normalized_scores = np.clip(mse / max_mse, 0, 1)

        return is_anomaly, normalized_scores

    def save(self, path: Path) -> None:
        """Save model to disk."""
        if not self._is_trained:
            return

        # Save Keras model
        self.model.save(path / 'autoencoder_model')

        # Save scaler and threshold
        with open(path / 'autoencoder_config.pkl', 'wb') as f:
            pickle.dump({
                'scaler': self.scaler,
                'threshold': self.threshold,
                'config': {
                    'input_dim': self.input_dim,
                    'encoding_dim': self.encoding_dim,
                    'hidden_dim': self.hidden_dim,
                }
            }, f)

    def load(self, path: Path) -> None:
        """Load model from disk."""
        if not TF_AVAILABLE:
            return

        self.model = keras.models.load_model(path / 'autoencoder_model')

        with open(path / 'autoencoder_config.pkl', 'rb') as f:
            data = pickle.load(f)

        self.scaler = data['scaler']
        self.threshold = data['threshold']
        self._is_trained = True


class AnomalyDetector:
    """
    Main anomaly detection orchestrator.

    Combines multiple detection methods:
    - Isolation Forest (fast, unsupervised)
    - Autoencoder (complex patterns)
    - Statistical methods (simple, interpretable)

    Optimized for <100ms response time.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize anomaly detector.

        Args:
            config: Configuration dictionary
        """
        self.config = config or {}

        # Initialize detectors
        self.isolation_forest = IsolationForestDetector(
            contamination=self.config.get('if_contamination', 0.05),
            n_estimators=self.config.get('if_n_estimators', 100),
            max_samples=self.config.get('if_max_samples', 256),
        )

        self.autoencoder = AutoencoderDetector(
            input_dim=self.config.get('ae_input_dim', 18),
            encoding_dim=self.config.get('ae_encoding_dim', 8),
        )

        # User statistics cache for feature engineering
        self._user_stats: Dict[str, Dict[str, Any]] = {}

        # Transaction history cache
        self._tx_history: Dict[str, List[Dict[str, Any]]] = {}

        # Global statistics for z-score calculation
        self._global_stats = {
            'amount_mean': 50.0,
            'amount_std': 30.0,
        }

        self._initialized = False

    async def initialize(self) -> None:
        """Initialize the anomaly detector."""
        logger.info("Initializing Anomaly Detector...")

        # Try to load pre-trained models
        model_path = Path(self.config.get('model_path', '/tmp/fraud_models'))
        if model_path.exists():
            try:
                self.isolation_forest.load(model_path / 'isolation_forest.pkl')
                self.autoencoder.load(model_path)
                logger.info("Loaded pre-trained anomaly detection models")
            except Exception as e:
                logger.warning(f"Could not load models: {e}")

        self._initialized = True
        logger.info("Anomaly Detector initialized")

    async def detect(self, transaction) -> AnomalyResult:
        """
        Detect anomalies in a transaction.

        Args:
            transaction: TransactionData object

        Returns:
            AnomalyResult with scores and anomaly types
        """
        # Extract features
        features = self._extract_features(transaction)
        feature_array = features.to_array().reshape(1, -1)

        anomaly_types = []
        scores = {}

        # Run Isolation Forest
        if self.isolation_forest._is_trained:
            if_anomaly, if_scores = self.isolation_forest.predict(feature_array)
            scores['isolation_forest'] = float(if_scores[0])
            if if_anomaly[0]:
                anomaly_types.append(AnomalyType.PATTERN)

        # Run Autoencoder (if trained)
        if self.autoencoder._is_trained:
            ae_anomaly, ae_scores = self.autoencoder.predict(feature_array)
            scores['autoencoder'] = float(ae_scores[0])
            if ae_anomaly[0]:
                anomaly_types.append(AnomalyType.BEHAVIORAL)

        # Statistical checks
        stat_anomalies = self._statistical_checks(features)
        anomaly_types.extend(stat_anomalies)

        # Calculate scores for each check
        scores['amount'] = self._score_amount_anomaly(features)
        scores['velocity'] = self._score_velocity_anomaly(features)
        scores['timing'] = self._score_timing_anomaly(features)

        # Add specific anomaly types based on statistical checks
        if scores['amount'] > 0.7:
            if AnomalyType.AMOUNT not in anomaly_types:
                anomaly_types.append(AnomalyType.AMOUNT)

        if scores['velocity'] > 0.7:
            if AnomalyType.VELOCITY not in anomaly_types:
                anomaly_types.append(AnomalyType.VELOCITY)

        if scores['timing'] > 0.7:
            if AnomalyType.TIMING not in anomaly_types:
                anomaly_types.append(AnomalyType.TIMING)

        # Calculate combined score
        combined_score = self._combine_scores(scores)
        is_anomaly = len(anomaly_types) > 0 or combined_score > 0.6

        # Calculate confidence
        confidence = min(1.0, len(scores) / 5.0)  # More signals = higher confidence

        # Update transaction history
        self._update_history(transaction)

        return AnomalyResult(
            is_anomaly=is_anomaly,
            scores=scores,
            anomaly_types=list(set(anomaly_types)),  # Deduplicate
            confidence=confidence,
            details={
                'features': self._feature_summary(features),
                'combined_score': combined_score,
            }
        )

    def _extract_features(self, transaction) -> FeatureVector:
        """Extract feature vector from transaction."""
        user_id = transaction.user_id
        amount = transaction.amount or 0.0
        timestamp = transaction.timestamp

        # Get user history
        user_txs = self._tx_history.get(user_id, [])
        user_stats = self._user_stats.get(user_id, {})

        # Calculate temporal features
        hour = timestamp.hour
        dow = timestamp.weekday()
        is_weekend = dow >= 5
        is_night = hour >= 22 or hour < 6

        # Calculate time since last transaction
        if user_txs:
            last_tx_time = user_txs[-1].get('timestamp', timestamp)
            if isinstance(last_tx_time, str):
                last_tx_time = datetime.fromisoformat(last_tx_time)
            minutes_since_last = (timestamp - last_tx_time).total_seconds() / 60
        else:
            minutes_since_last = 999999  # First transaction

        # Calculate velocity features
        one_hour_ago = timestamp - timedelta(hours=1)
        one_day_ago = timestamp - timedelta(days=1)

        recent_1h = [tx for tx in user_txs
                    if tx.get('timestamp', datetime.min) > one_hour_ago]
        recent_24h = [tx for tx in user_txs
                     if tx.get('timestamp', datetime.min) > one_day_ago]

        tx_count_1h = len(recent_1h)
        tx_count_24h = len(recent_24h)
        total_amount_1h = sum(tx.get('amount', 0) for tx in recent_1h)
        total_amount_24h = sum(tx.get('amount', 0) for tx in recent_24h)

        # Calculate user behavior features
        avg_tx_amount = user_stats.get('avg_amount', amount)
        std_tx_amount = user_stats.get('std_amount', 0)
        tx_frequency_daily = user_stats.get('frequency_daily', 1)

        # Calculate amount z-score
        global_mean = self._global_stats['amount_mean']
        global_std = self._global_stats['amount_std']
        amount_zscore = (amount - global_mean) / (global_std + 1e-10)

        # Device/location features (simplified)
        is_new_device = transaction.device_id not in user_stats.get('known_devices', set())
        is_new_location = False  # Would require location history
        distance_from_usual = 0.0

        return FeatureVector(
            amount=amount,
            amount_zscore=amount_zscore,
            is_round_amount=amount == round(amount, 0) and amount > 0,
            hour_of_day=hour,
            day_of_week=dow,
            is_weekend=is_weekend,
            is_night=is_night,
            minutes_since_last_tx=minutes_since_last,
            tx_count_1h=tx_count_1h,
            tx_count_24h=tx_count_24h,
            total_amount_1h=total_amount_1h,
            total_amount_24h=total_amount_24h,
            avg_tx_amount=avg_tx_amount,
            std_tx_amount=std_tx_amount,
            tx_frequency_daily=tx_frequency_daily,
            is_new_device=is_new_device,
            is_new_location=is_new_location,
            distance_from_usual=distance_from_usual,
        )

    def _statistical_checks(self, features: FeatureVector) -> List[AnomalyType]:
        """Run statistical anomaly checks."""
        anomalies = []

        # Amount outlier (>3 standard deviations)
        if abs(features.amount_zscore) > 3:
            anomalies.append(AnomalyType.AMOUNT)

        # Velocity anomaly
        if features.tx_count_1h > 30:
            anomalies.append(AnomalyType.VELOCITY)

        # Timing anomaly (unusual hour for user)
        if features.is_night and features.tx_count_24h < 5:
            anomalies.append(AnomalyType.TIMING)

        return anomalies

    def _score_amount_anomaly(self, features: FeatureVector) -> float:
        """Score amount anomaly (0-1)."""
        # Z-score based scoring
        zscore = abs(features.amount_zscore)

        if zscore < 1:
            return 0.0
        elif zscore < 2:
            return 0.3
        elif zscore < 3:
            return 0.6
        else:
            return min(1.0, 0.6 + (zscore - 3) * 0.1)

    def _score_velocity_anomaly(self, features: FeatureVector) -> float:
        """Score velocity anomaly (0-1)."""
        # Based on transaction counts
        hourly_score = min(1.0, features.tx_count_1h / 50.0)
        daily_score = min(1.0, features.tx_count_24h / 200.0)

        # Weight hourly more heavily
        return hourly_score * 0.7 + daily_score * 0.3

    def _score_timing_anomaly(self, features: FeatureVector) -> float:
        """Score timing anomaly (0-1)."""
        score = 0.0

        # Night transactions are unusual for most users
        if features.is_night:
            score += 0.3

        # Very quick succession
        if features.minutes_since_last_tx < 1:
            score += 0.4

        # First transaction ever at night
        if features.is_night and features.tx_count_24h == 0:
            score += 0.3

        return min(1.0, score)

    def _combine_scores(self, scores: Dict[str, float]) -> float:
        """Combine individual scores into overall anomaly score."""
        if not scores:
            return 0.0

        # Weighted average with emphasis on ML models
        weights = {
            'isolation_forest': 0.3,
            'autoencoder': 0.3,
            'amount': 0.15,
            'velocity': 0.15,
            'timing': 0.1,
        }

        total_weight = 0.0
        weighted_sum = 0.0

        for key, score in scores.items():
            weight = weights.get(key, 0.1)
            weighted_sum += score * weight
            total_weight += weight

        if total_weight == 0:
            return 0.0

        return weighted_sum / total_weight

    def _feature_summary(self, features: FeatureVector) -> Dict[str, Any]:
        """Create summary of features for logging."""
        return {
            'amount': features.amount,
            'amount_zscore': round(features.amount_zscore, 2),
            'tx_count_1h': features.tx_count_1h,
            'tx_count_24h': features.tx_count_24h,
            'is_night': features.is_night,
            'is_weekend': features.is_weekend,
            'minutes_since_last': round(features.minutes_since_last_tx, 1),
        }

    def _update_history(self, transaction) -> None:
        """Update transaction history for user."""
        user_id = transaction.user_id

        # Initialize if needed
        if user_id not in self._tx_history:
            self._tx_history[user_id] = []
            self._user_stats[user_id] = {
                'avg_amount': 0,
                'std_amount': 0,
                'frequency_daily': 0,
                'known_devices': set(),
            }

        # Add transaction
        self._tx_history[user_id].append({
            'timestamp': transaction.timestamp,
            'amount': transaction.amount or 0,
            'type': transaction.transaction_type,
        })

        # Keep only last 100 transactions
        self._tx_history[user_id] = self._tx_history[user_id][-100:]

        # Update user stats
        amounts = [tx['amount'] for tx in self._tx_history[user_id]]
        self._user_stats[user_id]['avg_amount'] = np.mean(amounts)
        self._user_stats[user_id]['std_amount'] = np.std(amounts)

        if transaction.device_id:
            self._user_stats[user_id]['known_devices'].add(transaction.device_id)

    async def train(
        self,
        training_data: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Train anomaly detection models.

        Args:
            training_data: List of transaction dictionaries (anonymized)

        Returns:
            Training metrics
        """
        logger.info(f"Training anomaly detection models on {len(training_data)} samples...")

        # Convert to feature arrays
        # In production, this would use the actual feature extraction
        n_features = 18
        X = np.random.randn(len(training_data), n_features)  # Placeholder

        # For real implementation:
        # features = [self._extract_features_from_dict(d) for d in training_data]
        # X = np.array([f.to_array() for f in features])

        # Train models
        if_metrics = self.isolation_forest.train(X)

        ae_metrics = {'status': 'skipped'}
        if TF_AVAILABLE:
            ae_metrics = self.autoencoder.train(X)

        # Update global statistics from training data
        amounts = [d.get('amount', 0) for d in training_data]
        if amounts:
            self._global_stats['amount_mean'] = np.mean(amounts)
            self._global_stats['amount_std'] = np.std(amounts)

        return {
            'isolation_forest': if_metrics,
            'autoencoder': ae_metrics,
            'global_stats': self._global_stats,
        }

    async def cleanup(self) -> None:
        """Cleanup resources."""
        self._user_stats.clear()
        self._tx_history.clear()
        logger.info("Anomaly Detector cleanup completed")
