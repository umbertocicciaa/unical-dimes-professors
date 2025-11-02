# AI Review Moderation Feature Plan

## Objective
- Detect and block reviews that target the professor personally or contain offensive language before they are persisted.
- Encourage constructive reviews focused on teaching quality, course material, and delivery.
- Provide immediate, actionable feedback to students so they can edit and resubmit compliant reviews.

## User & Moderation Flow
- Student writes a review and hits submit.
- Frontend sends the draft to the backend moderation endpoint instead of committing immediately.
- Backend runs the review text through the moderation model with course/teacher context.
- If flagged as offensive or off-topic, the backend returns a warning payload; the review is not saved.
- If accepted, the backend persists the review and returns success to the UI.

## ASCII Architecture Diagram
```
+-------------------+        +---------------------+        +---------------------+
| React Review Form | -----> | FastAPI /reviews    | -----> | Moderation Service  |
| (frontend)         |        |  submit handler     |        |  (ML inference API) |
+-------------------+        +----------+----------+        +----------+----------+
         |                               |                            |
         | flag + message                | store if OK                | log verdicts
         v                               v                            v
+-------------------+        +---------------------+        +---------------------+
| Warning Modal     |        | Postgres Reviews    |        | Analytics / Logging |
| (edit + resubmit) | <----- | Table               | <----- | (Prometheus + ELK)  |
+-------------------+        +---------------------+        +---------------------+
```

## Components
### Frontend (React 19)
- Add a moderated submission flow in the review form that calls `POST /api/reviews/moderate` before `POST /api/reviews`.
- Show inline feedback (e.g., modal or alert) with the moderation verdict and blocked categories.
- Provide quick actions: edit draft, accept suggested rewrite, or cancel submission.
- Add loading states and retry handling around the moderation check.

### Backend (FastAPI)
- New dependency-injected `ModerationClient` for AI inference (local model or hosted service).
- New endpoint `POST /api/reviews/moderate` that validates input, enriches context (teacher, course), and evaluates the review.
- Extend existing `POST /api/reviews` to call the moderation client when bypassed (defense in depth) before persisting.
- Store moderation metadata (verdict, labels, model version) alongside the review for auditing.
- Add role-protected endpoints for admins to view/override blocked reviews if needed.

### Moderation Service
- Package as a FastAPI sub-app or background worker calling a transformer model (e.g., `sentence-transformers` or `OpenAI` style moderation if allowed).
- Maintain label taxonomy: `OFFENSIVE_LANGUAGE`, `PERSONAL_ATTACK`, `IRRELEVANT_CONTENT`, `SAFE`.
- Return severity score (0-1) per label plus suggested user-facing message.
- Cache common responses and reuse embeddings to minimize latency.

## Data & Model Strategy
- Start with a multilingual moderation foundation model (e.g., `facebook/roberta-hate-speech-detection`) and fine-tune on university review datasets plus synthetic prompts.
- Features: raw text, teacher name, course title, sentiment scores, part-of-speech tags.
- Training labels sourced from annotated historical reviews or crowdsourced labeling via internal tool.
- Evaluate with precision/recall against `offensive` and `off-topic` classes; target recall > 0.92 for offensive content.
- Maintain model registry with versioned artifacts and rollback capability.

## API & Contracts
- `POST /api/reviews/moderate`
  - **Request**: `{ "teacherId": int, "courseId": int, "text": string }`
  - **Response 200** (allowed): `{ "allowed": true, "scores": {...}, "modelVersion": "v1.2.0" }`
  - **Response 422** (blocked): `{ "allowed": false, "blockedReasons": ["PERSONAL_ATTACK"], "message": "Keep the review about teaching quality.", "scores": {...}, "modelVersion": "v1.2.0" }`
- `POST /api/reviews`
  - Adds moderation guard; returns `400` with same warning payload if moderation vetoes the submission.
- Optional `GET /api/reviews/moderation-log?teacherId=` for admins to audit blocked attempts.

## Code Example
```python
# backend/app/services/moderation.py
from dataclasses import dataclass
from typing import Dict, List

import httpx

@dataclass
class ModerationVerdict:
    allowed: bool
    blocked_reasons: List[str]
    scores: Dict[str, float]
    message: str
    model_version: str


class ModerationClient:
    def __init__(self, base_url: str, timeout: float = 2.5):
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout

    async def evaluate(self, *, text: str, teacher_name: str, course_title: str) -> ModerationVerdict:
        payload = {
            "text": text,
            "context": {"teacher": teacher_name, "course": course_title},
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            resp = await client.post(f"{self._base_url}/moderate", json=payload)
            resp.raise_for_status()
            data = resp.json()
        return ModerationVerdict(
            allowed=data["allowed"],
            blocked_reasons=data.get("blockedReasons", []),
            scores=data.get("scores", {}),
            message=data.get("message", ""),
            model_version=data["modelVersion"],
        )
```

```python
# backend/app/routers/reviews.py (excerpt)
@router.post("/api/reviews", response_model=schemas.Review)
async def create_review(payload: schemas.ReviewCreate, db: Session = Depends(get_db)):
    teacher = db.query(models.Teacher).get(payload.teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    verdict = await moderation_client.evaluate(
        text=payload.text,
        teacher_name=teacher.name,
        course_title=payload.course_title,
    )
    if not verdict.allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "blockedReasons": verdict.blocked_reasons,
                "message": verdict.message or "Please focus on teaching-related feedback.",
                "scores": verdict.scores,
            },
        )

    review = models.Review(**payload.dict())
    review.moderation_model_version = verdict.model_version
    review.moderation_scores = verdict.scores
    db.add(review)
    db.commit()
    db.refresh(review)
    return review
```

## Phased Rollout
- **Phase 1: Prototype** – integrate hosted moderation API, gather ground-truth with shadow mode (store verdicts but do not block).
- **Phase 2: Soft Launch** – enable blocking for high-confidence offensive content, add analytics dashboard for false positives.
- **Phase 3: Full Launch** – enforce all label rules, enable admin override tools, and publish updated review guidelines.
- **Phase 4: Continuous Improvement** – retrain quarterly using feedback, monitor drift, and expand support for additional languages.

## Testing & Monitoring
- Unit tests for moderation client, backend validators, and review submission flow.
- Contract tests mocking moderation API responses for allow/deny paths.
- Frontend Cypress test covering warning modal and resubmission.
- Observability: structured logs for verdicts, Prometheus metrics (`moderation_block_rate`, latency), alert if block rate > expected threshold.
- Privacy guardrails: redact PII in logs, restrict access to moderation datasets via role-based policies.
