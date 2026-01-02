"""
Risk Scorer Module for Fraud Detection

Calculates composite risk scores from multiple signals:
- Anomaly detection scores
- Pattern recognition confidence
- Historical behavior
- Transaction context

Risk Levels:
- LOW (0-30): Normal transactions, no action needed
- MEDIUM (30-50): Slight anomalies, flag for review
- HIGH (50-75): Suspicious activity, require verification
- CRITICAL (75-100): Likely fraud, block transaction

Performance: <10ms for score calculation
"""

import logging
import pickle
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

logger = logging.getLogger(__name__)


class RiskLevel(str, Enum):
    """Risk level classifications"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskFactor(str, Enum):
    """Risk factors contributing to score"""
    ANOMALY_SCORE = "anomaly_score"
    PATTERN_MATCH = "pattern_match"
    VELOCITY = "velocity"
    AMOUNT = "amount"
    TIMING = "timing"
    DEVICE = "device"
    LOCATION = "location"
    ACCOUNT_AGE = "account_age"
    HISTORY = "history"
    MANUAL_FLAG = "manual_flag"


# Weight configuration for risk factors
DEFAULT_WEIGHTS: Dict[RiskFactor, float] = {
    RiskFactor.ANOMALY_SCORE: 0.25,
    RiskFactor.PATTERN_MATCH: 0.20,
    RiskFactor.VELOCITY: 0.15,
    RiskFactor.AMOUNT: 0.10,
    RiskFactor.TIMING: 0.05,
    RiskFactor.DEVICE: 0.10,
    RiskFactor.LOCATION: 0.05,
    RiskFactor.ACCOUNT_AGE: 0.05,
    RiskFactor.HISTORY: 0.05,
    RiskFactor.MANUAL_FLAG: 0.0,  # Override if present
}


@dataclass
class RiskScore:
    """Composite risk score result"""
    score: float  # 0-100
    level: RiskLevel
    confidence: float  # 0-1
    factors: Dict[RiskFactor, float]  # Individual factor scores
    explanation: str
    details: Dict[str, Any]


@dataclass
class UserRiskProfile:
    """User's historical risk profile"""
    user_id: str
    base_risk: float
    transaction_count: int
    fraud_count: int
    last_fraud_date: Optional[datetime]
    avg_transaction_amount: float
    std_transaction_amount: float
    typical_hours: List[int]
    typical_days: List[int]
    known_devices: List[str]
    known_locations: List[Tuple[float, float]]
    trust_score: float  # 0-1, higher = more trusted
    updated_at: datetime


class RiskScorer:
    """
    Main risk scoring engine.

    Combines multiple risk signals into a composite score.
    Supports calibration from historical fraud data.
    """

    # Risk level thresholds
    THRESHOLD_LOW = 30.0
    THRESHOLD_MEDIUM = 50.0
    THRESHOLD_HIGH = 75.0

    def __init__(
        self,
        config: Optional[Dict[str, Any]] = None,
    ):
        """
        Initialize risk scorer

        Args:
            config: Configuration dictionary with custom weights
        """
        self.config = config or {}

        # Initialize weights
        self.weights = DEFAULT_WEIGHTS.copy()
        if 'weights' in self.config:
            for factor_str, weight in self.config['weights'].items():
                try:
                    factor = RiskFactor(factor_str)
                    self.weights[factor] = weight
                except ValueError:
                    pass

        # Normalize weights
        total_weight = sum(self.weights.values())
        if total_weight > 0:
            self.weights = {k: v / total_weight for k, v in self.weights.items()}

        # User risk profiles cache
        self._user_profiles: Dict[str, UserRiskProfile] = {}

        # Calibration data
        self._calibration_params = {
            'score_shift': 0.0,
            'score_scale': 1.0,
        }

        self._initialized = False

    async def initialize(self) -> None:
        """Initialize risk scorer"""
        logger.info("Initializing Risk Scorer...")

        # Load calibration data if available
        calibration_path = Path(self.config.get('calibration_path', '/tmp/fraud_models/calibration.pkl'))
        if calibration_path.exists():
            try:
                with open(calibration_path, 'rb') as f:
                    self._calibration_params = pickle.load(f)
                logger.info("Loaded calibration parameters")
            except Exception as e:
                logger.warning(f"Could not load calibration: {e}")

        self._initialized = True
        logger.info("Risk Scorer initialized")

    async def calculate_score(
        self,
        data,  # TransactionData
        fraud_types: List,
        anomaly_scores: Dict[str, float],
        pattern_matches: List,
    ) -> RiskScore:
        """
        Calculate composite risk score

        Args:
            data: Transaction data
            fraud_types: Detected fraud types
            anomaly_scores: Scores from anomaly detection
            pattern_matches: Matched fraud patterns

        Returns:
            RiskScore with composite score and explanation
        """
        factors: Dict[RiskFactor, float] = {}

        # Calculate individual factor scores
        factors[RiskFactor.ANOMALY_SCORE] = self._score_anomaly(anomaly_scores)
        factors[RiskFactor.PATTERN_MATCH] = self._score_patterns(pattern_matches)
        factors[RiskFactor.VELOCITY] = self._score_velocity(data)
        factors[RiskFactor.AMOUNT] = self._score_amount(data)
        factors[RiskFactor.TIMING] = self._score_timing(data)
        factors[RiskFactor.DEVICE] = self._score_device(data)
        factors[RiskFactor.LOCATION] = self._score_location(data)
        factors[RiskFactor.ACCOUNT_AGE] = self._score_account_age(data)
        factors[RiskFactor.HISTORY] = await self._score_history(data)

        # Check for manual flags
        if hasattr(data, 'metadata') and data.metadata.get('flagged'):
            factors[RiskFactor.MANUAL_FLAG] = 100.0

        # Calculate weighted score
        raw_score = 0.0
        for factor, weight in self.weights.items():
            factor_score = factors.get(factor, 0.0)
            raw_score += factor_score * weight

        # Apply calibration
        calibrated_score = self._apply_calibration(raw_score)

        # Boost score if fraud types detected
        if fraud_types:
            boost = min(len(fraud_types) * 10, 30)
            calibrated_score = min(100, calibrated_score + boost)

        # Clamp to 0-100
        final_score = max(0, min(100, calibrated_score))

        # Determine risk level
        level = self._get_risk_level(final_score)

        # Calculate confidence
        confidence = self._calculate_confidence(factors, pattern_matches)

        # Generate explanation
        explanation = self._generate_explanation(factors, level, fraud_types)

        return RiskScore(
            score=final_score,
            level=level,
            confidence=confidence,
            factors=factors,
            explanation=explanation,
            details={
                'raw_score': raw_score,
                'fraud_types': [ft.value for ft in fraud_types] if fraud_types else [],
                'pattern_count': len(pattern_matches),
                'calibration_applied': self._calibration_params != {'score_shift': 0.0, 'score_scale': 1.0},
            },
        )

    def _score_anomaly(self, anomaly_scores: Dict[str, float]) -> float:
        """Score based on anomaly detection results"""
        if not anomaly_scores:
            return 0.0

        # Take max of available anomaly scores
        scores = []

        if 'isolation_forest' in anomaly_scores:
            scores.append(anomaly_scores['isolation_forest'] * 100)
        if 'autoencoder' in anomaly_scores:
            scores.append(anomaly_scores['autoencoder'] * 100)
        if 'amount' in anomaly_scores:
            scores.append(anomaly_scores['amount'] * 100)
        if 'velocity' in anomaly_scores:
            scores.append(anomaly_scores['velocity'] * 100)
        if 'timing' in anomaly_scores:
            scores.append(anomaly_scores['timing'] * 100)

        if not scores:
            return 0.0

        # Use weighted average with emphasis on max
        return 0.6 * max(scores) + 0.4 * np.mean(scores)

    def _score_patterns(self, patterns: List) -> float:
        """Score based on pattern matches"""
        if not patterns:
            return 0.0

        # Aggregate pattern confidences
        severity_weights = {
            'critical': 1.0,
            'high': 0.7,
            'medium': 0.4,
            'low': 0.2,
        }

        total_score = 0.0
        for pattern in patterns:
            severity = getattr(pattern, 'severity', 'medium')
            confidence = getattr(pattern, 'confidence', 0.5)
            weight = severity_weights.get(severity, 0.4)
            total_score += confidence * weight * 100

        # Cap at 100
        return min(100, total_score)

    def _score_velocity(self, data) -> float:
        """Score based on transaction velocity"""
        score = 0.0

        # Check metadata for velocity info
        if hasattr(data, 'metadata'):
            metadata = data.metadata

            tx_count_1h = metadata.get('tx_count_1h', 0)
            tx_count_5min = metadata.get('tx_count_5min', 0)

            # Penalize high velocity
            if tx_count_5min > 5:
                score += 50
            elif tx_count_5min > 3:
                score += 30

            if tx_count_1h > 20:
                score += 50
            elif tx_count_1h > 10:
                score += 25

        return min(100, score)

    def _score_amount(self, data) -> float:
        """Score based on transaction amount"""
        if not hasattr(data, 'amount') or data.amount is None:
            return 0.0

        amount = data.amount
        score = 0.0

        # Very high amounts are suspicious
        if amount > 1000:
            score = 80
        elif amount > 500:
            score = 50
        elif amount > 200:
            score = 20

        # Round amounts are slightly suspicious
        if amount == round(amount, 0) and amount > 50:
            score += 10

        return min(100, score)

    def _score_timing(self, data) -> float:
        """Score based on transaction timing"""
        hour = data.timestamp.hour
        dow = data.timestamp.weekday()

        score = 0.0

        # Night transactions (2-5 AM) are unusual
        if 2 <= hour <= 5:
            score += 50

        # Early morning (5-7 AM) slightly unusual
        elif 5 < hour < 7:
            score += 20

        return min(100, score)

    def _score_device(self, data) -> float:
        """Score based on device information"""
        score = 0.0

        if hasattr(data, 'metadata'):
            metadata = data.metadata

            # New device
            if metadata.get('is_new_device'):
                score += 30

            # Multiple users on device
            users_per_device = metadata.get('users_per_device', 1)
            if users_per_device > 3:
                score += 50
            elif users_per_device > 2:
                score += 25

        return min(100, score)

    def _score_location(self, data) -> float:
        """Score based on location"""
        score = 0.0

        if hasattr(data, 'metadata'):
            metadata = data.metadata

            # New location
            if metadata.get('is_new_location'):
                score += 20

            # Large distance from usual
            distance = metadata.get('distance_from_usual_km', 0)
            if distance > 500:
                score += 60
            elif distance > 100:
                score += 30

        return min(100, score)

    def _score_account_age(self, data) -> float:
        """Score based on account age"""
        score = 0.0

        if hasattr(data, 'metadata'):
            metadata = data.metadata

            account_age_hours = metadata.get('account_age_hours', 9999)

            # Very new accounts are risky
            if account_age_hours < 1:
                score = 80
            elif account_age_hours < 24:
                score = 50
            elif account_age_hours < 72:
                score = 25

        return min(100, score)

    async def _score_history(self, data) -> float:
        """Score based on user history"""
        score = 0.0

        user_id = data.user_id
        profile = self._user_profiles.get(user_id)

        if profile:
            # Previous fraud
            if profile.fraud_count > 0:
                score += 50

            # Recent fraud
            if profile.last_fraud_date:
                days_since = (datetime.utcnow() - profile.last_fraud_date).days
                if days_since < 30:
                    score += 30
                elif days_since < 90:
                    score += 15

            # Low trust score
            if profile.trust_score < 0.3:
                score += 30
            elif profile.trust_score < 0.5:
                score += 15

        return min(100, score)

    def _apply_calibration(self, raw_score: float) -> float:
        """Apply calibration to raw score"""
        shift = self._calibration_params.get('score_shift', 0.0)
        scale = self._calibration_params.get('score_scale', 1.0)

        return (raw_score + shift) * scale

    def _get_risk_level(self, score: float) -> RiskLevel:
        """Determine risk level from score"""
        if score >= self.THRESHOLD_HIGH:
            return RiskLevel.CRITICAL
        elif score >= self.THRESHOLD_MEDIUM:
            return RiskLevel.HIGH
        elif score >= self.THRESHOLD_LOW:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW

    def _calculate_confidence(
        self,
        factors: Dict[RiskFactor, float],
        patterns: List,
    ) -> float:
        """Calculate confidence in the risk score"""
        # More signals = higher confidence
        non_zero_factors = sum(1 for v in factors.values() if v > 0)
        pattern_count = len(patterns)

        base_confidence = 0.5

        # Boost from factors
        factor_boost = min(0.3, non_zero_factors * 0.05)

        # Boost from patterns
        pattern_boost = min(0.2, pattern_count * 0.1)

        return min(1.0, base_confidence + factor_boost + pattern_boost)

    def _generate_explanation(
        self,
        factors: Dict[RiskFactor, float],
        level: RiskLevel,
        fraud_types: List,
    ) -> str:
        """Generate human-readable explanation"""
        explanations = []

        # Top contributing factors
        sorted_factors = sorted(
            factors.items(),
            key=lambda x: x[1],
            reverse=True
        )

        for factor, score in sorted_factors[:3]:
            if score > 20:
                factor_name = factor.value.replace('_', ' ').title()
                explanations.append(f"{factor_name}: {score:.0f}")

        # Risk level explanation
        level_texts = {
            RiskLevel.LOW: "Transaction appears normal",
            RiskLevel.MEDIUM: "Some anomalies detected",
            RiskLevel.HIGH: "Suspicious activity detected",
            RiskLevel.CRITICAL: "High fraud probability",
        }

        level_text = level_texts.get(level, "")

        if explanations:
            return f"{level_text}. Contributing factors: {', '.join(explanations)}"
        else:
            return level_text

    def update_user_profile(
        self,
        user_id: str,
        profile: UserRiskProfile,
    ) -> None:
        """Update user risk profile"""
        self._user_profiles[user_id] = profile

    def get_user_profile(
        self,
        user_id: str,
    ) -> Optional[UserRiskProfile]:
        """Get user risk profile"""
        return self._user_profiles.get(user_id)

    async def calibrate(
        self,
        training_data: List[Dict[str, Any]],
        labels: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """
        Calibrate scoring based on historical data

        Args:
            training_data: Historical transaction data
            labels: Fraud labels (1 = fraud, 0 = legitimate)

        Returns:
            Calibration metrics
        """
        if labels is None or len(labels) == 0:
            return {'status': 'skipped', 'reason': 'no labels'}

        logger.info(f"Calibrating risk scorer on {len(training_data)} samples...")

        # Calculate scores for training data
        # This is simplified - real implementation would be more sophisticated
        fraud_indices = [i for i, l in enumerate(labels) if l == 1]
        legit_indices = [i for i, l in enumerate(labels) if l == 0]

        if len(fraud_indices) == 0 or len(legit_indices) == 0:
            return {'status': 'skipped', 'reason': 'insufficient label diversity'}

        # Placeholder calibration
        # In production, this would use isotonic regression or Platt scaling
        fraud_ratio = len(fraud_indices) / len(labels)

        # Adjust shift to account for class imbalance
        self._calibration_params['score_shift'] = (0.5 - fraud_ratio) * 20
        self._calibration_params['score_scale'] = 1.0

        # Save calibration
        calibration_path = Path(self.config.get('calibration_path', '/tmp/fraud_models'))
        calibration_path.mkdir(parents=True, exist_ok=True)

        with open(calibration_path / 'calibration.pkl', 'wb') as f:
            pickle.dump(self._calibration_params, f)

        metrics = {
            'status': 'success',
            'samples': len(training_data),
            'fraud_ratio': fraud_ratio,
            'calibration_params': self._calibration_params,
        }

        logger.info(f"Calibration completed: {metrics}")

        return metrics

    async def cleanup(self) -> None:
        """Cleanup resources"""
        self._user_profiles.clear()
        logger.info("Risk Scorer cleanup completed")


# Helper function to create user profile from database
def create_user_profile_from_db(
    user_data: Dict[str, Any],
    transaction_history: List[Dict[str, Any]],
) -> UserRiskProfile:
    """
    Create UserRiskProfile from database data

    Args:
        user_data: User record from database
        transaction_history: Recent transactions

    Returns:
        UserRiskProfile object
    """
    # Calculate statistics from transaction history
    amounts = [tx.get('amount', 0) for tx in transaction_history if tx.get('amount')]
    hours = [datetime.fromisoformat(tx['timestamp']).hour for tx in transaction_history if tx.get('timestamp')]
    days = [datetime.fromisoformat(tx['timestamp']).weekday() for tx in transaction_history if tx.get('timestamp')]

    # Get unique devices and locations
    devices = list(set(tx.get('device_id') for tx in transaction_history if tx.get('device_id')))
    locations = []
    for tx in transaction_history:
        if tx.get('latitude') and tx.get('longitude'):
            locations.append((tx['latitude'], tx['longitude']))
    locations = list(set(locations))

    # Calculate trust score based on account age and history
    account_age_days = (datetime.utcnow() - datetime.fromisoformat(user_data.get('created_at', datetime.utcnow().isoformat()))).days
    fraud_count = user_data.get('fraud_count', 0)

    trust_score = 0.5
    if account_age_days > 365:
        trust_score += 0.2
    elif account_age_days > 90:
        trust_score += 0.1
    elif account_age_days < 7:
        trust_score -= 0.2

    if fraud_count > 0:
        trust_score -= min(0.3, fraud_count * 0.1)

    trust_score = max(0.0, min(1.0, trust_score))

    return UserRiskProfile(
        user_id=user_data['id'],
        base_risk=user_data.get('base_risk', 0.0),
        transaction_count=len(transaction_history),
        fraud_count=fraud_count,
        last_fraud_date=datetime.fromisoformat(user_data['last_fraud_date']) if user_data.get('last_fraud_date') else None,
        avg_transaction_amount=np.mean(amounts) if amounts else 0.0,
        std_transaction_amount=np.std(amounts) if amounts else 0.0,
        typical_hours=list(set(hours))[:12],
        typical_days=list(set(days)),
        known_devices=devices[:10],
        known_locations=locations[:10],
        trust_score=trust_score,
        updated_at=datetime.utcnow(),
    )
