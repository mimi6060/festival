"""
Feature Extractor for Artist Recommendation System.

This module handles:
- User feature extraction (preferences, history, interactions)
- Artist feature extraction (genres, popularity, audio features)
- Feature normalization and transformation
- Embedding generation using sentence transformers
"""

import hashlib
from datetime import datetime, timedelta
from typing import Optional

import numpy as np
from cachetools import TTLCache
from sentence_transformers import SentenceTransformer
from sklearn.preprocessing import MinMaxScaler, StandardScaler

from .types import (
    ArtistFeatures,
    InteractionType,
    SpotifyAudioFeatures,
    UserInteraction,
    UserPreferences,
)


class FeatureExtractor:
    """
    Extracts and transforms features for artists and users.

    Uses sentence transformers for text embeddings and various
    normalization techniques for numerical features.
    """

    # Interaction weights for computing user-artist affinity
    INTERACTION_WEIGHTS = {
        InteractionType.FAVORITE: 5.0,
        InteractionType.ATTENDED: 4.0,
        InteractionType.ADD_TO_SCHEDULE: 3.5,
        InteractionType.LISTEN: 2.0,
        InteractionType.LIKE: 2.5,
        InteractionType.SHARE: 3.0,
        InteractionType.CLICK: 1.0,
        InteractionType.SKIP: -1.5,
    }

    # Time decay half-life in days
    TIME_DECAY_HALFLIFE = 30

    def __init__(
        self,
        embedding_model_name: str = "all-MiniLM-L6-v2",
        embedding_dim: int = 384,
        cache_ttl: int = 3600,
    ):
        """
        Initialize the feature extractor.

        Args:
            embedding_model_name: Name of the sentence transformer model
            embedding_dim: Dimension of embeddings
            cache_ttl: Cache time-to-live in seconds
        """
        self.embedding_dim = embedding_dim
        self._model: Optional[SentenceTransformer] = None
        self._model_name = embedding_model_name

        # Caches
        self._embedding_cache = TTLCache(maxsize=10000, ttl=cache_ttl)
        self._feature_cache = TTLCache(maxsize=5000, ttl=cache_ttl)

        # Scalers
        self._popularity_scaler = MinMaxScaler()
        self._audio_scaler = StandardScaler()

        # Genre vocabulary (can be expanded)
        self.genre_vocabulary = self._build_genre_vocabulary()

    @property
    def model(self) -> SentenceTransformer:
        """Lazy load the embedding model."""
        if self._model is None:
            self._model = SentenceTransformer(self._model_name)
        return self._model

    def _build_genre_vocabulary(self) -> dict[str, int]:
        """Build a vocabulary of common music genres."""
        genres = [
            "rock", "pop", "electronic", "hip-hop", "rap", "jazz", "blues",
            "classical", "country", "folk", "indie", "alternative", "metal",
            "punk", "r&b", "soul", "funk", "disco", "house", "techno",
            "trance", "dubstep", "drum and bass", "ambient", "synthwave",
            "reggae", "ska", "latin", "world", "acoustic", "singer-songwriter",
            "dance", "edm", "trap", "lo-fi", "chillwave", "shoegaze",
            "post-rock", "progressive", "psychedelic", "grunge", "emo",
            "hardcore", "death metal", "black metal", "thrash metal",
            "power metal", "symphonic metal", "gothic", "industrial",
            "new wave", "synth-pop", "darkwave", "ebm", "minimal",
            "deep house", "progressive house", "tech house", "melodic techno",
            "hard techno", "acid", "breakbeat", "jungle", "garage",
            "grime", "uk bass", "future bass", "tropical house", "moombahton",
            "afrobeat", "afropop", "dancehall", "dub", "roots reggae",
            "bossa nova", "salsa", "cumbia", "bachata", "reggaeton",
            "flamenco", "fado", "chanson", "schlager", "k-pop", "j-pop",
            "anime", "video game", "film score", "orchestral", "choral",
            "opera", "baroque", "romantic", "contemporary classical"
        ]
        return {genre: idx for idx, genre in enumerate(genres)}

    def _cache_key(self, prefix: str, *args) -> str:
        """Generate a cache key from prefix and arguments."""
        key_str = f"{prefix}:" + ":".join(str(arg) for arg in args)
        return hashlib.md5(key_str.encode()).hexdigest()

    # =========================================================================
    # ARTIST FEATURE EXTRACTION
    # =========================================================================

    def extract_artist_features(
        self,
        artist_id: str,
        name: str,
        genres: list[str],
        sub_genres: Optional[list[str]] = None,
        spotify_followers: int = 0,
        spotify_monthly_listeners: int = 0,
        spotify_popularity: int = 0,
        lastfm_playcount: int = 0,
        lastfm_listeners: int = 0,
        audio_features: Optional[SpotifyAudioFeatures] = None,
        similar_artists: Optional[list[str]] = None,
        tags: Optional[list[str]] = None,
    ) -> ArtistFeatures:
        """
        Extract comprehensive features for an artist.

        Args:
            artist_id: Unique artist identifier
            name: Artist name
            genres: List of primary genres
            sub_genres: List of sub-genres
            spotify_followers: Spotify follower count
            spotify_monthly_listeners: Monthly Spotify listeners
            spotify_popularity: Spotify popularity score (0-100)
            lastfm_playcount: Last.fm total plays
            lastfm_listeners: Last.fm unique listeners
            audio_features: Spotify audio features for top tracks
            similar_artists: List of similar artist IDs
            tags: User-generated tags

        Returns:
            ArtistFeatures object with all extracted features
        """
        cache_key = self._cache_key("artist", artist_id)
        if cache_key in self._feature_cache:
            return self._feature_cache[cache_key]

        # Compute popularity score (normalized)
        popularity_score = self._compute_popularity_score(
            spotify_followers=spotify_followers,
            spotify_monthly_listeners=spotify_monthly_listeners,
            spotify_popularity=spotify_popularity,
            lastfm_playcount=lastfm_playcount,
            lastfm_listeners=lastfm_listeners,
        )

        # Extract audio features as dict if provided
        audio_features_dict = None
        if audio_features:
            audio_features_dict = {
                "danceability": audio_features.danceability,
                "energy": audio_features.energy,
                "loudness": audio_features.loudness,
                "speechiness": audio_features.speechiness,
                "acousticness": audio_features.acousticness,
                "instrumentalness": audio_features.instrumentalness,
                "liveness": audio_features.liveness,
                "valence": audio_features.valence,
                "tempo": audio_features.tempo,
            }

        # Generate embedding for artist
        embedding = self._generate_artist_embedding(
            name=name,
            genres=genres,
            sub_genres=sub_genres or [],
            tags=tags or [],
        )

        features = ArtistFeatures(
            artist_id=artist_id,
            name=name,
            genres=genres,
            sub_genres=sub_genres or [],
            popularity_score=popularity_score,
            spotify_followers=spotify_followers,
            spotify_monthly_listeners=spotify_monthly_listeners,
            spotify_popularity=spotify_popularity,
            lastfm_playcount=lastfm_playcount,
            lastfm_listeners=lastfm_listeners,
            audio_features=audio_features_dict,
            similar_artists=similar_artists or [],
            tags=tags or [],
            embedding=embedding,
        )

        self._feature_cache[cache_key] = features
        return features

    def _compute_popularity_score(
        self,
        spotify_followers: int = 0,
        spotify_monthly_listeners: int = 0,
        spotify_popularity: int = 0,
        lastfm_playcount: int = 0,
        lastfm_listeners: int = 0,
    ) -> float:
        """
        Compute a normalized popularity score from various metrics.

        Uses log-scaling to handle the wide range of values.
        """
        # Log-scale the raw counts (add 1 to avoid log(0))
        log_followers = np.log1p(spotify_followers)
        log_listeners = np.log1p(spotify_monthly_listeners)
        log_playcount = np.log1p(lastfm_playcount)
        log_lastfm_listeners = np.log1p(lastfm_listeners)

        # Normalize Spotify popularity (already 0-100)
        norm_spotify_pop = spotify_popularity / 100.0

        # Weighted combination (weights based on signal quality)
        weights = {
            "spotify_pop": 0.30,
            "monthly_listeners": 0.25,
            "followers": 0.20,
            "lastfm_playcount": 0.15,
            "lastfm_listeners": 0.10,
        }

        # Normalize log values to 0-1 range using reasonable upper bounds
        # (based on top artists: ~100M listeners, ~90M followers)
        norm_listeners = min(log_listeners / np.log1p(100_000_000), 1.0)
        norm_followers = min(log_followers / np.log1p(90_000_000), 1.0)
        norm_playcount = min(log_playcount / np.log1p(10_000_000_000), 1.0)
        norm_lastfm = min(log_lastfm_listeners / np.log1p(50_000_000), 1.0)

        score = (
            weights["spotify_pop"] * norm_spotify_pop
            + weights["monthly_listeners"] * norm_listeners
            + weights["followers"] * norm_followers
            + weights["lastfm_playcount"] * norm_playcount
            + weights["lastfm_listeners"] * norm_lastfm
        )

        return float(min(max(score, 0.0), 1.0))

    def _generate_artist_embedding(
        self,
        name: str,
        genres: list[str],
        sub_genres: list[str],
        tags: list[str],
    ) -> list[float]:
        """
        Generate an embedding vector for an artist.

        Combines name, genres, and tags into a text representation
        and encodes it using a sentence transformer.
        """
        cache_key = self._cache_key("embedding", name, tuple(genres))
        if cache_key in self._embedding_cache:
            return self._embedding_cache[cache_key]

        # Build text representation
        all_genres = genres + sub_genres
        text_parts = [name]

        if all_genres:
            text_parts.append("genres: " + ", ".join(all_genres[:10]))

        if tags:
            text_parts.append("style: " + ", ".join(tags[:10]))

        text = " | ".join(text_parts)

        # Generate embedding
        embedding = self.model.encode(text, convert_to_numpy=True)
        embedding_list = embedding.tolist()

        self._embedding_cache[cache_key] = embedding_list
        return embedding_list

    def get_genre_vector(self, genres: list[str]) -> np.ndarray:
        """
        Convert genres to a multi-hot encoded vector.

        Args:
            genres: List of genre strings

        Returns:
            Binary vector of shape (len(genre_vocabulary),)
        """
        vector = np.zeros(len(self.genre_vocabulary), dtype=np.float32)
        for genre in genres:
            genre_lower = genre.lower().strip()
            if genre_lower in self.genre_vocabulary:
                vector[self.genre_vocabulary[genre_lower]] = 1.0
        return vector

    # =========================================================================
    # USER FEATURE EXTRACTION
    # =========================================================================

    def extract_user_preferences(
        self,
        user_id: str,
        favorite_artist_ids: list[str],
        listened_artist_ids: list[str],
        attended_artist_ids: list[str],
        disliked_artist_ids: list[str],
        favorite_genres: list[str],
        interactions: Optional[list[UserInteraction]] = None,
    ) -> UserPreferences:
        """
        Extract user preferences from various signals.

        Args:
            user_id: Unique user identifier
            favorite_artist_ids: IDs of favorited artists
            listened_artist_ids: IDs of artists from listening history
            attended_artist_ids: IDs of artists seen at past festivals
            disliked_artist_ids: IDs of disliked artists
            favorite_genres: User's preferred genres
            interactions: Raw interaction history

        Returns:
            UserPreferences object
        """
        return UserPreferences(
            user_id=user_id,
            favorite_genres=favorite_genres,
            favorite_artists=favorite_artist_ids,
            listened_artists=listened_artist_ids,
            attended_artists=attended_artist_ids,
            disliked_artists=disliked_artist_ids,
        )

    def compute_user_artist_affinity(
        self,
        user_id: str,
        artist_id: str,
        interactions: list[UserInteraction],
    ) -> float:
        """
        Compute affinity score between a user and an artist.

        Uses interaction history with type-based weights and time decay.

        Args:
            user_id: User identifier
            artist_id: Artist identifier
            interactions: List of user interactions with this artist

        Returns:
            Affinity score (higher = stronger preference)
        """
        if not interactions:
            return 0.0

        # Filter to relevant interactions
        relevant = [
            i for i in interactions
            if i.user_id == user_id and i.artist_id == artist_id
        ]

        if not relevant:
            return 0.0

        now = datetime.utcnow()
        total_score = 0.0

        for interaction in relevant:
            # Get base weight for interaction type
            base_weight = self.INTERACTION_WEIGHTS.get(
                interaction.interaction_type, 1.0
            )

            # Apply interaction-specific weight multiplier
            weight = base_weight * interaction.weight

            # Apply time decay
            days_ago = (now - interaction.timestamp).days
            decay = 0.5 ** (days_ago / self.TIME_DECAY_HALFLIFE)

            total_score += weight * decay

        # Normalize to 0-1 range using sigmoid-like function
        normalized = 1.0 / (1.0 + np.exp(-total_score / 5.0))
        return float(normalized)

    def generate_user_embedding(
        self,
        preferences: UserPreferences,
        artist_features: dict[str, ArtistFeatures],
    ) -> np.ndarray:
        """
        Generate a user embedding based on their preferences.

        Creates an embedding by averaging the embeddings of
        artists the user has interacted with positively.

        Args:
            preferences: User preferences
            artist_features: Dict mapping artist_id to ArtistFeatures

        Returns:
            User embedding vector
        """
        # Collect embeddings from various sources with different weights
        weighted_embeddings = []
        weights = []

        # Favorite artists (highest weight)
        for artist_id in preferences.favorite_artists:
            if artist_id in artist_features:
                feat = artist_features[artist_id]
                if feat.embedding:
                    weighted_embeddings.append(np.array(feat.embedding))
                    weights.append(3.0)

        # Attended artists
        for artist_id in preferences.attended_artists:
            if artist_id in artist_features:
                feat = artist_features[artist_id]
                if feat.embedding:
                    weighted_embeddings.append(np.array(feat.embedding))
                    weights.append(2.5)

        # Listened artists
        for artist_id in preferences.listened_artists:
            if artist_id in artist_features:
                feat = artist_features[artist_id]
                if feat.embedding:
                    weighted_embeddings.append(np.array(feat.embedding))
                    weights.append(1.5)

        if not weighted_embeddings:
            # Return zero embedding if no data
            return np.zeros(self.embedding_dim, dtype=np.float32)

        # Weighted average
        weights_array = np.array(weights).reshape(-1, 1)
        embeddings_array = np.array(weighted_embeddings)
        user_embedding = np.average(embeddings_array, axis=0, weights=weights.copy())

        # Normalize
        norm = np.linalg.norm(user_embedding)
        if norm > 0:
            user_embedding = user_embedding / norm

        return user_embedding.astype(np.float32)

    # =========================================================================
    # FEATURE SIMILARITY
    # =========================================================================

    def compute_genre_similarity(
        self,
        genres_a: list[str],
        genres_b: list[str],
    ) -> float:
        """
        Compute Jaccard similarity between two genre lists.

        Args:
            genres_a: First genre list
            genres_b: Second genre list

        Returns:
            Similarity score between 0 and 1
        """
        if not genres_a or not genres_b:
            return 0.0

        set_a = set(g.lower() for g in genres_a)
        set_b = set(g.lower() for g in genres_b)

        intersection = len(set_a & set_b)
        union = len(set_a | set_b)

        return intersection / union if union > 0 else 0.0

    def compute_embedding_similarity(
        self,
        embedding_a: list[float],
        embedding_b: list[float],
    ) -> float:
        """
        Compute cosine similarity between two embeddings.

        Args:
            embedding_a: First embedding vector
            embedding_b: Second embedding vector

        Returns:
            Cosine similarity between -1 and 1
        """
        vec_a = np.array(embedding_a)
        vec_b = np.array(embedding_b)

        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)

        if norm_a == 0 or norm_b == 0:
            return 0.0

        return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))

    def compute_audio_similarity(
        self,
        features_a: dict[str, float],
        features_b: dict[str, float],
    ) -> float:
        """
        Compute similarity between audio feature vectors.

        Uses Euclidean distance normalized to 0-1 similarity.

        Args:
            features_a: First audio features dict
            features_b: Second audio features dict

        Returns:
            Similarity score between 0 and 1
        """
        # Features to compare (excluding tempo and loudness which have different scales)
        feature_keys = [
            "danceability", "energy", "speechiness", "acousticness",
            "instrumentalness", "liveness", "valence"
        ]

        vec_a = []
        vec_b = []

        for key in feature_keys:
            if key in features_a and key in features_b:
                vec_a.append(features_a[key])
                vec_b.append(features_b[key])

        if not vec_a:
            return 0.0

        # Euclidean distance
        distance = np.linalg.norm(np.array(vec_a) - np.array(vec_b))

        # Convert to similarity (max distance is sqrt(7) for 7 features in 0-1 range)
        max_distance = np.sqrt(len(vec_a))
        similarity = 1.0 - (distance / max_distance)

        return float(max(0.0, similarity))

    # =========================================================================
    # BATCH OPERATIONS
    # =========================================================================

    def batch_extract_artist_embeddings(
        self,
        artists: list[dict],
    ) -> dict[str, list[float]]:
        """
        Extract embeddings for multiple artists efficiently.

        Args:
            artists: List of artist dicts with 'id', 'name', 'genres', 'tags'

        Returns:
            Dict mapping artist_id to embedding vector
        """
        texts = []
        artist_ids = []

        for artist in artists:
            artist_id = artist.get("id", artist.get("artist_id"))
            name = artist.get("name", "")
            genres = artist.get("genres", [])
            tags = artist.get("tags", [])

            # Check cache first
            cache_key = self._cache_key("embedding", name, tuple(genres))
            if cache_key in self._embedding_cache:
                continue

            text_parts = [name]
            if genres:
                text_parts.append("genres: " + ", ".join(genres[:10]))
            if tags:
                text_parts.append("style: " + ", ".join(tags[:10]))

            texts.append(" | ".join(text_parts))
            artist_ids.append(artist_id)

        # Batch encode new texts
        if texts:
            embeddings = self.model.encode(texts, convert_to_numpy=True)
            for artist_id, embedding in zip(artist_ids, embeddings):
                cache_key = self._cache_key(
                    "embedding",
                    next(a.get("name", "") for a in artists if a.get("id") == artist_id or a.get("artist_id") == artist_id),
                    tuple(next((a.get("genres", []) for a in artists if a.get("id") == artist_id or a.get("artist_id") == artist_id), []))
                )
                self._embedding_cache[cache_key] = embedding.tolist()

        # Collect all results
        results = {}
        for artist in artists:
            artist_id = artist.get("id", artist.get("artist_id"))
            name = artist.get("name", "")
            genres = artist.get("genres", [])
            cache_key = self._cache_key("embedding", name, tuple(genres))
            if cache_key in self._embedding_cache:
                results[artist_id] = self._embedding_cache[cache_key]

        return results

    def clear_cache(self) -> None:
        """Clear all caches."""
        self._embedding_cache.clear()
        self._feature_cache.clear()
