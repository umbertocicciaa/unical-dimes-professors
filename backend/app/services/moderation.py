"""Local moderation client used to vet review submissions before persistence."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Protocol
import re


MODERATION_LABELS = ("OFFENSIVE_LANGUAGE", "PERSONAL_ATTACK", "IRRELEVANT_CONTENT", "SAFE")


@dataclass
class ModerationVerdict:
    allowed: bool
    blocked_reasons: List[str]
    scores: Dict[str, float]
    message: str
    model_version: str
    suggestion: Optional[str] = None


class ModerationClient(Protocol):
    async def evaluate(self, *, text: str, teacher_name: str, course_title: str) -> ModerationVerdict:  # pragma: no cover - interface definition
        ...


class LocalModerationClient:
    """Heuristic moderation client used until an ML model is integrated."""

    def __init__(self, *, block_threshold: float = 0.55, model_version: str = "local-heuristic-v1") -> None:
        self._block_threshold = block_threshold
        self._model_version = model_version

        self._offensive_keywords = {
            "idiot",
            "stupid",
            "dumb",
            "trash",
            "hate",
            "awful",
            "useless",
            "terrible",
            "sucks",
        }
        self._personal_attack_patterns = (
            re.compile(r"\b(you|he|she|they|professor) (is|are|was) (an? )?(idiot|moron|loser|failure)\b", re.IGNORECASE),
            re.compile(r"\b(screw|hate|despise) (you|him|her|them)\b", re.IGNORECASE),
        )
        self._irrelevant_keywords = {
            "dorm",
            "cafeteria",
            "parking",
            "football",
            "party",
            "housing",
        }

    async def evaluate(self, *, text: str, teacher_name: str, course_title: str) -> ModerationVerdict:
        clean_text = text.strip()
        lowered = clean_text.lower()

        scores: Dict[str, float] = {label: 0.0 for label in MODERATION_LABELS}

        offensive_hits = sum(1 for keyword in self._offensive_keywords if keyword in lowered)
        scores["OFFENSIVE_LANGUAGE"] = min(1.0, offensive_hits * 0.25)

        personal_score = 0.0
        for pattern in self._personal_attack_patterns:
            if pattern.search(clean_text):
                personal_score = max(personal_score, 0.7)
        if teacher_name:
            personal_context_pattern = re.compile(rf"\b{re.escape(teacher_name.lower())}\b.*?(idiot|sucks|awful|terrible)")
            if personal_context_pattern.search(lowered):
                personal_score = max(personal_score, 0.8)
        scores["PERSONAL_ATTACK"] = min(1.0, personal_score)

        irrelevant_hits = sum(1 for keyword in self._irrelevant_keywords if keyword in lowered)
        if len(clean_text) < 25:
            irrelevant_hits += 1
        if course_title and course_title.lower() not in lowered and teacher_name and teacher_name.lower() not in lowered:
            irrelevant_hits += 1
        scores["IRRELEVANT_CONTENT"] = min(1.0, irrelevant_hits * 0.2)

        max_risk = max(scores["OFFENSIVE_LANGUAGE"], scores["PERSONAL_ATTACK"], scores["IRRELEVANT_CONTENT"])
        scores["SAFE"] = max(0.0, 1.0 - max_risk)

        blocked_reasons = [label for label in MODERATION_LABELS if label != "SAFE" and scores[label] >= self._block_threshold]

        allowed = not blocked_reasons
        message = self._build_message(allowed=allowed, blocked_reasons=blocked_reasons)
        suggestion = None if allowed else self._build_suggestion(clean_text, teacher_name, course_title)

        return ModerationVerdict(
            allowed=allowed,
            blocked_reasons=blocked_reasons,
            scores=scores,
            message=message,
            model_version=self._model_version,
            suggestion=suggestion,
        )

    def _build_message(self, *, allowed: bool, blocked_reasons: List[str]) -> str:
        if allowed:
            return "Thanks! Your review looks constructive."
        if "OFFENSIVE_LANGUAGE" in blocked_reasons:
            return "Please remove offensive language and focus on the teaching experience."
        if "PERSONAL_ATTACK" in blocked_reasons:
            return "Keep the feedback about teaching quality instead of personal attacks."
        if "IRRELEVANT_CONTENT" in blocked_reasons:
            return "Please focus on course and teaching details to help other students."
        return "We could not approve this review. Please make it about the teaching experience."

    def _build_suggestion(self, text: str, teacher_name: str, course_title: str) -> str:
        fallback_teacher = teacher_name or "the professor"
        fallback_course = course_title or "the course"
        neutral_text = re.sub(r"[^\w\s]", "", text)
        neutral_text = neutral_text.strip()
        if not neutral_text or len(neutral_text.split()) < 5:
            neutral_text = f"Share what worked well in {fallback_teacher}'s approach during {fallback_course}."
        return (
            f"Focus on specific teaching aspects. For example: '{fallback_teacher} explained key concepts clearly in {fallback_course} and the assignments matched the lectures.'"
        )


_singleton_client: Optional[LocalModerationClient] = None


def get_moderation_client() -> LocalModerationClient:
    global _singleton_client
    if _singleton_client is None:
        _singleton_client = LocalModerationClient()
    return _singleton_client

