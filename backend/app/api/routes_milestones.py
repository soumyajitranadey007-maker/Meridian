from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from ..db import get_session
from ..models import AIReview, Milestone
from ..schemas import ReviewRequest, ReviewResponse
from ..services.gemini_service import gemini_service

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/milestones", tags=["milestones"])


@router.post("/{milestone_id}/review", response_model=ReviewResponse)
@limiter.limit("10/minute")
async def review_milestone(request: Request, milestone_id: str, payload: ReviewRequest, session: AsyncSession = Depends(get_session)) -> ReviewResponse:
    milestone = await session.get(Milestone, milestone_id)
    if not milestone:
        raise HTTPException(404, "Milestone not found")
    try:
        result = await gemini_service.review_milestone(milestone.description, payload.deliverable)
    except Exception as exc:
        raise HTTPException(503, "AI review is temporarily unavailable. No automated recommendation was created; use manual review.") from exc
    review = AIReview(milestone_id=milestone.id, completeness_score=result["completeness_score"], risk_flags=result["risk_flags"], summary=result["summary"], suggested_questions=result["suggested_questions"], raw_response=result)
    session.add(review)
    await session.commit()
    return ReviewResponse(**result)
