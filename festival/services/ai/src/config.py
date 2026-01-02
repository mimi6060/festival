"""
Configuration module for Festival AI Service.

Uses pydantic-settings for environment variable management and validation.
"""

from functools import lru_cache
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        env_prefix="AI_",
    )

    # ==========================================================================
    # Application Settings
    # ==========================================================================
    app_name: str = Field(default="festival-ai-service", description="Application name")
    app_env: str = Field(default="development", description="Environment (development/staging/production)")
    debug: bool = Field(default=False, description="Enable debug mode")
    log_level: str = Field(default="INFO", description="Logging level")
    api_prefix: str = Field(default="/api/v1", description="API prefix for all routes")

    # ==========================================================================
    # Server Settings
    # ==========================================================================
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    workers: int = Field(default=1, description="Number of workers")
    reload: bool = Field(default=False, description="Enable auto-reload")

    # ==========================================================================
    # NestJS Backend Settings
    # ==========================================================================
    backend_url: str = Field(
        default="http://localhost:3000",
        description="NestJS backend URL",
    )
    backend_api_key: Optional[str] = Field(
        default=None,
        description="API key for backend communication",
    )

    # ==========================================================================
    # Database Settings (PostgreSQL)
    # ==========================================================================
    database_url: str = Field(
        default="postgresql+asyncpg://festival:festival123@localhost:5432/festival",
        description="PostgreSQL connection string",
    )
    database_pool_size: int = Field(default=5, description="Database connection pool size")
    database_max_overflow: int = Field(default=10, description="Max overflow connections")
    database_echo: bool = Field(default=False, description="Echo SQL statements")

    # ==========================================================================
    # Redis Settings
    # ==========================================================================
    redis_url: str = Field(
        default="redis://localhost:6379/1",
        description="Redis connection URL",
    )
    redis_cache_ttl: int = Field(default=3600, description="Default cache TTL in seconds")
    redis_prediction_ttl: int = Field(default=300, description="Prediction cache TTL in seconds")
    redis_session_ttl: int = Field(default=3600, description="Session TTL in seconds")

    # ==========================================================================
    # JWT Settings (shared with NestJS backend)
    # ==========================================================================
    jwt_secret: str = Field(
        default="your-super-secret-jwt-key-min-32-chars",
        description="JWT secret key (must match NestJS backend)",
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT algorithm")
    jwt_expiration: int = Field(default=3600, description="JWT expiration in seconds")

    # ==========================================================================
    # CORS Settings
    # ==========================================================================
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:3001,http://localhost:4200",
        description="Allowed CORS origins (comma-separated)",
    )
    cors_allow_credentials: bool = Field(default=True, description="Allow credentials in CORS")
    cors_allow_methods: str = Field(default="*", description="Allowed HTTP methods")
    cors_allow_headers: str = Field(default="*", description="Allowed HTTP headers")

    # ==========================================================================
    # MLflow Settings
    # ==========================================================================
    mlflow_tracking_uri: str = Field(
        default="http://localhost:5000",
        description="MLflow tracking server URI",
    )
    mlflow_experiment_name: str = Field(
        default="festival-ml",
        description="MLflow experiment name",
    )
    mlflow_registry_uri: Optional[str] = Field(
        default=None,
        description="MLflow model registry URI",
    )

    # ==========================================================================
    # Model Settings
    # ==========================================================================
    models_path: str = Field(default="./models", description="Path to saved models")
    auto_load_models: bool = Field(default=True, description="Auto-load models on startup")
    model_cache_size: int = Field(default=10, description="Max number of models in memory cache")

    # NLP Models
    model_name: str = Field(
        default="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        description="Sentence transformer model name",
    )
    intent_confidence_threshold: float = Field(default=0.7, description="Intent classification threshold")
    fallback_threshold: float = Field(default=0.5, description="Fallback threshold")
    max_conversation_history: int = Field(default=10, description="Max conversation history")

    # ==========================================================================
    # Language Settings
    # ==========================================================================
    supported_languages: List[str] = Field(
        default=["fr", "en"],
        description="Supported languages",
    )
    default_language: str = Field(default="fr", description="Default language")

    # ==========================================================================
    # Escalation Settings
    # ==========================================================================
    escalation_keywords: List[str] = Field(
        default=["parler humain", "agent", "operateur", "human", "operator", "speak to someone"],
        description="Keywords triggering human escalation",
    )
    escalation_after_failures: int = Field(default=3, description="Escalate after N failures")

    # ==========================================================================
    # Prometheus Settings
    # ==========================================================================
    prometheus_enabled: bool = Field(default=True, description="Enable Prometheus metrics")
    prometheus_port: int = Field(default=9090, description="Prometheus metrics port")

    # ==========================================================================
    # Validators
    # ==========================================================================
    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str) -> str:
        """Ensure CORS origins is a string."""
        if isinstance(v, list):
            return ",".join(v)
        return v

    @field_validator("log_level", mode="before")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Validate log level."""
        valid_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        upper_v = v.upper()
        if upper_v not in valid_levels:
            raise ValueError(f"Invalid log level: {v}. Must be one of {valid_levels}")
        return upper_v

    @field_validator("app_env", mode="before")
    @classmethod
    def validate_app_env(cls, v: str) -> str:
        """Validate application environment."""
        valid_envs = {"development", "staging", "production", "test"}
        lower_v = v.lower()
        if lower_v not in valid_envs:
            raise ValueError(f"Invalid environment: {v}. Must be one of {valid_envs}")
        return lower_v

    # ==========================================================================
    # Properties
    # ==========================================================================
    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development."""
        return self.app_env == "development"

    @property
    def cors_origins_list(self) -> List[str]:
        """Get CORS origins as a list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.

    Uses LRU cache to ensure settings are only loaded once.

    Returns:
        Settings: Application settings instance.
    """
    return Settings()


# Convenience alias
settings = get_settings()
