"""
Dialog Manager Module
Manages conversation state, context, and multi-turn dialog flow
"""

import logging
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional, Any
from datetime import datetime, timedelta
import uuid
import json

from .intent_classifier import Intent, IntentResult
from .entity_extractor import Entity, EntityType

logger = logging.getLogger(__name__)


class ConversationState(str, Enum):
    """States of the conversation flow"""

    GREETING = "greeting"
    ACTIVE = "active"
    WAITING_INPUT = "waiting_input"
    CONFIRMATION = "confirmation"
    ESCALATING = "escalating"
    ESCALATED = "escalated"
    RESOLVED = "resolved"
    ENDED = "ended"


class SlotName(str, Enum):
    """Named slots for collecting information"""

    # Ticket slots
    TICKET_TYPE = "ticket_type"
    TICKET_QUANTITY = "ticket_quantity"
    TICKET_DATE = "ticket_date"

    # Cashless slots
    TOPUP_AMOUNT = "topup_amount"

    # Lost item slots
    LOST_ITEM_TYPE = "lost_item_type"
    LOST_ITEM_COLOR = "lost_item_color"
    LOST_ITEM_LOCATION = "lost_item_location"
    LOST_ITEM_DATE = "lost_item_date"

    # Navigation slots
    TARGET_LOCATION = "target_location"

    # Program slots
    ARTIST_NAME = "artist_name"
    STAGE_NAME = "stage_name"
    SHOW_DATE = "show_date"
    SHOW_TIME = "show_time"

    # Contact slots
    USER_EMAIL = "user_email"
    USER_PHONE = "user_phone"

    # General
    CONFIRMATION = "confirmation"


@dataclass
class SlotValue:
    """A slot value with metadata"""

    value: Any
    source: str  # "user", "system", "api"
    confidence: float = 1.0
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Message:
    """Represents a conversation message"""

    id: str
    role: str  # "user" or "assistant"
    content: str
    intent: Optional[Intent] = None
    entities: list[Entity] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ConversationContext:
    """
    Holds the full context of a conversation session
    """

    session_id: str
    festival_id: Optional[str] = None
    user_id: Optional[str] = None
    language: str = "fr"

    # State management
    state: ConversationState = ConversationState.GREETING
    current_intent: Optional[Intent] = None
    previous_intent: Optional[Intent] = None

    # Message history
    messages: list[Message] = field(default_factory=list)
    max_history: int = 10

    # Slot filling
    slots: dict[str, SlotValue] = field(default_factory=dict)
    required_slots: list[SlotName] = field(default_factory=list)
    pending_slot: Optional[SlotName] = None

    # Escalation tracking
    failure_count: int = 0
    escalation_reason: Optional[str] = None
    escalated_to: Optional[str] = None

    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_activity: datetime = field(default_factory=datetime.utcnow)

    # Metadata
    metadata: dict[str, Any] = field(default_factory=dict)

    def add_message(
        self,
        role: str,
        content: str,
        intent: Optional[Intent] = None,
        entities: Optional[list[Entity]] = None,
    ) -> Message:
        """Add a message to the conversation history"""
        message = Message(
            id=str(uuid.uuid4()),
            role=role,
            content=content,
            intent=intent,
            entities=entities or [],
        )
        self.messages.append(message)

        # Trim history if too long
        if len(self.messages) > self.max_history:
            self.messages = self.messages[-self.max_history:]

        self.last_activity = datetime.utcnow()
        return message

    def get_slot(self, slot_name: SlotName) -> Optional[Any]:
        """Get a slot value"""
        slot = self.slots.get(slot_name.value)
        return slot.value if slot else None

    def set_slot(
        self,
        slot_name: SlotName,
        value: Any,
        source: str = "user",
        confidence: float = 1.0,
    ) -> None:
        """Set a slot value"""
        self.slots[slot_name.value] = SlotValue(
            value=value,
            source=source,
            confidence=confidence,
        )

    def clear_slot(self, slot_name: SlotName) -> None:
        """Clear a slot value"""
        self.slots.pop(slot_name.value, None)

    def clear_all_slots(self) -> None:
        """Clear all slot values"""
        self.slots.clear()
        self.required_slots.clear()
        self.pending_slot = None

    def has_all_required_slots(self) -> bool:
        """Check if all required slots are filled"""
        return all(
            slot.value in self.slots for slot in self.required_slots
        )

    def get_missing_slots(self) -> list[SlotName]:
        """Get list of unfilled required slots"""
        return [
            slot for slot in self.required_slots
            if slot.value not in self.slots
        ]

    def to_dict(self) -> dict[str, Any]:
        """Convert context to dictionary for serialization"""
        return {
            "session_id": self.session_id,
            "festival_id": self.festival_id,
            "user_id": self.user_id,
            "language": self.language,
            "state": self.state.value,
            "current_intent": self.current_intent.value if self.current_intent else None,
            "previous_intent": self.previous_intent.value if self.previous_intent else None,
            "messages": [
                {
                    "id": m.id,
                    "role": m.role,
                    "content": m.content,
                    "intent": m.intent.value if m.intent else None,
                    "timestamp": m.timestamp.isoformat(),
                }
                for m in self.messages
            ],
            "slots": {
                k: {"value": v.value, "source": v.source, "confidence": v.confidence}
                for k, v in self.slots.items()
            },
            "failure_count": self.failure_count,
            "escalation_reason": self.escalation_reason,
            "created_at": self.created_at.isoformat(),
            "last_activity": self.last_activity.isoformat(),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ConversationContext":
        """Create context from dictionary"""
        context = cls(
            session_id=data["session_id"],
            festival_id=data.get("festival_id"),
            user_id=data.get("user_id"),
            language=data.get("language", "fr"),
            state=ConversationState(data.get("state", "greeting")),
            current_intent=Intent(data["current_intent"]) if data.get("current_intent") else None,
            previous_intent=Intent(data["previous_intent"]) if data.get("previous_intent") else None,
            failure_count=data.get("failure_count", 0),
            escalation_reason=data.get("escalation_reason"),
        )

        # Restore messages
        for m in data.get("messages", []):
            context.messages.append(
                Message(
                    id=m["id"],
                    role=m["role"],
                    content=m["content"],
                    intent=Intent(m["intent"]) if m.get("intent") else None,
                    timestamp=datetime.fromisoformat(m["timestamp"]),
                )
            )

        # Restore slots
        for k, v in data.get("slots", {}).items():
            context.slots[k] = SlotValue(
                value=v["value"],
                source=v.get("source", "system"),
                confidence=v.get("confidence", 1.0),
            )

        # Restore timestamps
        if "created_at" in data:
            context.created_at = datetime.fromisoformat(data["created_at"])
        if "last_activity" in data:
            context.last_activity = datetime.fromisoformat(data["last_activity"])

        return context


# Intent to required slots mapping
INTENT_SLOT_REQUIREMENTS: dict[Intent, list[SlotName]] = {
    Intent.TICKET_BUY: [SlotName.TICKET_TYPE, SlotName.TICKET_QUANTITY],
    Intent.CASHLESS_TOPUP: [SlotName.TOPUP_AMOUNT],
    Intent.LOST_ITEM_REPORT: [SlotName.LOST_ITEM_TYPE, SlotName.LOST_ITEM_LOCATION],
    Intent.PROGRAM_ARTISTS: [],
    Intent.PROGRAM_SCHEDULE: [],
    Intent.NAVIGATION_WHERE: [SlotName.TARGET_LOCATION],
}


class DialogManager:
    """
    Manages conversation flow, state transitions, and slot filling
    """

    def __init__(
        self,
        max_failures_before_escalation: int = 3,
        session_timeout_minutes: int = 30,
    ):
        """
        Initialize the dialog manager

        Args:
            max_failures_before_escalation: Number of low-confidence intents before escalating
            session_timeout_minutes: Session timeout in minutes
        """
        self.max_failures = max_failures_before_escalation
        self.session_timeout = timedelta(minutes=session_timeout_minutes)

        logger.info(
            f"Dialog manager initialized (escalation after {max_failures_before_escalation} failures)"
        )

    def create_session(
        self,
        festival_id: Optional[str] = None,
        user_id: Optional[str] = None,
        language: str = "fr",
    ) -> ConversationContext:
        """
        Create a new conversation session

        Args:
            festival_id: ID of the current festival
            user_id: ID of the user (if authenticated)
            language: Preferred language

        Returns:
            New ConversationContext
        """
        session_id = str(uuid.uuid4())

        context = ConversationContext(
            session_id=session_id,
            festival_id=festival_id,
            user_id=user_id,
            language=language,
            state=ConversationState.GREETING,
        )

        logger.info(f"Created new session: {session_id}")
        return context

    def process_turn(
        self,
        context: ConversationContext,
        user_message: str,
        intent_result: IntentResult,
        entities: list[Entity],
    ) -> ConversationContext:
        """
        Process a conversation turn and update context

        Args:
            context: Current conversation context
            user_message: User's message
            intent_result: Result from intent classification
            entities: Extracted entities

        Returns:
            Updated ConversationContext
        """
        # Add user message to history
        context.add_message(
            role="user",
            content=user_message,
            intent=intent_result.intent,
            entities=entities,
        )

        # Update intent tracking
        context.previous_intent = context.current_intent
        context.current_intent = intent_result.intent

        # Check for escalation request
        if intent_result.intent == Intent.HUMAN_ESCALATION:
            context.state = ConversationState.ESCALATING
            context.escalation_reason = "user_requested"
            logger.info(f"Session {context.session_id}: User requested escalation")
            return context

        # Check for low confidence (potential escalation)
        if intent_result.requires_escalation:
            context.failure_count += 1
            if context.failure_count >= self.max_failures:
                context.state = ConversationState.ESCALATING
                context.escalation_reason = "multiple_failures"
                logger.info(
                    f"Session {context.session_id}: Escalating after {context.failure_count} failures"
                )
                return context

        # Handle greeting/goodbye intents
        if intent_result.intent == Intent.GREETING:
            context.state = ConversationState.ACTIVE
            context.failure_count = 0  # Reset on successful greeting
            return context

        if intent_result.intent == Intent.GOODBYE:
            context.state = ConversationState.ENDED
            return context

        # Handle successful intent recognition
        if intent_result.confidence >= 0.7:
            context.failure_count = 0  # Reset failure count

        # Update state based on intent
        context.state = ConversationState.ACTIVE

        # Set up slot requirements for the intent
        if intent_result.intent in INTENT_SLOT_REQUIREMENTS:
            required_slots = INTENT_SLOT_REQUIREMENTS[intent_result.intent]
            if required_slots:
                context.required_slots = required_slots.copy()

                # Try to fill slots from entities
                self._fill_slots_from_entities(context, entities)

                # Check if we need more information
                if not context.has_all_required_slots():
                    context.state = ConversationState.WAITING_INPUT
                    missing = context.get_missing_slots()
                    if missing:
                        context.pending_slot = missing[0]

        # Handle ongoing slot filling
        if context.state == ConversationState.WAITING_INPUT and context.pending_slot:
            # Try to extract the pending slot value from this turn
            self._fill_pending_slot(context, user_message, entities)

            if context.has_all_required_slots():
                context.state = ConversationState.CONFIRMATION
                context.pending_slot = None

        return context

    def _fill_slots_from_entities(
        self,
        context: ConversationContext,
        entities: list[Entity],
    ) -> None:
        """Fill slots from extracted entities"""
        entity_to_slot: dict[EntityType, SlotName] = {
            EntityType.TICKET_TYPE: SlotName.TICKET_TYPE,
            EntityType.QUANTITY: SlotName.TICKET_QUANTITY,
            EntityType.DATE: SlotName.TICKET_DATE,
            EntityType.AMOUNT: SlotName.TOPUP_AMOUNT,
            EntityType.ITEM: SlotName.LOST_ITEM_TYPE,
            EntityType.COLOR: SlotName.LOST_ITEM_COLOR,
            EntityType.LOCATION: SlotName.LOST_ITEM_LOCATION,
            EntityType.POI_TYPE: SlotName.TARGET_LOCATION,
            EntityType.ARTIST: SlotName.ARTIST_NAME,
            EntityType.STAGE: SlotName.STAGE_NAME,
            EntityType.EMAIL: SlotName.USER_EMAIL,
            EntityType.PHONE: SlotName.USER_PHONE,
        }

        for entity in entities:
            if entity.type in entity_to_slot:
                slot_name = entity_to_slot[entity.type]
                if slot_name in context.required_slots:
                    context.set_slot(
                        slot_name,
                        entity.value,
                        source="entity",
                        confidence=entity.confidence,
                    )

    def _fill_pending_slot(
        self,
        context: ConversationContext,
        user_message: str,
        entities: list[Entity],
    ) -> None:
        """Try to fill the pending slot from user's response"""
        if not context.pending_slot:
            return

        # First try from entities
        entity_map: dict[SlotName, list[EntityType]] = {
            SlotName.TICKET_TYPE: [EntityType.TICKET_TYPE],
            SlotName.TICKET_QUANTITY: [EntityType.QUANTITY],
            SlotName.TOPUP_AMOUNT: [EntityType.AMOUNT],
            SlotName.LOST_ITEM_TYPE: [EntityType.ITEM],
            SlotName.LOST_ITEM_COLOR: [EntityType.COLOR],
            SlotName.LOST_ITEM_LOCATION: [EntityType.LOCATION, EntityType.ZONE],
            SlotName.TARGET_LOCATION: [EntityType.POI_TYPE, EntityType.ZONE, EntityType.STAGE],
            SlotName.ARTIST_NAME: [EntityType.ARTIST],
            SlotName.STAGE_NAME: [EntityType.STAGE],
        }

        expected_types = entity_map.get(context.pending_slot, [])
        for entity in entities:
            if entity.type in expected_types:
                context.set_slot(
                    context.pending_slot,
                    entity.value,
                    source="entity",
                    confidence=entity.confidence,
                )
                context.pending_slot = None

                # Move to next missing slot
                missing = context.get_missing_slots()
                if missing:
                    context.pending_slot = missing[0]
                return

        # If no entity found, use the raw message for certain slots
        simple_slots = [
            SlotName.LOST_ITEM_TYPE,
            SlotName.TARGET_LOCATION,
        ]
        if context.pending_slot in simple_slots and user_message.strip():
            context.set_slot(
                context.pending_slot,
                user_message.strip(),
                source="user_raw",
                confidence=0.7,
            )
            context.pending_slot = None

            missing = context.get_missing_slots()
            if missing:
                context.pending_slot = missing[0]

    def confirm_action(
        self,
        context: ConversationContext,
        confirmed: bool,
    ) -> ConversationContext:
        """
        Handle user confirmation of an action

        Args:
            context: Current context
            confirmed: Whether user confirmed

        Returns:
            Updated context
        """
        if confirmed:
            context.state = ConversationState.RESOLVED
            context.set_slot(SlotName.CONFIRMATION, True, source="user")
        else:
            # User declined, clear slots and restart
            context.clear_all_slots()
            context.state = ConversationState.ACTIVE

        return context

    def escalate(
        self,
        context: ConversationContext,
        reason: str,
        escalated_to: Optional[str] = None,
    ) -> ConversationContext:
        """
        Escalate the conversation to a human agent

        Args:
            context: Current context
            reason: Reason for escalation
            escalated_to: ID of the agent handling the escalation

        Returns:
            Updated context
        """
        context.state = ConversationState.ESCALATED
        context.escalation_reason = reason
        context.escalated_to = escalated_to

        logger.info(
            f"Session {context.session_id} escalated: {reason}"
        )

        return context

    def end_session(self, context: ConversationContext) -> ConversationContext:
        """End the conversation session"""
        context.state = ConversationState.ENDED
        logger.info(f"Session {context.session_id} ended")
        return context

    def is_session_expired(self, context: ConversationContext) -> bool:
        """Check if the session has expired"""
        return datetime.utcnow() - context.last_activity > self.session_timeout

    def get_slot_prompt(
        self,
        slot_name: SlotName,
        language: str = "fr",
    ) -> str:
        """Get the prompt to ask for a specific slot"""
        prompts = {
            SlotName.TICKET_TYPE: {
                "fr": "Quel type de billet souhaitez-vous ? (Pass 1 jour, Pass 3 jours, VIP...)",
                "en": "What type of ticket would you like? (1-day pass, 3-day pass, VIP...)",
            },
            SlotName.TICKET_QUANTITY: {
                "fr": "Combien de billets souhaitez-vous ?",
                "en": "How many tickets would you like?",
            },
            SlotName.TOPUP_AMOUNT: {
                "fr": "De combien souhaitez-vous recharger votre compte ?",
                "en": "How much would you like to top up?",
            },
            SlotName.LOST_ITEM_TYPE: {
                "fr": "Quel type d'objet avez-vous perdu ?",
                "en": "What type of item did you lose?",
            },
            SlotName.LOST_ITEM_COLOR: {
                "fr": "De quelle couleur est l'objet ?",
                "en": "What color is the item?",
            },
            SlotName.LOST_ITEM_LOCATION: {
                "fr": "Ou avez-vous perdu cet objet ? (scene, zone, etc.)",
                "en": "Where did you lose this item? (stage, zone, etc.)",
            },
            SlotName.TARGET_LOCATION: {
                "fr": "Ou souhaitez-vous aller ?",
                "en": "Where would you like to go?",
            },
            SlotName.ARTIST_NAME: {
                "fr": "Quel artiste recherchez-vous ?",
                "en": "Which artist are you looking for?",
            },
        }

        slot_prompts = prompts.get(slot_name, {})
        return slot_prompts.get(language, slot_prompts.get("fr", "Pouvez-vous preciser ?"))
