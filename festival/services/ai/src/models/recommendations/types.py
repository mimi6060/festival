"""
Type definitions for the Artist Recommendation System.

This module defines all data models, enums, and type hints used
throughout the recommendation system.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# =============================================================================
# ENUMS
# =============================================================================


class RecommendationSource(str, Enum):
    """Source of a recommendation."""

    COLLABORATIVE = "collaborative"
    CONTENT_BASED = "content_based"
    HYBRID = "hybrid"
    TRENDING = "trending"
    COLD_START = "cold_start"
    SIMILAR_ARTISTS = "similar_artists"
    SPOTIFY = "spotify"
    LASTFM = "lastfm"


class InteractionType(str, Enum):
    """Types of user-artist interactions."""

    FAVORITE = "favorite"
    LISTEN = "listen"
    ATTENDED = "attended"
    SHARE = "share"
    LIKE = "like"
    CLICK = "click"
    SKIP = "skip"
    ADD_TO_SCHEDULE = "add_to_schedule"


class FeedbackType(str, Enum):
    """Types of feedback a user can provide."""

    LIKE = "like"
    DISLIKE = "dislike"
    NOT_INTERESTED = "not_interested"
    ALREADY_SEEN = "already_seen"


class ModelType(str, Enum):
    """Available recommendation model types."""

    ALS = "als"  # Alternating Least Squares
    BPR = "bpr"  # Bayesian Personalized Ranking
    LIGHTFM = "lightfm"  # Hybrid model
    CONTENT = "content"  # Content-based
    GRAPH = "graph"  # Graph neural network


# =============================================================================
# ARTIST MODELS
# =============================================================================


class ArtistFeatures(BaseModel):
    """Features extracted from an artist for content-based recommendations."""

    artist_id: str
    name: str
    genres: list[str] = Field(default_factory=list)
    sub_genres: list[str] = Field(default_factory=list)
    popularity_score: float = Field(default=0.0, ge=0.0, le=1.0)
    spotify_followers: int = Field(default=0, ge=0)
    spotify_monthly_listeners: int = Field(default=0, ge=0)
    spotify_popularity: int = Field(default=0, ge=0, le=100)
    lastfm_playcount: int = Field(default=0, ge=0)
    lastfm_listeners: int = Field(default=0, ge=0)
    audio_features: Optional[dict[str, float]] = None  # tempo, energy, danceability, etc.
    similar_artists: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    embedding: Optional[list[float]] = None  # Pre-computed embedding vector

    class Config:
        json_schema_extra = {
            "example": {
                "artist_id": "artist-123",
                "name": "The Midnight",
                "genres": ["synthwave", "electronic"],
                "sub_genres": ["retrowave", "darksynth"],
                "popularity_score": 0.75,
                "spotify_followers": 500000,
                "spotify_monthly_listeners": 2000000,
                "spotify_popularity": 72,
            }
        }


class ArtistPerformance(BaseModel):
    """Artist performance at a festival."""

    performance_id: str
    artist_id: str
    festival_id: str
    stage_id: str
    stage_name: str
    start_time: datetime
    end_time: datetime
    day: str
    is_headliner: bool = False


class SimilarArtist(BaseModel):
    """An artist similar to another artist."""

    artist_id: str
    name: str
    similarity_score: float = Field(ge=0.0, le=1.0)
    genres: list[str] = Field(default_factory=list)
    image_url: Optional[str] = None
    reason: str = ""  # e.g., "Similar genre", "Fans also like"


# =============================================================================
# USER MODELS
# =============================================================================


class UserPreferences(BaseModel):
    """User preferences for recommendations."""

    user_id: str
    favorite_genres: list[str] = Field(default_factory=list)
    favorite_artists: list[str] = Field(default_factory=list)
    listened_artists: list[str] = Field(default_factory=list)  # From Spotify/Last.fm
    attended_artists: list[str] = Field(default_factory=list)  # Past festival attendance
    disliked_artists: list[str] = Field(default_factory=list)
    preferred_performance_times: list[str] = Field(default_factory=list)  # e.g., ["evening", "night"]
    avoid_conflicts: bool = True  # Avoid recommending artists with overlapping times

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user-456",
                "favorite_genres": ["electronic", "rock"],
                "favorite_artists": ["artist-123", "artist-789"],
                "listened_artists": ["artist-111", "artist-222"],
            }
        }


class UserInteraction(BaseModel):
    """A single user-artist interaction."""

    user_id: str
    artist_id: str
    interaction_type: InteractionType
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    festival_id: Optional[str] = None
    weight: float = Field(default=1.0, ge=0.0)  # Interaction importance
    metadata: dict[str, Any] = Field(default_factory=dict)


class UserFeedback(BaseModel):
    """User feedback on a recommendation."""

    user_id: str
    artist_id: str
    recommendation_id: Optional[str] = None
    feedback_type: FeedbackType
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    source: RecommendationSource = RecommendationSource.HYBRID


# =============================================================================
# RECOMMENDATION MODELS
# =============================================================================


class Recommendation(BaseModel):
    """A single artist recommendation."""

    artist_id: str
    name: str
    score: float = Field(ge=0.0, le=1.0)
    source: RecommendationSource
    genres: list[str] = Field(default_factory=list)
    image_url: Optional[str] = None
    reason: str = ""  # Human-readable explanation
    performance: Optional[ArtistPerformance] = None
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    rank: int = Field(default=0, ge=0)

    class Config:
        json_schema_extra = {
            "example": {
                "artist_id": "artist-123",
                "name": "The Midnight",
                "score": 0.92,
                "source": "hybrid",
                "genres": ["synthwave", "electronic"],
                "reason": "Based on your love of FM-84 and Timecop1983",
                "confidence": 0.88,
                "rank": 1,
            }
        }


class RecommendationRequest(BaseModel):
    """Request for personalized recommendations."""

    user_id: str
    festival_id: str
    limit: int = Field(default=10, ge=1, le=100)
    exclude_artists: list[str] = Field(default_factory=list)
    include_genres: Optional[list[str]] = None
    exclude_genres: Optional[list[str]] = None
    model_type: Optional[ModelType] = None
    include_performance_info: bool = True
    diversity_factor: float = Field(default=0.3, ge=0.0, le=1.0)


class RecommendationResponse(BaseModel):
    """Response containing personalized recommendations."""

    user_id: str
    festival_id: str
    recommendations: list[Recommendation]
    total_count: int
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    model_version: str = "1.0.0"
    ab_test_group: Optional[str] = None
    request_id: str = ""
    processing_time_ms: float = 0.0


class TrendingRequest(BaseModel):
    """Request for trending artists."""

    festival_id: str
    limit: int = Field(default=10, ge=1, le=50)
    time_window_hours: int = Field(default=24, ge=1, le=168)
    genre_filter: Optional[list[str]] = None


class TrendingArtist(BaseModel):
    """A trending artist with trend metrics."""

    artist_id: str
    name: str
    genres: list[str] = Field(default_factory=list)
    image_url: Optional[str] = None
    trend_score: float = Field(ge=0.0, le=1.0)
    interaction_count: int = Field(default=0, ge=0)
    change_percent: float = 0.0  # Change vs previous period
    rank: int = Field(default=0, ge=0)
    performance: Optional[ArtistPerformance] = None


class TrendingResponse(BaseModel):
    """Response containing trending artists."""

    festival_id: str
    artists: list[TrendingArtist]
    time_window_hours: int
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# =============================================================================
# MODEL CONFIGURATION
# =============================================================================


class ModelConfig(BaseModel):
    """Configuration for recommendation models."""

    model_type: ModelType
    embedding_dim: int = Field(default=64, ge=8, le=512)
    num_factors: int = Field(default=64, ge=8, le=256)
    regularization: float = Field(default=0.01, ge=0.0, le=1.0)
    learning_rate: float = Field(default=0.01, ge=0.0001, le=1.0)
    num_iterations: int = Field(default=50, ge=1, le=500)
    num_threads: int = Field(default=4, ge=1, le=32)
    use_gpu: bool = False
    random_seed: int = Field(default=42)


class ABTestConfig(BaseModel):
    """Configuration for A/B testing recommendation models."""

    test_name: str
    model_a: ModelType
    model_b: ModelType
    traffic_split: float = Field(default=0.5, ge=0.0, le=1.0)  # % to model_a
    start_date: datetime
    end_date: Optional[datetime] = None
    is_active: bool = True
    metrics_to_track: list[str] = Field(
        default_factory=lambda: ["click_rate", "conversion_rate", "engagement"]
    )


# =============================================================================
# SPOTIFY / LASTFM INTEGRATION TYPES
# =============================================================================


class SpotifyArtistData(BaseModel):
    """Data fetched from Spotify API for an artist."""

    spotify_id: str
    name: str
    genres: list[str] = Field(default_factory=list)
    popularity: int = Field(default=0, ge=0, le=100)
    followers: int = Field(default=0, ge=0)
    image_url: Optional[str] = None
    external_url: Optional[str] = None
    top_tracks: list[str] = Field(default_factory=list)
    related_artists: list[str] = Field(default_factory=list)


class SpotifyAudioFeatures(BaseModel):
    """Audio features for tracks from Spotify."""

    track_id: str
    danceability: float = Field(ge=0.0, le=1.0)
    energy: float = Field(ge=0.0, le=1.0)
    loudness: float
    speechiness: float = Field(ge=0.0, le=1.0)
    acousticness: float = Field(ge=0.0, le=1.0)
    instrumentalness: float = Field(ge=0.0, le=1.0)
    liveness: float = Field(ge=0.0, le=1.0)
    valence: float = Field(ge=0.0, le=1.0)  # Musical positivity
    tempo: float = Field(ge=0.0)
    time_signature: int = Field(default=4, ge=1, le=7)


class LastFmArtistData(BaseModel):
    """Data fetched from Last.fm API for an artist."""

    mbid: Optional[str] = None  # MusicBrainz ID
    name: str
    playcount: int = Field(default=0, ge=0)
    listeners: int = Field(default=0, ge=0)
    tags: list[str] = Field(default_factory=list)
    similar_artists: list[str] = Field(default_factory=list)
    bio_summary: Optional[str] = None


class UserListeningHistory(BaseModel):
    """User's listening history from external services."""

    user_id: str
    source: str  # "spotify" or "lastfm"
    top_artists: list[str] = Field(default_factory=list)
    top_genres: list[str] = Field(default_factory=list)
    recent_tracks: list[str] = Field(default_factory=list)
    total_listens: int = Field(default=0, ge=0)
    fetched_at: datetime = Field(default_factory=datetime.utcnow)


# =============================================================================
# METRICS AND EVALUATION
# =============================================================================


class RecommendationMetrics(BaseModel):
    """Metrics for evaluating recommendation quality."""

    precision_at_k: dict[int, float] = Field(default_factory=dict)
    recall_at_k: dict[int, float] = Field(default_factory=dict)
    ndcg_at_k: dict[int, float] = Field(default_factory=dict)
    mrr: float = 0.0  # Mean Reciprocal Rank
    coverage: float = 0.0  # Catalog coverage
    diversity: float = 0.0  # Intra-list diversity
    novelty: float = 0.0  # How novel recommendations are
    serendipity: float = 0.0  # Unexpected good recommendations


class ModelEvaluation(BaseModel):
    """Evaluation results for a recommendation model."""

    model_type: ModelType
    model_version: str
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)
    metrics: RecommendationMetrics
    num_users_evaluated: int = 0
    num_interactions: int = 0
    training_time_seconds: float = 0.0
    inference_time_ms: float = 0.0
