"""
Intent Classifier Module
Classifies user messages into predefined intents using sentence embeddings
"""

import logging
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional
import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class Intent(str, Enum):
    """Supported chatbot intents for festival management"""

    # FAQ Intents
    FAQ_HOURS = "faq_hours"  # Horaires du festival
    FAQ_ACCESS = "faq_access"  # Comment acceder au festival
    FAQ_RULES = "faq_rules"  # Reglement interieur
    FAQ_PARKING = "faq_parking"  # Informations parking
    FAQ_TRANSPORT = "faq_transport"  # Transports en commun

    # Program Intents
    PROGRAM_ARTISTS = "program_artists"  # Infos sur les artistes
    PROGRAM_STAGES = "program_stages"  # Infos sur les scenes
    PROGRAM_SCHEDULE = "program_schedule"  # Programme horaire
    PROGRAM_FAVORITES = "program_favorites"  # Mes artistes favoris

    # Cashless Intents
    CASHLESS_BALANCE = "cashless_balance"  # Consulter solde
    CASHLESS_TOPUP = "cashless_topup"  # Recharger compte
    CASHLESS_PROBLEM = "cashless_problem"  # Probleme cashless
    CASHLESS_REFUND = "cashless_refund"  # Remboursement cashless

    # Ticketing Intents
    TICKET_BUY = "ticket_buy"  # Acheter un billet
    TICKET_MODIFY = "ticket_modify"  # Modifier ma reservation
    TICKET_CANCEL = "ticket_cancel"  # Annuler mon billet
    TICKET_STATUS = "ticket_status"  # Statut de ma commande
    TICKET_QRCODE = "ticket_qrcode"  # Probleme QR code

    # Navigation Intents
    NAVIGATION_WHERE = "navigation_where"  # Ou est X?
    NAVIGATION_WC = "navigation_wc"  # Ou sont les toilettes
    NAVIGATION_FOOD = "navigation_food"  # Ou manger/boire
    NAVIGATION_MEDICAL = "navigation_medical"  # Point medical

    # Emergency Intents
    EMERGENCY_MEDICAL = "emergency_medical"  # Urgence medicale
    EMERGENCY_SECURITY = "emergency_security"  # Probleme securite
    EMERGENCY_FIRE = "emergency_fire"  # Incendie

    # Lost & Found Intents
    LOST_ITEM_REPORT = "lost_item_report"  # Signaler objet perdu
    LOST_ITEM_FOUND = "lost_item_found"  # J'ai trouve un objet
    LOST_ITEM_STATUS = "lost_item_status"  # Statut objet perdu

    # General Intents
    GREETING = "greeting"  # Salutations
    GOODBYE = "goodbye"  # Au revoir
    THANKS = "thanks"  # Merci
    HELP = "help"  # Aide generale
    HUMAN_ESCALATION = "human_escalation"  # Parler a un humain
    UNKNOWN = "unknown"  # Intent non reconnu


@dataclass
class IntentResult:
    """Result of intent classification"""

    intent: Intent
    confidence: float
    all_scores: dict[str, float] = field(default_factory=dict)
    requires_escalation: bool = False


# Training examples for each intent (French and English)
INTENT_EXAMPLES: dict[Intent, list[str]] = {
    # FAQ
    Intent.FAQ_HOURS: [
        "quels sont les horaires du festival",
        "a quelle heure ouvre le festival",
        "heure fermeture",
        "quand commence le festival",
        "what time does the festival open",
        "opening hours",
        "when does it start",
        "horaires d'ouverture",
    ],
    Intent.FAQ_ACCESS: [
        "comment acceder au festival",
        "ou est l'entree principale",
        "comment venir au festival",
        "how to get to the festival",
        "where is the entrance",
        "acces au site",
        "plan d'acces",
    ],
    Intent.FAQ_RULES: [
        "quelles sont les regles",
        "reglement interieur",
        "qu'est-ce qui est interdit",
        "what are the rules",
        "what is forbidden",
        "peut-on apporter de la nourriture",
        "objets interdits",
    ],
    Intent.FAQ_PARKING: [
        "ou se garer",
        "parking disponible",
        "prix du parking",
        "where to park",
        "parking information",
        "places de parking",
    ],
    Intent.FAQ_TRANSPORT: [
        "comment venir en transport",
        "bus pour le festival",
        "navette",
        "public transport",
        "shuttle bus",
        "metro station",
        "gare la plus proche",
    ],
    # Program
    Intent.PROGRAM_ARTISTS: [
        "qui sont les artistes",
        "lineup",
        "programmation artistes",
        "which artists are playing",
        "headliners",
        "tetes d'affiche",
        "artiste ce soir",
    ],
    Intent.PROGRAM_STAGES: [
        "combien de scenes",
        "ou est la main stage",
        "plan des scenes",
        "where are the stages",
        "stage locations",
        "scene principale",
    ],
    Intent.PROGRAM_SCHEDULE: [
        "programme du jour",
        "horaires des concerts",
        "qui joue maintenant",
        "schedule for today",
        "when does X play",
        "a quelle heure joue",
        "prochains concerts",
    ],
    Intent.PROGRAM_FAVORITES: [
        "mes artistes favoris",
        "artistes que je suis",
        "my favorite artists",
        "notifications artistes",
        "rappel concert",
    ],
    # Cashless
    Intent.CASHLESS_BALANCE: [
        "quel est mon solde",
        "combien il me reste",
        "check my balance",
        "cashless balance",
        "solde cashless",
        "montant restant",
    ],
    Intent.CASHLESS_TOPUP: [
        "recharger mon compte",
        "ajouter de l'argent",
        "top up my account",
        "add money",
        "rechargement cashless",
        "crediter mon bracelet",
    ],
    Intent.CASHLESS_PROBLEM: [
        "probleme avec mon cashless",
        "mon bracelet ne marche pas",
        "cashless not working",
        "payment issue",
        "paiement refuse",
        "erreur cashless",
    ],
    Intent.CASHLESS_REFUND: [
        "remboursement cashless",
        "recuperer mon solde",
        "get my money back",
        "cashless refund",
        "rembourser mon compte",
    ],
    # Ticketing
    Intent.TICKET_BUY: [
        "acheter un billet",
        "reserver une place",
        "buy a ticket",
        "purchase tickets",
        "commander des billets",
        "places disponibles",
    ],
    Intent.TICKET_MODIFY: [
        "modifier ma reservation",
        "changer mon billet",
        "modify my booking",
        "change my ticket",
        "upgrade mon billet",
    ],
    Intent.TICKET_CANCEL: [
        "annuler ma reservation",
        "cancel my ticket",
        "demande d'annulation",
        "remboursement billet",
    ],
    Intent.TICKET_STATUS: [
        "statut de ma commande",
        "ou en est ma reservation",
        "order status",
        "confirmation de commande",
        "numero de commande",
    ],
    Intent.TICKET_QRCODE: [
        "probleme qr code",
        "qr code illisible",
        "qr code not working",
        "scan qr code",
        "mon billet ne scanne pas",
    ],
    # Navigation
    Intent.NAVIGATION_WHERE: [
        "ou est",
        "comment aller a",
        "where is",
        "how to find",
        "localisation",
        "cherche",
    ],
    Intent.NAVIGATION_WC: [
        "ou sont les toilettes",
        "wc",
        "where are the toilets",
        "bathrooms",
        "sanitaires",
        "douches",
    ],
    Intent.NAVIGATION_FOOD: [
        "ou manger",
        "restaurants",
        "food stands",
        "where to eat",
        "bars",
        "boire un verre",
        "stands nourriture",
    ],
    Intent.NAVIGATION_MEDICAL: [
        "point medical",
        "premiers secours",
        "medical point",
        "first aid",
        "infirmerie",
        "pharmacie",
    ],
    # Emergency
    Intent.EMERGENCY_MEDICAL: [
        "urgence medicale",
        "besoin d'un medecin",
        "medical emergency",
        "need a doctor",
        "accident",
        "blessure grave",
        "appeler les secours",
    ],
    Intent.EMERGENCY_SECURITY: [
        "probleme de securite",
        "agression",
        "security issue",
        "theft",
        "vol",
        "bagarre",
        "appeler la securite",
    ],
    Intent.EMERGENCY_FIRE: [
        "incendie",
        "fire",
        "feu",
        "fumee",
        "smoke",
        "evacuation",
    ],
    # Lost & Found
    Intent.LOST_ITEM_REPORT: [
        "j'ai perdu",
        "objet perdu",
        "i lost my",
        "lost item",
        "perdu mon telephone",
        "perdu mon sac",
    ],
    Intent.LOST_ITEM_FOUND: [
        "j'ai trouve un objet",
        "found something",
        "objet trouve",
        "rendre un objet",
    ],
    Intent.LOST_ITEM_STATUS: [
        "mon objet perdu",
        "retrouver mon objet",
        "lost item status",
        "avez-vous trouve",
    ],
    # General
    Intent.GREETING: [
        "bonjour",
        "salut",
        "hello",
        "hi",
        "bonsoir",
        "coucou",
        "hey",
    ],
    Intent.GOODBYE: [
        "au revoir",
        "bye",
        "goodbye",
        "a bientot",
        "bonne soiree",
        "see you",
    ],
    Intent.THANKS: [
        "merci",
        "thanks",
        "thank you",
        "merci beaucoup",
        "super merci",
        "genial merci",
    ],
    Intent.HELP: [
        "aide",
        "help",
        "que peux-tu faire",
        "what can you do",
        "comment ca marche",
        "besoin d'aide",
    ],
    Intent.HUMAN_ESCALATION: [
        "parler a un humain",
        "agent",
        "operateur",
        "talk to human",
        "real person",
        "conseiller",
        "quelqu'un de reel",
        "pas un robot",
    ],
}


class IntentClassifier:
    """
    Intent classifier using sentence embeddings and cosine similarity
    Supports French and English languages
    """

    def __init__(
        self,
        model_name: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        confidence_threshold: float = 0.7,
        fallback_threshold: float = 0.5,
    ):
        """
        Initialize the intent classifier

        Args:
            model_name: HuggingFace model for sentence embeddings
            confidence_threshold: Minimum confidence to accept an intent
            fallback_threshold: Threshold below which we suggest escalation
        """
        self.confidence_threshold = confidence_threshold
        self.fallback_threshold = fallback_threshold

        logger.info(f"Loading sentence transformer model: {model_name}")
        self.model = SentenceTransformer(model_name)

        # Pre-compute embeddings for all intent examples
        self._intent_embeddings: dict[Intent, np.ndarray] = {}
        self._compute_intent_embeddings()

        logger.info(f"Intent classifier initialized with {len(INTENT_EXAMPLES)} intents")

    def _compute_intent_embeddings(self) -> None:
        """Pre-compute embeddings for all training examples"""
        for intent, examples in INTENT_EXAMPLES.items():
            embeddings = self.model.encode(examples, convert_to_numpy=True)
            # Store mean embedding for each intent
            self._intent_embeddings[intent] = np.mean(embeddings, axis=0)

    def classify(self, text: str) -> IntentResult:
        """
        Classify a user message into an intent

        Args:
            text: User message to classify

        Returns:
            IntentResult with detected intent and confidence
        """
        if not text or not text.strip():
            return IntentResult(
                intent=Intent.UNKNOWN,
                confidence=0.0,
                requires_escalation=True,
            )

        # Encode user message
        user_embedding = self.model.encode(text, convert_to_numpy=True)

        # Calculate cosine similarity with each intent
        scores: dict[str, float] = {}
        for intent, intent_embedding in self._intent_embeddings.items():
            similarity = self._cosine_similarity(user_embedding, intent_embedding)
            scores[intent.value] = float(similarity)

        # Find best matching intent
        best_intent_value = max(scores, key=scores.get)  # type: ignore
        best_score = scores[best_intent_value]

        # Convert to Intent enum
        best_intent = Intent(best_intent_value)

        # Check if confidence is high enough
        if best_score < self.confidence_threshold:
            if best_score < self.fallback_threshold:
                return IntentResult(
                    intent=Intent.UNKNOWN,
                    confidence=best_score,
                    all_scores=scores,
                    requires_escalation=True,
                )
            else:
                # Low confidence but might be correct
                return IntentResult(
                    intent=best_intent,
                    confidence=best_score,
                    all_scores=scores,
                    requires_escalation=False,
                )

        return IntentResult(
            intent=best_intent,
            confidence=best_score,
            all_scores=scores,
            requires_escalation=False,
        )

    def classify_top_k(self, text: str, k: int = 3) -> list[IntentResult]:
        """
        Get top-k intent predictions

        Args:
            text: User message
            k: Number of top predictions to return

        Returns:
            List of top-k IntentResults
        """
        user_embedding = self.model.encode(text, convert_to_numpy=True)

        scores: list[tuple[Intent, float]] = []
        for intent, intent_embedding in self._intent_embeddings.items():
            similarity = self._cosine_similarity(user_embedding, intent_embedding)
            scores.append((intent, float(similarity)))

        # Sort by score descending
        scores.sort(key=lambda x: x[1], reverse=True)

        results = []
        for intent, score in scores[:k]:
            results.append(
                IntentResult(
                    intent=intent,
                    confidence=score,
                    requires_escalation=score < self.fallback_threshold,
                )
            )

        return results

    @staticmethod
    def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors"""
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

    def add_training_examples(self, intent: Intent, examples: list[str]) -> None:
        """
        Add new training examples for an intent (runtime fine-tuning)

        Args:
            intent: Target intent
            examples: New example sentences
        """
        if intent not in INTENT_EXAMPLES:
            INTENT_EXAMPLES[intent] = []

        INTENT_EXAMPLES[intent].extend(examples)

        # Recompute embedding for this intent
        all_examples = INTENT_EXAMPLES[intent]
        embeddings = self.model.encode(all_examples, convert_to_numpy=True)
        self._intent_embeddings[intent] = np.mean(embeddings, axis=0)

        logger.info(f"Added {len(examples)} examples for intent {intent.value}")
