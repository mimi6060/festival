"""
Main Fraud Detector Module

This is the central orchestrator for fraud detection, combining anomaly detection,
pattern recognition, and risk scoring to provide comprehensive fraud analysis.

Fraud Types Detected:
1. Duplicate/falsified tickets (QR code reuse, invalid signatures)
2. Abnormal cashless transactions (unusual amounts, frequency, timing)
3. Multiple accounts (same device/IP, device fingerprinting)
4. Suspicious behaviors (repeated top-ups, rapid transactions)
5. Illegal ticket resale (price markup, bulk purchases)

Performance Target: <100ms for real-time checks
GDPR Compliance: All training data is anonymized
"""

import asyncio
import hashlib
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

from .anomaly_detection import AnomalyDetector, AnomalyType
from .pattern_recognition import PatternRecognizer, FraudPattern
from .risk_scorer import RiskScorer, RiskLevel

logger = logging.getLogger(__name__)


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


class FraudAction(Enum):
    """Actions to take when fraud is detected."""
    ALLOW = "allow"
    FLAG = "flag"
    REVIEW = "review"
    BLOCK = "block"
    ALERT_SECURITY = "alert_security"


@dataclass
class FraudCheckResult:
    """Result of a fraud check."""
    transaction_id: str
    timestamp: datetime
    risk_score: float  # 0-100
    risk_level: RiskLevel
    fraud_types: List[FraudType]
    action: FraudAction
    confidence: float  # 0-1
    details: Dict[str, Any]
    processing_time_ms: float
    should_block: bool
    alert_required: bool
    recommendations: List[str]


@dataclass
class TransactionData:
    """Input data for fraud check."""
    transaction_id: str
    user_id: str
    festival_id: str
    transaction_type: str  # 'ticket_purchase', 'cashless_topup', 'cashless_payment', 'ticket_scan'
    amount: Optional[float] = None
    currency: str = "EUR"
    timestamp: datetime = field(default_factory=datetime.utcnow)

    # Device information
    device_id: Optional[str] = None
    device_fingerprint: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    # Geolocation
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    zone_id: Optional[str] = None

    # Ticket specific
    ticket_id: Optional[str] = None
    qr_code: Optional[str] = None

    # Cashless specific
    cashless_account_id: Optional[str] = None
    vendor_id: Optional[str] = None

    # Additional context
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FraudAlert:
    """Alert generated for security team."""
    alert_id: str
    timestamp: datetime
    severity: str  # 'low', 'medium', 'high', 'critical'
    fraud_type: FraudType
    risk_score: float
    transaction_id: str
    user_id: str
    festival_id: str
    description: str
    evidence: Dict[str, Any]
    recommended_action: str
    auto_blocked: bool


class FraudDetector:
    """
    Main fraud detection orchestrator.

    Combines multiple detection methods:
    - Anomaly detection (Isolation Forest, Autoencoder)
    - Pattern recognition (Random Forest, Rule-based)
    - Risk scoring (Weighted combination)

    Example:
        detector = FraudDetector()
        await detector.initialize()

        result = await detector.check_transaction(transaction_data)
        if result.should_block:
            # Block the transaction
            pass
    """

    # Risk thresholds for actions
    THRESHOLD_FLAG = 30.0
    THRESHOLD_REVIEW = 50.0
    THRESHOLD_BLOCK = 75.0
    THRESHOLD_ALERT = 60.0

    # Performance target
    MAX_PROCESSING_TIME_MS = 100.0

    def __init__(
        self,
        config: Optional[Dict[str, Any]] = None,
        redis_client: Optional[Any] = None,
        db_client: Optional[Any] = None,
    ):
        """
        Initialize the fraud detector.

        Args:
            config: Configuration dictionary
            redis_client: Redis client for caching and rate limiting
            db_client: Database client for historical data
        """
        self.config = config or {}
        self.redis = redis_client
        self.db = db_client

        # Initialize sub-components
        self.anomaly_detector = AnomalyDetector(config=self.config.get('anomaly', {}))
        self.pattern_recognizer = PatternRecognizer(config=self.config.get('patterns', {}))
        self.risk_scorer = RiskScorer(config=self.config.get('scoring', {}))

        # Caches for fast lookups
        self._ticket_scan_cache: Dict[str, List[Tuple[datetime, str]]] = {}
        self._user_transaction_cache: Dict[str, List[datetime]] = {}
        self._device_user_cache: Dict[str, set] = {}
        self._ip_user_cache: Dict[str, set] = {}

        # Alerts queue
        self._alerts: List[FraudAlert] = []

        # Statistics
        self._stats = {
            'total_checks': 0,
            'blocked': 0,
            'flagged': 0,
            'alerts_generated': 0,
            'avg_processing_time_ms': 0.0,
        }

        self._initialized = False

    async def initialize(self) -> None:
        """Initialize all components and load models."""
        logger.info("Initializing Fraud Detector...")

        # Initialize sub-components
        await self.anomaly_detector.initialize()
        await self.pattern_recognizer.initialize()
        await self.risk_scorer.initialize()

        # Load historical data for caches if database available
        if self.db:
            await self._load_historical_data()

        self._initialized = True
        logger.info("Fraud Detector initialized successfully")

    async def _load_historical_data(self) -> None:
        """Load recent historical data for context."""
        # This would load from database in production
        logger.info("Loading historical data for fraud context...")
        pass

    async def check_transaction(self, data: TransactionData) -> FraudCheckResult:
        """
        Check a transaction for fraud in real-time.

        Target response time: <100ms

        Args:
            data: Transaction data to check

        Returns:
            FraudCheckResult with risk assessment and recommended action
        """
        if not self._initialized:
            await self.initialize()

        start_time = time.perf_counter()
        fraud_types: List[FraudType] = []
        details: Dict[str, Any] = {}

        try:
            # Run all checks in parallel for speed
            check_tasks = [
                self._check_ticket_fraud(data),
                self._check_transaction_anomalies(data),
                self._check_multiple_accounts(data),
                self._check_velocity(data),
                self._check_geolocation(data),
            ]

            results = await asyncio.gather(*check_tasks, return_exceptions=True)

            # Process results
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Check {i} failed: {result}")
                    continue

                check_fraud_types, check_details = result
                fraud_types.extend(check_fraud_types)
                details.update(check_details)

            # Pattern recognition
            patterns = await self.pattern_recognizer.recognize_patterns(data, details)
            for pattern in patterns:
                if pattern.fraud_type not in fraud_types:
                    fraud_types.append(pattern.fraud_type)
                details[f'pattern_{pattern.name}'] = {
                    'confidence': pattern.confidence,
                    'evidence': pattern.evidence,
                }

            # Calculate risk score
            risk_result = await self.risk_scorer.calculate_score(
                data=data,
                fraud_types=fraud_types,
                anomaly_scores=details.get('anomaly_scores', {}),
                pattern_matches=patterns,
            )

            # Determine action
            action, should_block, alert_required = self._determine_action(
                risk_result.score,
                fraud_types,
            )

            # Generate recommendations
            recommendations = self._generate_recommendations(
                fraud_types,
                risk_result.score,
                details,
            )

            # Calculate processing time
            processing_time_ms = (time.perf_counter() - start_time) * 1000

            # Create result
            result = FraudCheckResult(
                transaction_id=data.transaction_id,
                timestamp=datetime.utcnow(),
                risk_score=risk_result.score,
                risk_level=risk_result.level,
                fraud_types=fraud_types,
                action=action,
                confidence=risk_result.confidence,
                details=details,
                processing_time_ms=processing_time_ms,
                should_block=should_block,
                alert_required=alert_required,
                recommendations=recommendations,
            )

            # Update statistics
            self._update_stats(result)

            # Generate alert if needed
            if alert_required:
                await self._generate_alert(data, result)

            # Log performance warning if too slow
            if processing_time_ms > self.MAX_PROCESSING_TIME_MS:
                logger.warning(
                    f"Fraud check exceeded time limit: {processing_time_ms:.2f}ms "
                    f"(target: {self.MAX_PROCESSING_TIME_MS}ms)"
                )

            return result

        except Exception as e:
            logger.error(f"Fraud check failed: {e}")
            # Return safe default on error
            return FraudCheckResult(
                transaction_id=data.transaction_id,
                timestamp=datetime.utcnow(),
                risk_score=0.0,
                risk_level=RiskLevel.LOW,
                fraud_types=[],
                action=FraudAction.ALLOW,
                confidence=0.0,
                details={'error': str(e)},
                processing_time_ms=(time.perf_counter() - start_time) * 1000,
                should_block=False,
                alert_required=False,
                recommendations=['Error during check - manual review recommended'],
            )

    async def _check_ticket_fraud(
        self,
        data: TransactionData,
    ) -> Tuple[List[FraudType], Dict[str, Any]]:
        """Check for ticket-related fraud."""
        fraud_types = []
        details = {}

        if data.transaction_type != 'ticket_scan' or not data.ticket_id:
            return fraud_types, details

        # Check for duplicate scans (same ticket, different locations)
        cache_key = f"ticket:{data.ticket_id}"
        recent_scans = self._ticket_scan_cache.get(cache_key, [])

        # Filter to recent scans (last 4 hours)
        cutoff = datetime.utcnow() - timedelta(hours=4)
        recent_scans = [(ts, zone) for ts, zone in recent_scans if ts > cutoff]

        if recent_scans:
            last_scan_time, last_zone = recent_scans[-1]
            time_since_last = (data.timestamp - last_scan_time).total_seconds()

            # Same ticket scanned at different location within short time
            if data.zone_id and data.zone_id != last_zone and time_since_last < 300:
                fraud_types.append(FraudType.DUPLICATE_TICKET)
                details['duplicate_ticket'] = {
                    'last_scan_time': last_scan_time.isoformat(),
                    'last_zone': last_zone,
                    'current_zone': data.zone_id,
                    'time_difference_seconds': time_since_last,
                }

            # Too many scans in short period
            if len(recent_scans) > 5:
                fraud_types.append(FraudType.SUSPICIOUS_BEHAVIOR)
                details['excessive_scans'] = {
                    'scan_count': len(recent_scans),
                    'period_hours': 4,
                }

        # Update cache
        recent_scans.append((data.timestamp, data.zone_id))
        self._ticket_scan_cache[cache_key] = recent_scans[-10:]  # Keep last 10

        return fraud_types, details

    async def _check_transaction_anomalies(
        self,
        data: TransactionData,
    ) -> Tuple[List[FraudType], Dict[str, Any]]:
        """Check for transaction anomalies using ML models."""
        fraud_types = []
        details = {}

        if data.transaction_type not in ['cashless_topup', 'cashless_payment', 'ticket_purchase']:
            return fraud_types, details

        # Run anomaly detection
        anomaly_result = await self.anomaly_detector.detect(data)
        details['anomaly_scores'] = anomaly_result.scores

        if anomaly_result.is_anomaly:
            for anomaly_type in anomaly_result.anomaly_types:
                if anomaly_type == AnomalyType.AMOUNT:
                    fraud_types.append(FraudType.ABNORMAL_TRANSACTION)
                elif anomaly_type == AnomalyType.FREQUENCY:
                    fraud_types.append(FraudType.VELOCITY_ABUSE)
                elif anomaly_type == AnomalyType.TIMING:
                    fraud_types.append(FraudType.SUSPICIOUS_BEHAVIOR)

            details['anomalies'] = {
                'types': [t.value for t in anomaly_result.anomaly_types],
                'confidence': anomaly_result.confidence,
            }

        return fraud_types, details

    async def _check_multiple_accounts(
        self,
        data: TransactionData,
    ) -> Tuple[List[FraudType], Dict[str, Any]]:
        """Check for multiple accounts from same device/IP."""
        fraud_types = []
        details = {}

        # Check device fingerprint
        if data.device_fingerprint:
            device_users = self._device_user_cache.get(data.device_fingerprint, set())
            device_users.add(data.user_id)
            self._device_user_cache[data.device_fingerprint] = device_users

            if len(device_users) > 3:  # More than 3 users from same device
                fraud_types.append(FraudType.MULTIPLE_ACCOUNTS)
                details['multiple_accounts_device'] = {
                    'user_count': len(device_users),
                    'device_hash': self._hash_for_gdpr(data.device_fingerprint),
                }

        # Check IP address
        if data.ip_address:
            ip_users = self._ip_user_cache.get(data.ip_address, set())
            ip_users.add(data.user_id)
            self._ip_user_cache[data.ip_address] = ip_users

            # Higher threshold for IP (NAT, shared networks)
            if len(ip_users) > 10:
                if FraudType.MULTIPLE_ACCOUNTS not in fraud_types:
                    fraud_types.append(FraudType.MULTIPLE_ACCOUNTS)
                details['multiple_accounts_ip'] = {
                    'user_count': len(ip_users),
                    'ip_hash': self._hash_for_gdpr(data.ip_address),
                }

        return fraud_types, details

    async def _check_velocity(
        self,
        data: TransactionData,
    ) -> Tuple[List[FraudType], Dict[str, Any]]:
        """Check for velocity abuse (too many transactions too fast)."""
        fraud_types = []
        details = {}

        cache_key = f"user_tx:{data.user_id}"
        user_transactions = self._user_transaction_cache.get(cache_key, [])

        # Filter to last hour
        cutoff = datetime.utcnow() - timedelta(hours=1)
        user_transactions = [ts for ts in user_transactions if ts > cutoff]

        # Velocity checks
        tx_count_1h = len(user_transactions)
        tx_count_5min = len([ts for ts in user_transactions
                           if ts > datetime.utcnow() - timedelta(minutes=5)])

        velocity_flags = []

        # More than 50 transactions per hour
        if tx_count_1h > 50:
            velocity_flags.append('high_hourly_volume')

        # More than 10 transactions in 5 minutes
        if tx_count_5min > 10:
            velocity_flags.append('burst_activity')

        # Check for repeated top-ups
        if data.transaction_type == 'cashless_topup':
            topup_count = sum(1 for _ in user_transactions[-20:])  # Simplified
            if topup_count > 5:
                velocity_flags.append('repeated_topups')

        if velocity_flags:
            fraud_types.append(FraudType.VELOCITY_ABUSE)
            details['velocity'] = {
                'flags': velocity_flags,
                'tx_count_1h': tx_count_1h,
                'tx_count_5min': tx_count_5min,
            }

        # Update cache
        user_transactions.append(data.timestamp)
        self._user_transaction_cache[cache_key] = user_transactions[-100:]

        return fraud_types, details

    async def _check_geolocation(
        self,
        data: TransactionData,
    ) -> Tuple[List[FraudType], Dict[str, Any]]:
        """Check for impossible geolocation (same ticket at two distant places)."""
        fraud_types = []
        details = {}

        if not data.latitude or not data.longitude:
            return fraud_types, details

        # This would check historical location data in production
        # For now, return empty results
        return fraud_types, details

    def _determine_action(
        self,
        risk_score: float,
        fraud_types: List[FraudType],
    ) -> Tuple[FraudAction, bool, bool]:
        """
        Determine what action to take based on risk score.

        Returns:
            Tuple of (action, should_block, alert_required)
        """
        should_block = False
        alert_required = False

        # Critical fraud types always trigger block
        critical_types = {
            FraudType.DUPLICATE_TICKET,
            FraudType.FALSIFIED_TICKET,
            FraudType.PAYMENT_FRAUD,
        }

        if any(ft in critical_types for ft in fraud_types):
            return FraudAction.BLOCK, True, True

        # Score-based actions
        if risk_score >= self.THRESHOLD_BLOCK:
            action = FraudAction.BLOCK
            should_block = True
            alert_required = True
        elif risk_score >= self.THRESHOLD_REVIEW:
            action = FraudAction.REVIEW
            alert_required = risk_score >= self.THRESHOLD_ALERT
        elif risk_score >= self.THRESHOLD_FLAG:
            action = FraudAction.FLAG
        else:
            action = FraudAction.ALLOW

        return action, should_block, alert_required

    def _generate_recommendations(
        self,
        fraud_types: List[FraudType],
        risk_score: float,
        details: Dict[str, Any],
    ) -> List[str]:
        """Generate actionable recommendations."""
        recommendations = []

        if FraudType.DUPLICATE_TICKET in fraud_types:
            recommendations.append(
                "Verify ticket holder identity with photo ID"
            )
            recommendations.append(
                "Check if original ticket was reported lost/stolen"
            )

        if FraudType.MULTIPLE_ACCOUNTS in fraud_types:
            recommendations.append(
                "Verify user accounts are legitimate (different people)"
            )
            recommendations.append(
                "Consider requiring additional verification"
            )

        if FraudType.VELOCITY_ABUSE in fraud_types:
            recommendations.append(
                "Apply temporary rate limiting to this user"
            )
            recommendations.append(
                "Review transaction history for patterns"
            )

        if FraudType.ABNORMAL_TRANSACTION in fraud_types:
            recommendations.append(
                "Review transaction amount against user history"
            )

        if FraudType.ILLEGAL_RESALE in fraud_types:
            recommendations.append(
                "Check ticket purchase price vs. festival price"
            )
            recommendations.append(
                "Review if user has bought many tickets for resale"
            )

        if risk_score >= 50 and not recommendations:
            recommendations.append(
                "Manual review recommended due to elevated risk score"
            )

        return recommendations

    async def _generate_alert(
        self,
        data: TransactionData,
        result: FraudCheckResult,
    ) -> FraudAlert:
        """Generate security alert."""
        # Determine severity
        if result.risk_score >= 90:
            severity = 'critical'
        elif result.risk_score >= 75:
            severity = 'high'
        elif result.risk_score >= 50:
            severity = 'medium'
        else:
            severity = 'low'

        # Get primary fraud type
        primary_fraud = result.fraud_types[0] if result.fraud_types else FraudType.SUSPICIOUS_BEHAVIOR

        alert = FraudAlert(
            alert_id=f"alert_{data.transaction_id}_{int(time.time())}",
            timestamp=datetime.utcnow(),
            severity=severity,
            fraud_type=primary_fraud,
            risk_score=result.risk_score,
            transaction_id=data.transaction_id,
            user_id=self._hash_for_gdpr(data.user_id),  # GDPR: hash user ID in alerts
            festival_id=data.festival_id,
            description=self._generate_alert_description(result),
            evidence=self._anonymize_evidence(result.details),
            recommended_action=result.action.value,
            auto_blocked=result.should_block,
        )

        self._alerts.append(alert)
        self._stats['alerts_generated'] += 1

        logger.warning(
            f"Fraud alert generated: {alert.alert_id} "
            f"(severity={severity}, score={result.risk_score:.1f})"
        )

        return alert

    def _generate_alert_description(self, result: FraudCheckResult) -> str:
        """Generate human-readable alert description."""
        fraud_type_names = [ft.value.replace('_', ' ').title() for ft in result.fraud_types]

        if len(fraud_type_names) == 0:
            return f"Suspicious activity detected (risk score: {result.risk_score:.0f})"
        elif len(fraud_type_names) == 1:
            return f"{fraud_type_names[0]} detected (risk score: {result.risk_score:.0f})"
        else:
            return f"Multiple fraud indicators: {', '.join(fraud_type_names)} (risk score: {result.risk_score:.0f})"

    def _anonymize_evidence(self, details: Dict[str, Any]) -> Dict[str, Any]:
        """Anonymize evidence for GDPR compliance."""
        # Deep copy and anonymize sensitive fields
        anonymized = {}

        for key, value in details.items():
            if isinstance(value, dict):
                anonymized[key] = self._anonymize_evidence(value)
            elif key in ('ip_address', 'device_fingerprint', 'user_id', 'device_id'):
                anonymized[key] = self._hash_for_gdpr(str(value))
            else:
                anonymized[key] = value

        return anonymized

    def _hash_for_gdpr(self, value: str) -> str:
        """Hash a value for GDPR compliance (anonymization)."""
        return hashlib.sha256(value.encode()).hexdigest()[:16]

    def _update_stats(self, result: FraudCheckResult) -> None:
        """Update internal statistics."""
        self._stats['total_checks'] += 1

        if result.should_block:
            self._stats['blocked'] += 1
        elif result.action in (FraudAction.FLAG, FraudAction.REVIEW):
            self._stats['flagged'] += 1

        # Update moving average of processing time
        n = self._stats['total_checks']
        old_avg = self._stats['avg_processing_time_ms']
        self._stats['avg_processing_time_ms'] = (
            old_avg * (n - 1) + result.processing_time_ms
        ) / n

    def get_statistics(self) -> Dict[str, Any]:
        """Get fraud detection statistics."""
        return {
            **self._stats,
            'pending_alerts': len(self._alerts),
            'cache_sizes': {
                'ticket_scans': len(self._ticket_scan_cache),
                'user_transactions': len(self._user_transaction_cache),
                'device_users': len(self._device_user_cache),
                'ip_users': len(self._ip_user_cache),
            },
        }

    def get_alerts(
        self,
        limit: int = 100,
        severity: Optional[str] = None,
        since: Optional[datetime] = None,
    ) -> List[FraudAlert]:
        """Get fraud alerts."""
        alerts = self._alerts

        if severity:
            alerts = [a for a in alerts if a.severity == severity]

        if since:
            alerts = [a for a in alerts if a.timestamp >= since]

        return sorted(alerts, key=lambda a: a.timestamp, reverse=True)[:limit]

    async def report_fraud(
        self,
        transaction_id: str,
        user_id: str,
        festival_id: str,
        fraud_type: FraudType,
        description: str,
        reporter_id: str,
        evidence: Optional[Dict[str, Any]] = None,
    ) -> FraudAlert:
        """
        Manually report fraud (by staff).

        Args:
            transaction_id: ID of suspicious transaction
            user_id: ID of user involved
            festival_id: Festival where fraud occurred
            fraud_type: Type of fraud being reported
            description: Human description of the fraud
            reporter_id: ID of staff member reporting
            evidence: Optional additional evidence

        Returns:
            Generated alert
        """
        alert = FraudAlert(
            alert_id=f"manual_{transaction_id}_{int(time.time())}",
            timestamp=datetime.utcnow(),
            severity='high',  # Manual reports are taken seriously
            fraud_type=fraud_type,
            risk_score=80.0,  # High score for manual reports
            transaction_id=transaction_id,
            user_id=self._hash_for_gdpr(user_id),
            festival_id=festival_id,
            description=f"Manual report: {description}",
            evidence={
                'reporter_id': self._hash_for_gdpr(reporter_id),
                'manual_report': True,
                **(evidence or {}),
            },
            recommended_action='review',
            auto_blocked=False,
        )

        self._alerts.append(alert)
        self._stats['alerts_generated'] += 1

        logger.info(f"Manual fraud report created: {alert.alert_id}")

        # Trigger pattern learning for manual reports
        await self.pattern_recognizer.learn_from_report(
            fraud_type=fraud_type,
            transaction_id=transaction_id,
            evidence=evidence,
        )

        return alert

    async def train(
        self,
        training_data: List[Dict[str, Any]],
        labels: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """
        Train/retrain fraud detection models.

        Args:
            training_data: Historical transaction data (anonymized)
            labels: Optional fraud labels (1=fraud, 0=legitimate)

        Returns:
            Training metrics
        """
        logger.info(f"Starting model training with {len(training_data)} samples...")

        # Anonymize training data for GDPR
        anonymized_data = [
            self._anonymize_for_training(d) for d in training_data
        ]

        # Train components
        anomaly_metrics = await self.anomaly_detector.train(anonymized_data)
        pattern_metrics = await self.pattern_recognizer.train(anonymized_data, labels)
        scorer_metrics = await self.risk_scorer.calibrate(anonymized_data, labels)

        metrics = {
            'samples': len(training_data),
            'anomaly_detector': anomaly_metrics,
            'pattern_recognizer': pattern_metrics,
            'risk_scorer': scorer_metrics,
            'timestamp': datetime.utcnow().isoformat(),
        }

        logger.info(f"Model training completed: {metrics}")

        return metrics

    def _anonymize_for_training(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Anonymize data for GDPR-compliant training."""
        sensitive_fields = {
            'user_id', 'email', 'phone', 'name', 'ip_address',
            'device_id', 'device_fingerprint', 'address',
        }

        anonymized = {}
        for key, value in data.items():
            if key in sensitive_fields:
                # Hash or remove sensitive data
                if value:
                    anonymized[f"{key}_hash"] = self._hash_for_gdpr(str(value))
            else:
                anonymized[key] = value

        return anonymized

    async def cleanup(self) -> None:
        """Cleanup resources."""
        # Clear caches
        self._ticket_scan_cache.clear()
        self._user_transaction_cache.clear()
        self._device_user_cache.clear()
        self._ip_user_cache.clear()

        # Cleanup sub-components
        await self.anomaly_detector.cleanup()
        await self.pattern_recognizer.cleanup()
        await self.risk_scorer.cleanup()

        logger.info("Fraud Detector cleanup completed")
