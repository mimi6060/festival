"""
Pattern Recognition Module for Fraud Detection

Uses Random Forest and rule-based methods to recognize fraud patterns.
Learns from historical fraud reports to improve detection.

Patterns Detected:
- Ticket resale patterns (bulk purchases, price markups)
- Device sharing patterns (multiple users, same device)
- Velocity patterns (too many transactions)
- Time-based patterns (unusual hours, burst activity)
- Geographic patterns (impossible travel)

Performance: <50ms for pattern matching
GDPR: All patterns are learned from anonymized data
"""

import logging
import pickle
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
import numpy as np

logger = logging.getLogger(__name__)

# Try to import ML libraries
try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warning("sklearn not available for pattern recognition")


class PatternType(str, Enum):
    """Types of fraud patterns"""
    TICKET_RESALE = "ticket_resale"
    BULK_PURCHASE = "bulk_purchase"
    DEVICE_SHARING = "device_sharing"
    RAPID_TRANSACTIONS = "rapid_transactions"
    UNUSUAL_HOURS = "unusual_hours"
    GEOGRAPHIC_ANOMALY = "geographic_anomaly"
    PRICE_MANIPULATION = "price_manipulation"
    COORDINATED_FRAUD = "coordinated_fraud"
    NEW_ACCOUNT_ABUSE = "new_account_abuse"
    REFUND_ABUSE = "refund_abuse"


# Import FraudType from fraud_detector to avoid circular import
class FraudType(Enum):
    """Types of fraud that can be detected."""
    DUPLICATE_TICKET = "duplicate_ticket"
    FALSIFIED_TICKET = "falsified_ticket"
    ABNORMAL_TRANSACTION = "abnormal_transaction"
    MULTIPLE_ACCOUNTS = "multiple_accounts"
    SUSPICIOUS_BEHAVIOR = "suspicious_behavior"
    ILLEGAL_RESALE = "illegal_resale"
    VELOCITY_ABUSE = "velocity_abuse"
    GEOLOCATION_FRAUD = "geolocation_fraud"
    DEVICE_FRAUD = "device_fraud"
    PAYMENT_FRAUD = "payment_fraud"


@dataclass
class FraudPattern:
    """Represents a detected fraud pattern"""
    name: str
    pattern_type: PatternType
    fraud_type: FraudType
    confidence: float
    evidence: Dict[str, Any]
    severity: str  # 'low', 'medium', 'high', 'critical'
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class PatternRule:
    """A rule-based pattern definition"""
    name: str
    pattern_type: PatternType
    fraud_type: FraudType
    conditions: Dict[str, Any]
    severity: str
    enabled: bool = True


class RuleBasedPatternMatcher:
    """
    Rule-based pattern matching for fast detection.

    Uses predefined rules for common fraud patterns.
    Can be updated without retraining ML models.
    """

    def __init__(self):
        """Initialize rule-based matcher with default rules"""
        self.rules: List[PatternRule] = self._default_rules()
        self._enabled_rules: Set[str] = {r.name for r in self.rules if r.enabled}

    def _default_rules(self) -> List[PatternRule]:
        """Define default fraud detection rules"""
        return [
            # Bulk purchase detection
            PatternRule(
                name="bulk_ticket_purchase",
                pattern_type=PatternType.BULK_PURCHASE,
                fraud_type=FraudType.ILLEGAL_RESALE,
                conditions={
                    'ticket_count_24h': {'gt': 10},
                    'unique_categories': {'gt': 3},
                },
                severity='high',
            ),
            # Rapid transactions
            PatternRule(
                name="rapid_topup_pattern",
                pattern_type=PatternType.RAPID_TRANSACTIONS,
                fraud_type=FraudType.VELOCITY_ABUSE,
                conditions={
                    'topup_count_1h': {'gt': 5},
                    'avg_interval_minutes': {'lt': 5},
                },
                severity='medium',
            ),
            # Device sharing
            PatternRule(
                name="device_sharing_pattern",
                pattern_type=PatternType.DEVICE_SHARING,
                fraud_type=FraudType.MULTIPLE_ACCOUNTS,
                conditions={
                    'users_per_device': {'gt': 3},
                    'transactions_from_device': {'gt': 20},
                },
                severity='high',
            ),
            # Unusual hours
            PatternRule(
                name="night_transaction_pattern",
                pattern_type=PatternType.UNUSUAL_HOURS,
                fraud_type=FraudType.SUSPICIOUS_BEHAVIOR,
                conditions={
                    'hour': {'in_range': [2, 5]},
                    'amount': {'gt': 100},
                    'is_first_transaction': True,
                },
                severity='medium',
            ),
            # New account abuse
            PatternRule(
                name="new_account_high_volume",
                pattern_type=PatternType.NEW_ACCOUNT_ABUSE,
                fraud_type=FraudType.SUSPICIOUS_BEHAVIOR,
                conditions={
                    'account_age_hours': {'lt': 24},
                    'transaction_count': {'gt': 10},
                    'total_amount': {'gt': 500},
                },
                severity='high',
            ),
            # Refund abuse
            PatternRule(
                name="refund_abuse_pattern",
                pattern_type=PatternType.REFUND_ABUSE,
                fraud_type=FraudType.PAYMENT_FRAUD,
                conditions={
                    'refund_count_30d': {'gt': 3},
                    'refund_rate': {'gt': 0.5},
                },
                severity='high',
            ),
            # Coordinated fraud (same IP, different users)
            PatternRule(
                name="coordinated_purchase_pattern",
                pattern_type=PatternType.COORDINATED_FRAUD,
                fraud_type=FraudType.ILLEGAL_RESALE,
                conditions={
                    'users_per_ip': {'gt': 5},
                    'ticket_count_per_ip': {'gt': 20},
                    'time_window_minutes': {'lt': 30},
                },
                severity='critical',
            ),
            # Geographic anomaly
            PatternRule(
                name="impossible_travel",
                pattern_type=PatternType.GEOGRAPHIC_ANOMALY,
                fraud_type=FraudType.GEOLOCATION_FRAUD,
                conditions={
                    'distance_km': {'gt': 500},
                    'time_between_hours': {'lt': 2},
                },
                severity='high',
            ),
        ]

    def match(
        self,
        context: Dict[str, Any],
    ) -> List[FraudPattern]:
        """
        Match context against all enabled rules

        Args:
            context: Dictionary with transaction context

        Returns:
            List of matched FraudPattern objects
        """
        matches = []

        for rule in self.rules:
            if rule.name not in self._enabled_rules:
                continue

            if self._evaluate_rule(rule, context):
                pattern = FraudPattern(
                    name=rule.name,
                    pattern_type=rule.pattern_type,
                    fraud_type=rule.fraud_type,
                    confidence=0.8,  # Rule-based = fixed confidence
                    evidence=self._extract_evidence(rule, context),
                    severity=rule.severity,
                )
                matches.append(pattern)

        return matches

    def _evaluate_rule(
        self,
        rule: PatternRule,
        context: Dict[str, Any],
    ) -> bool:
        """Evaluate a single rule against context"""
        for field, condition in rule.conditions.items():
            value = context.get(field)

            if value is None:
                return False

            if isinstance(condition, dict):
                if 'gt' in condition and not (value > condition['gt']):
                    return False
                if 'lt' in condition and not (value < condition['lt']):
                    return False
                if 'gte' in condition and not (value >= condition['gte']):
                    return False
                if 'lte' in condition and not (value <= condition['lte']):
                    return False
                if 'eq' in condition and not (value == condition['eq']):
                    return False
                if 'in_range' in condition:
                    low, high = condition['in_range']
                    if not (low <= value <= high):
                        return False
            elif isinstance(condition, bool):
                if value != condition:
                    return False

        return True

    def _extract_evidence(
        self,
        rule: PatternRule,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Extract relevant evidence from context"""
        evidence = {}
        for field in rule.conditions.keys():
            if field in context:
                evidence[field] = context[field]
        return evidence

    def add_rule(self, rule: PatternRule) -> None:
        """Add a new rule"""
        self.rules.append(rule)
        if rule.enabled:
            self._enabled_rules.add(rule.name)

    def enable_rule(self, rule_name: str) -> None:
        """Enable a rule"""
        self._enabled_rules.add(rule_name)

    def disable_rule(self, rule_name: str) -> None:
        """Disable a rule"""
        self._enabled_rules.discard(rule_name)


class MLPatternRecognizer:
    """
    ML-based pattern recognition using Random Forest.

    Learns complex patterns from historical fraud data.
    """

    def __init__(
        self,
        n_estimators: int = 100,
        max_depth: int = 10,
        min_samples_leaf: int = 5,
        random_state: int = 42,
    ):
        """
        Initialize ML pattern recognizer

        Args:
            n_estimators: Number of trees in the forest
            max_depth: Maximum depth of trees
            min_samples_leaf: Minimum samples in leaf nodes
            random_state: Random seed
        """
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.min_samples_leaf = min_samples_leaf
        self.random_state = random_state

        self.model: Optional[RandomForestClassifier] = None
        self.scaler: Optional[StandardScaler] = None
        self.feature_names: List[str] = []
        self.pattern_labels: Dict[int, PatternType] = {}

        self._is_trained = False

    def _extract_features(
        self,
        context: Dict[str, Any],
    ) -> np.ndarray:
        """Extract feature vector from context"""
        features = []

        # Transaction features
        features.append(context.get('amount', 0))
        features.append(context.get('transaction_count_1h', 0))
        features.append(context.get('transaction_count_24h', 0))
        features.append(context.get('total_amount_1h', 0))
        features.append(context.get('total_amount_24h', 0))

        # Time features
        features.append(context.get('hour', 12))
        features.append(context.get('day_of_week', 0))
        features.append(1 if context.get('is_weekend', False) else 0)
        features.append(1 if context.get('is_night', False) else 0)

        # Account features
        features.append(context.get('account_age_days', 0))
        features.append(context.get('total_transactions', 0))
        features.append(context.get('avg_transaction_amount', 0))

        # Device/IP features
        features.append(context.get('users_per_device', 1))
        features.append(context.get('users_per_ip', 1))
        features.append(1 if context.get('is_new_device', False) else 0)

        # Velocity features
        features.append(context.get('minutes_since_last_tx', 60))
        features.append(context.get('topup_count_1h', 0))
        features.append(context.get('refund_count_30d', 0))

        # Ticket features
        features.append(context.get('ticket_count_24h', 0))
        features.append(context.get('unique_categories', 0))

        return np.array(features, dtype=np.float32)

    def train(
        self,
        training_data: List[Dict[str, Any]],
        labels: List[int],
    ) -> Dict[str, Any]:
        """
        Train the pattern recognition model

        Args:
            training_data: List of context dictionaries
            labels: List of pattern labels (0 = normal, 1+ = pattern types)

        Returns:
            Training metrics
        """
        if not SKLEARN_AVAILABLE:
            logger.warning("sklearn not available, skipping ML training")
            return {'status': 'skipped', 'reason': 'sklearn not available'}

        logger.info(f"Training ML pattern recognizer on {len(training_data)} samples...")

        # Extract features
        X = np.array([self._extract_features(d) for d in training_data])
        y = np.array(labels)

        # Scale features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        # Train Random Forest
        self.model = RandomForestClassifier(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            min_samples_leaf=self.min_samples_leaf,
            random_state=self.random_state,
            n_jobs=-1,
            class_weight='balanced',
        )
        self.model.fit(X_scaled, y)

        self._is_trained = True

        # Calculate metrics
        train_accuracy = self.model.score(X_scaled, y)
        feature_importance = dict(zip(
            self.feature_names or [f"feature_{i}" for i in range(X.shape[1])],
            self.model.feature_importances_
        ))

        metrics = {
            'status': 'success',
            'n_samples': len(training_data),
            'n_features': X.shape[1],
            'train_accuracy': float(train_accuracy),
            'feature_importance': feature_importance,
        }

        logger.info(f"ML pattern recognizer training completed: {metrics}")

        return metrics

    def predict(
        self,
        context: Dict[str, Any],
    ) -> List[Tuple[PatternType, float]]:
        """
        Predict pattern types for a context

        Args:
            context: Transaction context

        Returns:
            List of (PatternType, probability) tuples
        """
        if not self._is_trained or self.model is None:
            return []

        # Extract and scale features
        X = self._extract_features(context).reshape(1, -1)
        X_scaled = self.scaler.transform(X)

        # Get class probabilities
        proba = self.model.predict_proba(X_scaled)[0]

        # Return patterns with probability > threshold
        patterns = []
        threshold = 0.3

        for class_idx, prob in enumerate(proba):
            if class_idx > 0 and prob > threshold:  # Skip class 0 (normal)
                pattern_type = self.pattern_labels.get(class_idx, PatternType.TICKET_RESALE)
                patterns.append((pattern_type, float(prob)))

        return patterns

    def save(self, path: Path) -> None:
        """Save model to disk"""
        if not self._is_trained:
            return

        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'pattern_labels': self.pattern_labels,
            'config': {
                'n_estimators': self.n_estimators,
                'max_depth': self.max_depth,
                'min_samples_leaf': self.min_samples_leaf,
            },
        }

        with open(path, 'wb') as f:
            pickle.dump(model_data, f)

        logger.info(f"ML pattern recognizer saved to {path}")

    def load(self, path: Path) -> None:
        """Load model from disk"""
        with open(path, 'rb') as f:
            model_data = pickle.load(f)

        self.model = model_data['model']
        self.scaler = model_data['scaler']
        self.feature_names = model_data['feature_names']
        self.pattern_labels = model_data['pattern_labels']
        self._is_trained = True

        logger.info(f"ML pattern recognizer loaded from {path}")


class PatternRecognizer:
    """
    Main pattern recognition orchestrator.

    Combines rule-based and ML-based pattern recognition.
    """

    def __init__(
        self,
        config: Optional[Dict[str, Any]] = None,
    ):
        """
        Initialize pattern recognizer

        Args:
            config: Configuration dictionary
        """
        self.config = config or {}

        # Initialize components
        self.rule_matcher = RuleBasedPatternMatcher()
        self.ml_recognizer = MLPatternRecognizer(
            n_estimators=self.config.get('n_estimators', 100),
            max_depth=self.config.get('max_depth', 10),
        )

        # Pattern history for learning
        self._pattern_history: List[Dict[str, Any]] = []
        self._feedback_buffer: List[Tuple[Dict[str, Any], FraudType]] = []

        self._initialized = False

    async def initialize(self) -> None:
        """Initialize pattern recognizer"""
        logger.info("Initializing Pattern Recognizer...")

        # Try to load pre-trained ML model
        model_path = Path(self.config.get('model_path', '/tmp/fraud_models'))
        ml_model_path = model_path / 'ml_pattern_recognizer.pkl'

        if ml_model_path.exists():
            try:
                self.ml_recognizer.load(ml_model_path)
                logger.info("Loaded pre-trained ML pattern model")
            except Exception as e:
                logger.warning(f"Could not load ML model: {e}")

        self._initialized = True
        logger.info("Pattern Recognizer initialized")

    async def recognize_patterns(
        self,
        transaction,  # TransactionData
        context: Dict[str, Any],
    ) -> List[FraudPattern]:
        """
        Recognize fraud patterns in a transaction

        Args:
            transaction: Transaction data
            context: Additional context from other checks

        Returns:
            List of recognized patterns
        """
        patterns = []

        # Build pattern context
        pattern_context = self._build_context(transaction, context)

        # Rule-based matching (fast)
        rule_patterns = self.rule_matcher.match(pattern_context)
        patterns.extend(rule_patterns)

        # ML-based recognition (if trained)
        if self.ml_recognizer._is_trained:
            ml_patterns = self.ml_recognizer.predict(pattern_context)
            for pattern_type, confidence in ml_patterns:
                # Avoid duplicates
                if not any(p.pattern_type == pattern_type for p in patterns):
                    patterns.append(FraudPattern(
                        name=f"ml_{pattern_type.value}",
                        pattern_type=pattern_type,
                        fraud_type=self._pattern_to_fraud_type(pattern_type),
                        confidence=confidence,
                        evidence={'source': 'ml_model'},
                        severity=self._get_severity(confidence),
                    ))

        return patterns

    def _build_context(
        self,
        transaction,
        extra_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Build context dictionary for pattern matching"""
        context = {
            'amount': transaction.amount or 0,
            'hour': transaction.timestamp.hour,
            'day_of_week': transaction.timestamp.weekday(),
            'is_weekend': transaction.timestamp.weekday() >= 5,
            'is_night': transaction.timestamp.hour >= 22 or transaction.timestamp.hour < 6,
            'transaction_type': transaction.transaction_type,
        }

        # Add extra context
        context.update(extra_context)

        # Extract from anomaly details if present
        if 'velocity' in extra_context:
            velocity = extra_context['velocity']
            context['transaction_count_1h'] = velocity.get('tx_count_1h', 0)
            context['topup_count_1h'] = velocity.get('tx_count_5min', 0)

        if 'anomaly_scores' in extra_context:
            context['anomaly_score'] = extra_context['anomaly_scores'].get('isolation_forest', 0)

        return context

    def _pattern_to_fraud_type(self, pattern_type: PatternType) -> FraudType:
        """Map pattern type to fraud type"""
        mapping = {
            PatternType.TICKET_RESALE: FraudType.ILLEGAL_RESALE,
            PatternType.BULK_PURCHASE: FraudType.ILLEGAL_RESALE,
            PatternType.DEVICE_SHARING: FraudType.MULTIPLE_ACCOUNTS,
            PatternType.RAPID_TRANSACTIONS: FraudType.VELOCITY_ABUSE,
            PatternType.UNUSUAL_HOURS: FraudType.SUSPICIOUS_BEHAVIOR,
            PatternType.GEOGRAPHIC_ANOMALY: FraudType.GEOLOCATION_FRAUD,
            PatternType.PRICE_MANIPULATION: FraudType.PAYMENT_FRAUD,
            PatternType.COORDINATED_FRAUD: FraudType.ILLEGAL_RESALE,
            PatternType.NEW_ACCOUNT_ABUSE: FraudType.SUSPICIOUS_BEHAVIOR,
            PatternType.REFUND_ABUSE: FraudType.PAYMENT_FRAUD,
        }
        return mapping.get(pattern_type, FraudType.SUSPICIOUS_BEHAVIOR)

    def _get_severity(self, confidence: float) -> str:
        """Determine severity based on confidence"""
        if confidence >= 0.9:
            return 'critical'
        elif confidence >= 0.7:
            return 'high'
        elif confidence >= 0.5:
            return 'medium'
        else:
            return 'low'

    async def learn_from_report(
        self,
        fraud_type: FraudType,
        transaction_id: str,
        evidence: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Learn from manual fraud reports

        Args:
            fraud_type: Type of fraud reported
            transaction_id: ID of the fraudulent transaction
            evidence: Additional evidence
        """
        # Buffer the feedback for batch training
        self._feedback_buffer.append((evidence or {}, fraud_type))

        logger.info(f"Recorded fraud report for learning: {fraud_type.value}")

        # Trigger retraining if buffer is large enough
        if len(self._feedback_buffer) >= 100:
            await self._batch_train()

    async def _batch_train(self) -> None:
        """Train ML model from feedback buffer"""
        if len(self._feedback_buffer) < 10:
            return

        logger.info(f"Batch training from {len(self._feedback_buffer)} reports...")

        # Prepare training data
        training_data = []
        labels = []

        pattern_to_label = {
            FraudType.ILLEGAL_RESALE: 1,
            FraudType.VELOCITY_ABUSE: 2,
            FraudType.MULTIPLE_ACCOUNTS: 3,
            FraudType.SUSPICIOUS_BEHAVIOR: 4,
            FraudType.GEOLOCATION_FRAUD: 5,
            FraudType.PAYMENT_FRAUD: 6,
        }

        for evidence, fraud_type in self._feedback_buffer:
            training_data.append(evidence)
            labels.append(pattern_to_label.get(fraud_type, 0))

        # Train ML model
        self.ml_recognizer.train(training_data, labels)

        # Clear buffer
        self._feedback_buffer.clear()

    async def train(
        self,
        training_data: List[Dict[str, Any]],
        labels: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """
        Train pattern recognition models

        Args:
            training_data: List of transaction contexts
            labels: Optional fraud labels

        Returns:
            Training metrics
        """
        if labels is None:
            # Unsupervised - just store patterns
            return {'status': 'skipped', 'reason': 'no labels provided'}

        metrics = self.ml_recognizer.train(training_data, labels)

        return metrics

    async def cleanup(self) -> None:
        """Cleanup resources"""
        self._pattern_history.clear()
        self._feedback_buffer.clear()
        logger.info("Pattern Recognizer cleanup completed")
