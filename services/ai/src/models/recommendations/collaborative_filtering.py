"""
Collaborative Filtering Module for Artist Recommendations

Implements multiple collaborative filtering approaches:
- Matrix Factorization (ALS) using implicit library
- User-based collaborative filtering
- Item-based collaborative filtering (artist similarity)
- Hybrid approach combining multiple signals

Designed for festival artist recommendations based on:
- User favorites
- Concert attendance
- Similar user preferences
- Interaction patterns (views, likes, shares)

Performance: Optimized for <100ms recommendation latency
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from scipy import sparse
import pickle
import hashlib

logger = logging.getLogger(__name__)

# Try to import optional ML libraries
try:
    from implicit.als import AlternatingLeastSquares
    from implicit.nearest_neighbours import CosineRecommender
    IMPLICIT_AVAILABLE = True
except ImportError:
    IMPLICIT_AVAILABLE = False
    logger.warning("implicit library not available, using fallback")

try:
    from sklearn.metrics.pairwise import cosine_similarity
    from sklearn.preprocessing import normalize
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warning("sklearn not available for similarity calculations")


class InteractionType(str, Enum):
    """Types of user-artist interactions"""
    VIEW = "view"           # User viewed artist profile
    FAVORITE = "favorite"   # User added to favorites
    ATTEND = "attend"       # User attended concert
    SHARE = "share"         # User shared artist
    RATE = "rate"           # User rated artist
    PLAYLIST = "playlist"   # User added to playlist


# Interaction weights for confidence scoring
INTERACTION_WEIGHTS: Dict[InteractionType, float] = {
    InteractionType.VIEW: 1.0,
    InteractionType.FAVORITE: 5.0,
    InteractionType.ATTEND: 10.0,
    InteractionType.SHARE: 3.0,
    InteractionType.RATE: 4.0,
    InteractionType.PLAYLIST: 4.0,
}


@dataclass
class UserInteraction:
    """Represents a user-artist interaction"""
    user_id: str
    artist_id: str
    interaction_type: InteractionType
    timestamp: datetime
    weight: float = 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def get_confidence_score(self) -> float:
        """Calculate confidence score based on interaction type and recency"""
        base_weight = INTERACTION_WEIGHTS.get(self.interaction_type, 1.0)

        # Time decay factor (more recent = higher weight)
        days_ago = (datetime.utcnow() - self.timestamp).days
        time_decay = 1.0 / (1.0 + 0.01 * days_ago)  # Slow decay

        return base_weight * self.weight * time_decay


@dataclass
class RecommendationResult:
    """A single artist recommendation"""
    artist_id: str
    score: float
    rank: int
    reason: str
    similar_to: Optional[List[str]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RecommendationBatch:
    """Batch of recommendations for a user"""
    user_id: str
    recommendations: List[RecommendationResult]
    model_version: str
    generated_at: datetime
    processing_time_ms: float


class MatrixFactorizationModel:
    """
    Matrix Factorization using Alternating Least Squares (ALS)

    Decomposes user-item interaction matrix into latent factors.
    Excellent for implicit feedback data (views, favorites, etc.)
    """

    def __init__(
        self,
        factors: int = 64,
        regularization: float = 0.01,
        iterations: int = 15,
        use_gpu: bool = False,
        random_state: int = 42,
    ):
        """
        Initialize ALS model

        Args:
            factors: Number of latent factors
            regularization: L2 regularization strength
            iterations: Number of ALS iterations
            use_gpu: Whether to use GPU acceleration
            random_state: Random seed for reproducibility
        """
        self.factors = factors
        self.regularization = regularization
        self.iterations = iterations
        self.use_gpu = use_gpu
        self.random_state = random_state

        self.model: Optional[AlternatingLeastSquares] = None
        self.user_id_map: Dict[str, int] = {}
        self.artist_id_map: Dict[str, int] = {}
        self.reverse_artist_map: Dict[int, str] = {}
        self.interaction_matrix: Optional[sparse.csr_matrix] = None

        self._is_trained = False
        self._version = "1.0.0"

    def _build_interaction_matrix(
        self,
        interactions: List[UserInteraction],
    ) -> sparse.csr_matrix:
        """Build sparse user-artist interaction matrix"""
        # Create ID mappings
        unique_users = list(set(i.user_id for i in interactions))
        unique_artists = list(set(i.artist_id for i in interactions))

        self.user_id_map = {uid: idx for idx, uid in enumerate(unique_users)}
        self.artist_id_map = {aid: idx for idx, aid in enumerate(unique_artists)}
        self.reverse_artist_map = {idx: aid for aid, idx in self.artist_id_map.items()}

        n_users = len(unique_users)
        n_artists = len(unique_artists)

        logger.info(f"Building matrix: {n_users} users x {n_artists} artists")

        # Build sparse matrix
        rows = []
        cols = []
        data = []

        for interaction in interactions:
            user_idx = self.user_id_map[interaction.user_id]
            artist_idx = self.artist_id_map[interaction.artist_id]
            confidence = interaction.get_confidence_score()

            rows.append(user_idx)
            cols.append(artist_idx)
            data.append(confidence)

        matrix = sparse.coo_matrix(
            (data, (rows, cols)),
            shape=(n_users, n_artists),
            dtype=np.float32
        )

        return matrix.tocsr()

    def train(
        self,
        interactions: List[UserInteraction],
    ) -> Dict[str, Any]:
        """
        Train the ALS model

        Args:
            interactions: List of user-artist interactions

        Returns:
            Training metrics
        """
        if not IMPLICIT_AVAILABLE:
            logger.warning("implicit library not available, skipping ALS training")
            return {'status': 'skipped', 'reason': 'implicit not available'}

        logger.info(f"Training ALS model on {len(interactions)} interactions...")

        start_time = datetime.utcnow()

        # Build interaction matrix
        self.interaction_matrix = self._build_interaction_matrix(interactions)

        # Initialize and train model
        self.model = AlternatingLeastSquares(
            factors=self.factors,
            regularization=self.regularization,
            iterations=self.iterations,
            use_gpu=self.use_gpu,
            random_state=self.random_state,
        )

        # ALS expects item-user matrix (transposed)
        self.model.fit(self.interaction_matrix.T)

        self._is_trained = True

        training_time = (datetime.utcnow() - start_time).total_seconds()

        metrics = {
            'status': 'success',
            'n_users': len(self.user_id_map),
            'n_artists': len(self.artist_id_map),
            'n_interactions': len(interactions),
            'factors': self.factors,
            'training_time_seconds': training_time,
            'matrix_density': self.interaction_matrix.nnz / (
                self.interaction_matrix.shape[0] * self.interaction_matrix.shape[1]
            ),
        }

        logger.info(f"ALS training completed: {metrics}")

        return metrics

    def recommend(
        self,
        user_id: str,
        n: int = 10,
        filter_already_liked: bool = True,
    ) -> List[Tuple[str, float]]:
        """
        Get top-N recommendations for a user

        Args:
            user_id: User ID
            n: Number of recommendations
            filter_already_liked: Whether to exclude already interacted items

        Returns:
            List of (artist_id, score) tuples
        """
        if not self._is_trained or self.model is None:
            logger.warning("Model not trained, returning empty recommendations")
            return []

        if user_id not in self.user_id_map:
            logger.debug(f"Unknown user {user_id}, returning popular artists")
            return self._get_popular_artists(n)

        user_idx = self.user_id_map[user_id]

        # Get user's interaction vector
        user_items = self.interaction_matrix[user_idx]

        # Get recommendations
        artist_indices, scores = self.model.recommend(
            userid=user_idx,
            user_items=user_items,
            N=n,
            filter_already_liked_items=filter_already_liked,
        )

        # Convert back to artist IDs
        recommendations = [
            (self.reverse_artist_map[idx], float(score))
            for idx, score in zip(artist_indices, scores)
        ]

        return recommendations

    def similar_artists(
        self,
        artist_id: str,
        n: int = 10,
    ) -> List[Tuple[str, float]]:
        """
        Find similar artists based on latent factors

        Args:
            artist_id: Artist ID
            n: Number of similar artists

        Returns:
            List of (artist_id, similarity_score) tuples
        """
        if not self._is_trained or self.model is None:
            return []

        if artist_id not in self.artist_id_map:
            return []

        artist_idx = self.artist_id_map[artist_id]

        # Get similar items
        similar_indices, scores = self.model.similar_items(
            itemid=artist_idx,
            N=n + 1,  # Include self
        )

        # Convert back to artist IDs, excluding self
        similar = [
            (self.reverse_artist_map[idx], float(score))
            for idx, score in zip(similar_indices, scores)
            if idx != artist_idx
        ][:n]

        return similar

    def _get_popular_artists(self, n: int) -> List[Tuple[str, float]]:
        """Get most popular artists (fallback for unknown users)"""
        if self.interaction_matrix is None:
            return []

        # Sum interactions per artist
        artist_popularity = np.array(self.interaction_matrix.sum(axis=0)).flatten()

        # Get top N
        top_indices = np.argsort(artist_popularity)[::-1][:n]

        return [
            (self.reverse_artist_map[idx], float(artist_popularity[idx]))
            for idx in top_indices
        ]

    def save(self, path: Path) -> None:
        """Save model to disk"""
        if not self._is_trained:
            logger.warning("Model not trained, nothing to save")
            return

        model_data = {
            'model': self.model,
            'user_id_map': self.user_id_map,
            'artist_id_map': self.artist_id_map,
            'reverse_artist_map': self.reverse_artist_map,
            'interaction_matrix': self.interaction_matrix,
            'config': {
                'factors': self.factors,
                'regularization': self.regularization,
                'iterations': self.iterations,
            },
            'version': self._version,
        }

        with open(path, 'wb') as f:
            pickle.dump(model_data, f)

        logger.info(f"ALS model saved to {path}")

    def load(self, path: Path) -> None:
        """Load model from disk"""
        with open(path, 'rb') as f:
            model_data = pickle.load(f)

        self.model = model_data['model']
        self.user_id_map = model_data['user_id_map']
        self.artist_id_map = model_data['artist_id_map']
        self.reverse_artist_map = model_data['reverse_artist_map']
        self.interaction_matrix = model_data['interaction_matrix']
        self._version = model_data.get('version', '1.0.0')
        self._is_trained = True

        logger.info(f"ALS model loaded from {path}")


class UserBasedCF:
    """
    User-based Collaborative Filtering

    Recommends artists liked by similar users.
    Good for discovering diverse recommendations.
    """

    def __init__(
        self,
        n_neighbors: int = 50,
        min_common_items: int = 3,
    ):
        """
        Initialize user-based CF

        Args:
            n_neighbors: Number of similar users to consider
            min_common_items: Minimum common items for similarity
        """
        self.n_neighbors = n_neighbors
        self.min_common_items = min_common_items

        self.user_id_map: Dict[str, int] = {}
        self.artist_id_map: Dict[str, int] = {}
        self.reverse_artist_map: Dict[int, str] = {}
        self.user_vectors: Optional[np.ndarray] = None
        self.user_similarity: Optional[np.ndarray] = None

        self._is_trained = False

    def train(
        self,
        interactions: List[UserInteraction],
    ) -> Dict[str, Any]:
        """Train user-based CF model"""
        logger.info(f"Training User-based CF on {len(interactions)} interactions...")

        # Build user-item matrix
        unique_users = list(set(i.user_id for i in interactions))
        unique_artists = list(set(i.artist_id for i in interactions))

        self.user_id_map = {uid: idx for idx, uid in enumerate(unique_users)}
        self.artist_id_map = {aid: idx for idx, aid in enumerate(unique_artists)}
        self.reverse_artist_map = {idx: aid for aid, idx in self.artist_id_map.items()}

        n_users = len(unique_users)
        n_artists = len(unique_artists)

        # Build user vectors
        self.user_vectors = np.zeros((n_users, n_artists), dtype=np.float32)

        for interaction in interactions:
            user_idx = self.user_id_map[interaction.user_id]
            artist_idx = self.artist_id_map[interaction.artist_id]
            confidence = interaction.get_confidence_score()
            self.user_vectors[user_idx, artist_idx] += confidence

        # Normalize user vectors
        if SKLEARN_AVAILABLE:
            self.user_vectors = normalize(self.user_vectors, norm='l2', axis=1)

            # Compute user similarity matrix (lazy, compute on demand)
            # For large datasets, we don't precompute the full similarity matrix
            self.user_similarity = None

        self._is_trained = True

        return {
            'status': 'success',
            'n_users': n_users,
            'n_artists': n_artists,
            'n_interactions': len(interactions),
        }

    def recommend(
        self,
        user_id: str,
        n: int = 10,
    ) -> List[Tuple[str, float]]:
        """Get recommendations for a user based on similar users"""
        if not self._is_trained or self.user_vectors is None:
            return []

        if user_id not in self.user_id_map:
            return []

        user_idx = self.user_id_map[user_id]
        user_vector = self.user_vectors[user_idx]

        # Find similar users
        if SKLEARN_AVAILABLE:
            similarities = cosine_similarity(
                user_vector.reshape(1, -1),
                self.user_vectors
            ).flatten()
        else:
            # Fallback: simple dot product
            similarities = np.dot(self.user_vectors, user_vector)

        # Get top similar users (excluding self)
        similar_user_indices = np.argsort(similarities)[::-1][1:self.n_neighbors + 1]

        # Aggregate recommendations from similar users
        scores = np.zeros(self.user_vectors.shape[1])

        for sim_user_idx in similar_user_indices:
            sim_score = similarities[sim_user_idx]
            if sim_score > 0:
                # Add weighted preferences
                scores += sim_score * self.user_vectors[sim_user_idx]

        # Remove already interacted items
        scores[user_vector > 0] = -np.inf

        # Get top N
        top_indices = np.argsort(scores)[::-1][:n]

        recommendations = [
            (self.reverse_artist_map[idx], float(scores[idx]))
            for idx in top_indices
            if scores[idx] > 0
        ]

        return recommendations

    def save(self, path: Path) -> None:
        """Save model to disk"""
        if not self._is_trained:
            return

        model_data = {
            'user_id_map': self.user_id_map,
            'artist_id_map': self.artist_id_map,
            'reverse_artist_map': self.reverse_artist_map,
            'user_vectors': self.user_vectors,
            'config': {
                'n_neighbors': self.n_neighbors,
                'min_common_items': self.min_common_items,
            },
        }

        with open(path, 'wb') as f:
            pickle.dump(model_data, f)

    def load(self, path: Path) -> None:
        """Load model from disk"""
        with open(path, 'rb') as f:
            model_data = pickle.load(f)

        self.user_id_map = model_data['user_id_map']
        self.artist_id_map = model_data['artist_id_map']
        self.reverse_artist_map = model_data['reverse_artist_map']
        self.user_vectors = model_data['user_vectors']
        self._is_trained = True


class ItemBasedCF:
    """
    Item-based Collaborative Filtering

    Recommends artists similar to those the user already likes.
    More stable than user-based CF for large datasets.
    """

    def __init__(
        self,
        n_neighbors: int = 50,
    ):
        """
        Initialize item-based CF

        Args:
            n_neighbors: Number of similar items to consider
        """
        self.n_neighbors = n_neighbors

        self.user_id_map: Dict[str, int] = {}
        self.artist_id_map: Dict[str, int] = {}
        self.reverse_artist_map: Dict[int, str] = {}
        self.item_vectors: Optional[np.ndarray] = None
        self.item_similarity: Optional[np.ndarray] = None
        self.user_item_matrix: Optional[np.ndarray] = None

        self._is_trained = False

    def train(
        self,
        interactions: List[UserInteraction],
    ) -> Dict[str, Any]:
        """Train item-based CF model"""
        logger.info(f"Training Item-based CF on {len(interactions)} interactions...")

        # Build item-user matrix
        unique_users = list(set(i.user_id for i in interactions))
        unique_artists = list(set(i.artist_id for i in interactions))

        self.user_id_map = {uid: idx for idx, uid in enumerate(unique_users)}
        self.artist_id_map = {aid: idx for idx, aid in enumerate(unique_artists)}
        self.reverse_artist_map = {idx: aid for aid, idx in self.artist_id_map.items()}

        n_users = len(unique_users)
        n_artists = len(unique_artists)

        # Build user-item matrix
        self.user_item_matrix = np.zeros((n_users, n_artists), dtype=np.float32)

        for interaction in interactions:
            user_idx = self.user_id_map[interaction.user_id]
            artist_idx = self.artist_id_map[interaction.artist_id]
            confidence = interaction.get_confidence_score()
            self.user_item_matrix[user_idx, artist_idx] += confidence

        # Build item vectors (transpose of user-item matrix)
        self.item_vectors = self.user_item_matrix.T  # (n_artists, n_users)

        # Normalize item vectors
        if SKLEARN_AVAILABLE:
            self.item_vectors = normalize(self.item_vectors, norm='l2', axis=1)

            # Compute item similarity matrix
            # For efficiency, we could compute this lazily or use approximate methods
            self.item_similarity = cosine_similarity(self.item_vectors)
        else:
            self.item_similarity = np.dot(self.item_vectors, self.item_vectors.T)

        self._is_trained = True

        return {
            'status': 'success',
            'n_users': n_users,
            'n_artists': n_artists,
            'n_interactions': len(interactions),
        }

    def recommend(
        self,
        user_id: str,
        n: int = 10,
    ) -> List[Tuple[str, float]]:
        """Get recommendations for a user based on item similarity"""
        if not self._is_trained or self.item_similarity is None:
            return []

        if user_id not in self.user_id_map:
            return []

        user_idx = self.user_id_map[user_id]
        user_preferences = self.user_item_matrix[user_idx]

        # Get artists the user has interacted with
        liked_indices = np.where(user_preferences > 0)[0]

        if len(liked_indices) == 0:
            return []

        # Aggregate scores from similar items
        scores = np.zeros(self.item_similarity.shape[0])

        for liked_idx in liked_indices:
            preference_weight = user_preferences[liked_idx]
            # Add weighted similarity scores
            scores += preference_weight * self.item_similarity[liked_idx]

        # Remove already interacted items
        scores[liked_indices] = -np.inf

        # Get top N
        top_indices = np.argsort(scores)[::-1][:n]

        recommendations = [
            (self.reverse_artist_map[idx], float(scores[idx]))
            for idx in top_indices
            if scores[idx] > 0
        ]

        return recommendations

    def similar_artists(
        self,
        artist_id: str,
        n: int = 10,
    ) -> List[Tuple[str, float]]:
        """Find similar artists based on co-occurrence patterns"""
        if not self._is_trained or self.item_similarity is None:
            return []

        if artist_id not in self.artist_id_map:
            return []

        artist_idx = self.artist_id_map[artist_id]
        similarities = self.item_similarity[artist_idx]

        # Get top similar (excluding self)
        top_indices = np.argsort(similarities)[::-1][1:n + 1]

        similar = [
            (self.reverse_artist_map[idx], float(similarities[idx]))
            for idx in top_indices
        ]

        return similar

    def save(self, path: Path) -> None:
        """Save model to disk"""
        if not self._is_trained:
            return

        model_data = {
            'user_id_map': self.user_id_map,
            'artist_id_map': self.artist_id_map,
            'reverse_artist_map': self.reverse_artist_map,
            'item_similarity': self.item_similarity,
            'user_item_matrix': self.user_item_matrix,
            'config': {
                'n_neighbors': self.n_neighbors,
            },
        }

        with open(path, 'wb') as f:
            pickle.dump(model_data, f)

    def load(self, path: Path) -> None:
        """Load model from disk"""
        with open(path, 'rb') as f:
            model_data = pickle.load(f)

        self.user_id_map = model_data['user_id_map']
        self.artist_id_map = model_data['artist_id_map']
        self.reverse_artist_map = model_data['reverse_artist_map']
        self.item_similarity = model_data['item_similarity']
        self.user_item_matrix = model_data['user_item_matrix']
        self._is_trained = True


class CollaborativeFilteringEnsemble:
    """
    Ensemble of collaborative filtering methods

    Combines Matrix Factorization, User-based CF, and Item-based CF
    for robust recommendations.
    """

    def __init__(
        self,
        als_weight: float = 0.5,
        user_cf_weight: float = 0.25,
        item_cf_weight: float = 0.25,
        als_factors: int = 64,
        n_neighbors: int = 50,
    ):
        """
        Initialize CF ensemble

        Args:
            als_weight: Weight for ALS recommendations
            user_cf_weight: Weight for user-based CF
            item_cf_weight: Weight for item-based CF
            als_factors: Number of ALS factors
            n_neighbors: Number of neighbors for CF methods
        """
        self.als_weight = als_weight
        self.user_cf_weight = user_cf_weight
        self.item_cf_weight = item_cf_weight

        # Normalize weights
        total_weight = als_weight + user_cf_weight + item_cf_weight
        self.als_weight /= total_weight
        self.user_cf_weight /= total_weight
        self.item_cf_weight /= total_weight

        # Initialize models
        self.als_model = MatrixFactorizationModel(factors=als_factors)
        self.user_cf = UserBasedCF(n_neighbors=n_neighbors)
        self.item_cf = ItemBasedCF(n_neighbors=n_neighbors)

        self._is_trained = False
        self._version = "1.0.0"

    def train(
        self,
        interactions: List[UserInteraction],
    ) -> Dict[str, Any]:
        """
        Train all CF models

        Args:
            interactions: List of user-artist interactions

        Returns:
            Training metrics for all models
        """
        logger.info(f"Training CF Ensemble on {len(interactions)} interactions...")

        metrics = {
            'als': self.als_model.train(interactions),
            'user_cf': self.user_cf.train(interactions),
            'item_cf': self.item_cf.train(interactions),
        }

        self._is_trained = True

        return metrics

    def recommend(
        self,
        user_id: str,
        n: int = 10,
        diversity_factor: float = 0.0,
    ) -> List[RecommendationResult]:
        """
        Get ensemble recommendations

        Args:
            user_id: User ID
            n: Number of recommendations
            diversity_factor: Factor to promote diversity (0-1)

        Returns:
            List of RecommendationResult objects
        """
        if not self._is_trained:
            return []

        import time
        start_time = time.perf_counter()

        # Get recommendations from each model
        als_recs = dict(self.als_model.recommend(user_id, n * 2))
        user_cf_recs = dict(self.user_cf.recommend(user_id, n * 2))
        item_cf_recs = dict(self.item_cf.recommend(user_id, n * 2))

        # Combine scores
        all_artists = set(als_recs.keys()) | set(user_cf_recs.keys()) | set(item_cf_recs.keys())

        combined_scores: Dict[str, Tuple[float, str]] = {}

        for artist_id in all_artists:
            als_score = als_recs.get(artist_id, 0) * self.als_weight
            user_score = user_cf_recs.get(artist_id, 0) * self.user_cf_weight
            item_score = item_cf_recs.get(artist_id, 0) * self.item_cf_weight

            total_score = als_score + user_score + item_score

            # Determine primary reason
            reasons = []
            if als_score > 0:
                reasons.append("matrix_factorization")
            if user_score > 0:
                reasons.append("similar_users")
            if item_score > 0:
                reasons.append("similar_to_favorites")

            reason = reasons[0] if reasons else "popular"
            combined_scores[artist_id] = (total_score, reason)

        # Sort by score
        sorted_artists = sorted(
            combined_scores.items(),
            key=lambda x: x[1][0],
            reverse=True
        )

        # Apply diversity if requested
        if diversity_factor > 0:
            sorted_artists = self._apply_diversity(sorted_artists, diversity_factor)

        # Create results
        processing_time = (time.perf_counter() - start_time) * 1000

        results = []
        for rank, (artist_id, (score, reason)) in enumerate(sorted_artists[:n]):
            results.append(RecommendationResult(
                artist_id=artist_id,
                score=score,
                rank=rank + 1,
                reason=reason,
                similar_to=None,  # Could be populated from item_cf
                metadata={
                    'als_score': als_recs.get(artist_id, 0),
                    'user_cf_score': user_cf_recs.get(artist_id, 0),
                    'item_cf_score': item_cf_recs.get(artist_id, 0),
                },
            ))

        logger.debug(f"Generated {len(results)} recommendations in {processing_time:.2f}ms")

        return results

    def _apply_diversity(
        self,
        recommendations: List[Tuple[str, Tuple[float, str]]],
        diversity_factor: float,
    ) -> List[Tuple[str, Tuple[float, str]]]:
        """Apply diversity by promoting less similar items"""
        # Simple diversity: re-rank based on position
        # More sophisticated methods could use item similarity
        diverse_recs = []
        seen = set()

        for i, rec in enumerate(recommendations):
            if rec[0] not in seen:
                # Apply diversity penalty to highly ranked items
                penalty = diversity_factor * (1.0 / (i + 1))
                new_score = rec[1][0] * (1 - penalty)
                diverse_recs.append((rec[0], (new_score, rec[1][1])))
                seen.add(rec[0])

        return sorted(diverse_recs, key=lambda x: x[1][0], reverse=True)

    def similar_artists(
        self,
        artist_id: str,
        n: int = 10,
    ) -> List[Tuple[str, float]]:
        """Get similar artists using ensemble"""
        als_similar = dict(self.als_model.similar_artists(artist_id, n * 2))
        item_similar = dict(self.item_cf.similar_artists(artist_id, n * 2))

        # Combine
        all_artists = set(als_similar.keys()) | set(item_similar.keys())

        combined = []
        for aid in all_artists:
            score = (
                als_similar.get(aid, 0) * 0.6 +
                item_similar.get(aid, 0) * 0.4
            )
            combined.append((aid, score))

        combined.sort(key=lambda x: x[1], reverse=True)

        return combined[:n]

    def save(self, model_dir: Path) -> None:
        """Save all models"""
        model_dir.mkdir(parents=True, exist_ok=True)

        self.als_model.save(model_dir / 'als_model.pkl')
        self.user_cf.save(model_dir / 'user_cf_model.pkl')
        self.item_cf.save(model_dir / 'item_cf_model.pkl')

        # Save ensemble config
        config = {
            'als_weight': self.als_weight,
            'user_cf_weight': self.user_cf_weight,
            'item_cf_weight': self.item_cf_weight,
            'version': self._version,
        }

        with open(model_dir / 'ensemble_config.pkl', 'wb') as f:
            pickle.dump(config, f)

        logger.info(f"CF Ensemble saved to {model_dir}")

    def load(self, model_dir: Path) -> None:
        """Load all models"""
        self.als_model.load(model_dir / 'als_model.pkl')
        self.user_cf.load(model_dir / 'user_cf_model.pkl')
        self.item_cf.load(model_dir / 'item_cf_model.pkl')

        with open(model_dir / 'ensemble_config.pkl', 'rb') as f:
            config = pickle.load(f)

        self.als_weight = config['als_weight']
        self.user_cf_weight = config['user_cf_weight']
        self.item_cf_weight = config['item_cf_weight']
        self._version = config.get('version', '1.0.0')
        self._is_trained = True

        logger.info(f"CF Ensemble loaded from {model_dir}")


# Convenience function to create user interactions from database data
def create_interactions_from_db(
    db_interactions: List[Dict[str, Any]],
) -> List[UserInteraction]:
    """
    Convert database interaction records to UserInteraction objects

    Args:
        db_interactions: List of dicts with user_id, artist_id, type, timestamp

    Returns:
        List of UserInteraction objects
    """
    interactions = []

    for record in db_interactions:
        try:
            interaction_type = InteractionType(record.get('type', 'view'))
        except ValueError:
            interaction_type = InteractionType.VIEW

        timestamp = record.get('timestamp')
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp)
        elif timestamp is None:
            timestamp = datetime.utcnow()

        interactions.append(UserInteraction(
            user_id=str(record['user_id']),
            artist_id=str(record['artist_id']),
            interaction_type=interaction_type,
            timestamp=timestamp,
            weight=record.get('weight', 1.0),
            metadata=record.get('metadata', {}),
        ))

    return interactions
