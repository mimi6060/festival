"""
Festival Fraud Detection System

A comprehensive ML-based fraud detection system for festival management.
Detects duplicate tickets, abnormal cashless transactions, multiple accounts,
suspicious behaviors, and illegal ticket resales.

Features:
- Real-time fraud detection (<100ms response time)
- Anomaly detection using Isolation Forest
- Pattern recognition with Random Forest
- Risk scoring (0-100)
- GDPR-compliant data anonymization

Author: Festival Platform AI Team
Version: 1.0.0
"""

from .fraud_detector import FraudDetector
from .anomaly_detection import AnomalyDetector
from .pattern_recognition import PatternRecognizer
from .risk_scorer import RiskScorer

__all__ = [
    'FraudDetector',
    'AnomalyDetector',
    'PatternRecognizer',
    'RiskScorer',
]

__version__ = '1.0.0'
