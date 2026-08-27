from pydantic import BaseModel, Field


class ReviewRequest(BaseModel):
    deliverable: str = Field(min_length=3, max_length=12000)


class ReviewResponse(BaseModel):
    completeness_score: int = Field(ge=0, le=100)
    risk_flags: list[str]
    summary: str
    suggested_questions: list[str]


class DisputeSummaryResponse(BaseModel):
    summary: str


class EvidenceCreate(BaseModel):
    party_address: str = Field(pattern=r"^G[A-Z2-7]{55}$")
    body: str = Field(min_length=3, max_length=12000)
