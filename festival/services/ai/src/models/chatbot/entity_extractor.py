"""
Entity Extractor Module
Extracts named entities from user messages for context understanding
"""

import logging
import re
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional, Any
from datetime import datetime, date, time
from langdetect import detect

logger = logging.getLogger(__name__)


class EntityType(str, Enum):
    """Types of entities that can be extracted from user messages"""

    # Festival-specific entities
    ARTIST = "artist"
    STAGE = "stage"
    VENUE = "venue"
    ZONE = "zone"

    # Time-related entities
    DATE = "date"
    TIME = "time"
    DAY = "day"
    DURATION = "duration"

    # Ticket entities
    TICKET_TYPE = "ticket_type"
    ORDER_NUMBER = "order_number"
    QUANTITY = "quantity"

    # Cashless entities
    AMOUNT = "amount"
    CURRENCY = "currency"
    NFC_TAG = "nfc_tag"

    # Location entities
    LOCATION = "location"
    POI_TYPE = "poi_type"

    # Personal entities
    EMAIL = "email"
    PHONE = "phone"
    NAME = "name"

    # Item entities
    ITEM = "item"
    COLOR = "color"

    # Language
    LANGUAGE = "language"


@dataclass
class Entity:
    """Represents an extracted entity"""

    type: EntityType
    value: Any
    raw_text: str
    start: int
    end: int
    confidence: float = 1.0
    metadata: dict[str, Any] = field(default_factory=dict)


class EntityExtractor:
    """
    Extracts named entities from user messages using regex patterns
    and contextual understanding
    """

    # Day patterns (French and English)
    DAY_PATTERNS = {
        "fr": {
            "lundi": "monday",
            "mardi": "tuesday",
            "mercredi": "wednesday",
            "jeudi": "thursday",
            "vendredi": "friday",
            "samedi": "saturday",
            "dimanche": "sunday",
            "aujourd'hui": "today",
            "demain": "tomorrow",
            "apres-demain": "day_after_tomorrow",
        },
        "en": {
            "monday": "monday",
            "tuesday": "tuesday",
            "wednesday": "wednesday",
            "thursday": "thursday",
            "friday": "friday",
            "saturday": "saturday",
            "sunday": "sunday",
            "today": "today",
            "tomorrow": "tomorrow",
        },
    }

    # Time patterns
    TIME_PATTERN = r"(\d{1,2})[h:](\d{2})?"
    TIME_PATTERN_12H = r"(\d{1,2}):?(\d{2})?\s*(am|pm)"

    # Amount/currency patterns
    AMOUNT_PATTERN = r"(\d+(?:[.,]\d{2})?)\s*(?:euros?|EUR|€|\$|dollars?)"
    QUANTITY_PATTERN = r"(\d+)\s*(?:billets?|tickets?|places?|personnes?)"

    # Email pattern
    EMAIL_PATTERN = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"

    # Phone pattern (French format)
    PHONE_PATTERN = r"(?:0|\+33)[1-9](?:[\s.-]?\d{2}){4}"

    # Order number pattern (assumes format like ORDER-XXXXX or #XXXXX)
    ORDER_PATTERN = r"(?:order|commande|#)?[A-Z]{0,5}[-_]?\d{5,10}"

    # POI types
    POI_TYPES = {
        "fr": {
            "toilettes": "wc",
            "wc": "wc",
            "sanitaires": "wc",
            "food": "food",
            "restaurant": "food",
            "manger": "food",
            "bar": "bar",
            "boire": "bar",
            "medical": "medical",
            "infirmerie": "medical",
            "secours": "medical",
            "scene": "stage",
            "main stage": "main_stage",
            "camping": "camping",
            "parking": "parking",
            "entree": "entrance",
            "sortie": "exit",
            "consigne": "locker",
            "recharge": "topup",
            "atm": "atm",
            "distributeur": "atm",
        },
        "en": {
            "toilet": "wc",
            "toilets": "wc",
            "bathroom": "wc",
            "restroom": "wc",
            "food": "food",
            "restaurant": "food",
            "eat": "food",
            "bar": "bar",
            "drink": "bar",
            "medical": "medical",
            "first aid": "medical",
            "stage": "stage",
            "main stage": "main_stage",
            "camping": "camping",
            "parking": "parking",
            "entrance": "entrance",
            "exit": "exit",
            "locker": "locker",
            "topup": "topup",
            "atm": "atm",
        },
    }

    # Ticket types
    TICKET_TYPES = {
        "pass 1 jour": "day_pass",
        "pass 2 jours": "2day_pass",
        "pass 3 jours": "3day_pass",
        "pass complet": "full_pass",
        "pass week-end": "weekend_pass",
        "pass vip": "vip_pass",
        "1 day pass": "day_pass",
        "2 day pass": "2day_pass",
        "3 day pass": "3day_pass",
        "full pass": "full_pass",
        "weekend pass": "weekend_pass",
        "vip pass": "vip_pass",
        "billet": "single",
        "ticket": "single",
    }

    # Colors for lost items
    COLORS = {
        "fr": ["rouge", "bleu", "vert", "jaune", "noir", "blanc", "rose", "orange", "violet", "gris", "marron"],
        "en": ["red", "blue", "green", "yellow", "black", "white", "pink", "orange", "purple", "gray", "brown"],
    }

    def __init__(
        self,
        artists: Optional[list[str]] = None,
        stages: Optional[list[str]] = None,
        zones: Optional[list[str]] = None,
    ):
        """
        Initialize entity extractor with optional festival-specific data

        Args:
            artists: List of artist names for the current festival
            stages: List of stage names
            zones: List of zone names
        """
        self.artists = [a.lower() for a in (artists or [])]
        self.stages = [s.lower() for s in (stages or [])]
        self.zones = [z.lower() for z in (zones or [])]

        logger.info(
            f"Entity extractor initialized with {len(self.artists)} artists, "
            f"{len(self.stages)} stages, {len(self.zones)} zones"
        )

    def extract(self, text: str, language: Optional[str] = None) -> list[Entity]:
        """
        Extract all entities from user message

        Args:
            text: User message
            language: Language code (fr/en), auto-detected if not provided

        Returns:
            List of extracted entities
        """
        entities: list[Entity] = []

        # Detect language if not provided
        if not language:
            try:
                language = detect(text)
                if language not in ["fr", "en"]:
                    language = "fr"  # Default to French
            except Exception:
                language = "fr"

        text_lower = text.lower()

        # Extract various entity types
        entities.extend(self._extract_dates(text, language))
        entities.extend(self._extract_times(text))
        entities.extend(self._extract_days(text_lower, language))
        entities.extend(self._extract_amounts(text))
        entities.extend(self._extract_quantities(text))
        entities.extend(self._extract_emails(text))
        entities.extend(self._extract_phones(text))
        entities.extend(self._extract_order_numbers(text))
        entities.extend(self._extract_poi_types(text_lower, language))
        entities.extend(self._extract_ticket_types(text_lower))
        entities.extend(self._extract_artists(text_lower))
        entities.extend(self._extract_stages(text_lower))
        entities.extend(self._extract_zones(text_lower))
        entities.extend(self._extract_colors(text_lower, language))

        # Add language entity
        entities.append(
            Entity(
                type=EntityType.LANGUAGE,
                value=language,
                raw_text=language,
                start=0,
                end=0,
                confidence=0.9,
            )
        )

        return entities

    def _extract_dates(self, text: str, language: str) -> list[Entity]:
        """Extract date entities from text"""
        entities: list[Entity] = []

        # Pattern for dates like "15/07", "15 juillet", "July 15"
        date_patterns = [
            (r"(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?", "numeric"),
            (r"(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)", "fr_month"),
            (r"(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)", "en_month"),
        ]

        for pattern, pattern_type in date_patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                try:
                    raw_text = match.group(0)
                    if pattern_type == "numeric":
                        day = int(match.group(1))
                        month = int(match.group(2))
                        year = int(match.group(3)) if match.group(3) else datetime.now().year
                        if year < 100:
                            year += 2000
                        date_value = date(year, month, day)
                    else:
                        day = int(match.group(1))
                        month_name = match.group(2).lower()
                        month_map = {
                            "janvier": 1, "january": 1,
                            "fevrier": 2, "february": 2,
                            "mars": 3, "march": 3,
                            "avril": 4, "april": 4,
                            "mai": 5, "may": 5,
                            "juin": 6, "june": 6,
                            "juillet": 7, "july": 7,
                            "aout": 8, "august": 8,
                            "septembre": 9, "september": 9,
                            "octobre": 10, "october": 10,
                            "novembre": 11, "november": 11,
                            "decembre": 12, "december": 12,
                        }
                        month = month_map.get(month_name, 1)
                        date_value = date(datetime.now().year, month, day)

                    entities.append(
                        Entity(
                            type=EntityType.DATE,
                            value=date_value,
                            raw_text=raw_text,
                            start=match.start(),
                            end=match.end(),
                        )
                    )
                except (ValueError, IndexError):
                    continue

        return entities

    def _extract_times(self, text: str) -> list[Entity]:
        """Extract time entities from text"""
        entities: list[Entity] = []

        # 24h format (15h30, 15:30)
        for match in re.finditer(self.TIME_PATTERN, text, re.IGNORECASE):
            try:
                hour = int(match.group(1))
                minute = int(match.group(2)) if match.group(2) else 0
                if 0 <= hour <= 23 and 0 <= minute <= 59:
                    entities.append(
                        Entity(
                            type=EntityType.TIME,
                            value=time(hour, minute),
                            raw_text=match.group(0),
                            start=match.start(),
                            end=match.end(),
                        )
                    )
            except (ValueError, IndexError):
                continue

        # 12h format (3:30pm)
        for match in re.finditer(self.TIME_PATTERN_12H, text, re.IGNORECASE):
            try:
                hour = int(match.group(1))
                minute = int(match.group(2)) if match.group(2) else 0
                am_pm = match.group(3).lower()
                if am_pm == "pm" and hour < 12:
                    hour += 12
                elif am_pm == "am" and hour == 12:
                    hour = 0
                entities.append(
                    Entity(
                        type=EntityType.TIME,
                        value=time(hour, minute),
                        raw_text=match.group(0),
                        start=match.start(),
                        end=match.end(),
                    )
                )
            except (ValueError, IndexError):
                continue

        return entities

    def _extract_days(self, text: str, language: str) -> list[Entity]:
        """Extract day references from text"""
        entities: list[Entity] = []
        patterns = self.DAY_PATTERNS.get(language, self.DAY_PATTERNS["fr"])

        for day_text, day_value in patterns.items():
            pattern = rf"\b{re.escape(day_text)}\b"
            for match in re.finditer(pattern, text, re.IGNORECASE):
                entities.append(
                    Entity(
                        type=EntityType.DAY,
                        value=day_value,
                        raw_text=match.group(0),
                        start=match.start(),
                        end=match.end(),
                    )
                )

        return entities

    def _extract_amounts(self, text: str) -> list[Entity]:
        """Extract monetary amounts from text"""
        entities: list[Entity] = []

        for match in re.finditer(self.AMOUNT_PATTERN, text, re.IGNORECASE):
            amount_str = match.group(1).replace(",", ".")
            entities.append(
                Entity(
                    type=EntityType.AMOUNT,
                    value=float(amount_str),
                    raw_text=match.group(0),
                    start=match.start(),
                    end=match.end(),
                    metadata={"currency": "EUR"},
                )
            )

        return entities

    def _extract_quantities(self, text: str) -> list[Entity]:
        """Extract ticket/person quantities from text"""
        entities: list[Entity] = []

        for match in re.finditer(self.QUANTITY_PATTERN, text, re.IGNORECASE):
            entities.append(
                Entity(
                    type=EntityType.QUANTITY,
                    value=int(match.group(1)),
                    raw_text=match.group(0),
                    start=match.start(),
                    end=match.end(),
                )
            )

        return entities

    def _extract_emails(self, text: str) -> list[Entity]:
        """Extract email addresses from text"""
        entities: list[Entity] = []

        for match in re.finditer(self.EMAIL_PATTERN, text):
            entities.append(
                Entity(
                    type=EntityType.EMAIL,
                    value=match.group(0).lower(),
                    raw_text=match.group(0),
                    start=match.start(),
                    end=match.end(),
                )
            )

        return entities

    def _extract_phones(self, text: str) -> list[Entity]:
        """Extract phone numbers from text"""
        entities: list[Entity] = []

        for match in re.finditer(self.PHONE_PATTERN, text):
            phone = re.sub(r"[\s.\-]", "", match.group(0))
            entities.append(
                Entity(
                    type=EntityType.PHONE,
                    value=phone,
                    raw_text=match.group(0),
                    start=match.start(),
                    end=match.end(),
                )
            )

        return entities

    def _extract_order_numbers(self, text: str) -> list[Entity]:
        """Extract order/booking numbers from text"""
        entities: list[Entity] = []

        for match in re.finditer(self.ORDER_PATTERN, text, re.IGNORECASE):
            entities.append(
                Entity(
                    type=EntityType.ORDER_NUMBER,
                    value=match.group(0).upper(),
                    raw_text=match.group(0),
                    start=match.start(),
                    end=match.end(),
                )
            )

        return entities

    def _extract_poi_types(self, text: str, language: str) -> list[Entity]:
        """Extract point of interest types from text"""
        entities: list[Entity] = []
        pois = self.POI_TYPES.get(language, self.POI_TYPES["fr"])

        for poi_text, poi_type in pois.items():
            if poi_text in text:
                start = text.find(poi_text)
                entities.append(
                    Entity(
                        type=EntityType.POI_TYPE,
                        value=poi_type,
                        raw_text=poi_text,
                        start=start,
                        end=start + len(poi_text),
                    )
                )

        return entities

    def _extract_ticket_types(self, text: str) -> list[Entity]:
        """Extract ticket type mentions from text"""
        entities: list[Entity] = []

        for ticket_text, ticket_type in self.TICKET_TYPES.items():
            if ticket_text in text:
                start = text.find(ticket_text)
                entities.append(
                    Entity(
                        type=EntityType.TICKET_TYPE,
                        value=ticket_type,
                        raw_text=ticket_text,
                        start=start,
                        end=start + len(ticket_text),
                    )
                )

        return entities

    def _extract_artists(self, text: str) -> list[Entity]:
        """Extract artist names from text"""
        entities: list[Entity] = []

        for artist in self.artists:
            if artist in text:
                start = text.find(artist)
                entities.append(
                    Entity(
                        type=EntityType.ARTIST,
                        value=artist,
                        raw_text=artist,
                        start=start,
                        end=start + len(artist),
                    )
                )

        return entities

    def _extract_stages(self, text: str) -> list[Entity]:
        """Extract stage names from text"""
        entities: list[Entity] = []

        for stage in self.stages:
            if stage in text:
                start = text.find(stage)
                entities.append(
                    Entity(
                        type=EntityType.STAGE,
                        value=stage,
                        raw_text=stage,
                        start=start,
                        end=start + len(stage),
                    )
                )

        return entities

    def _extract_zones(self, text: str) -> list[Entity]:
        """Extract zone names from text"""
        entities: list[Entity] = []

        for zone in self.zones:
            if zone in text:
                start = text.find(zone)
                entities.append(
                    Entity(
                        type=EntityType.ZONE,
                        value=zone,
                        raw_text=zone,
                        start=start,
                        end=start + len(zone),
                    )
                )

        return entities

    def _extract_colors(self, text: str, language: str) -> list[Entity]:
        """Extract color mentions (useful for lost items)"""
        entities: list[Entity] = []
        colors = self.COLORS.get(language, self.COLORS["fr"])

        for color in colors:
            if color in text:
                start = text.find(color)
                entities.append(
                    Entity(
                        type=EntityType.COLOR,
                        value=color,
                        raw_text=color,
                        start=start,
                        end=start + len(color),
                    )
                )

        return entities

    def update_festival_data(
        self,
        artists: Optional[list[str]] = None,
        stages: Optional[list[str]] = None,
        zones: Optional[list[str]] = None,
    ) -> None:
        """Update festival-specific data for entity extraction"""
        if artists:
            self.artists = [a.lower() for a in artists]
        if stages:
            self.stages = [s.lower() for s in stages]
        if zones:
            self.zones = [z.lower() for z in zones]

        logger.info(
            f"Updated festival data: {len(self.artists)} artists, "
            f"{len(self.stages)} stages, {len(self.zones)} zones"
        )
