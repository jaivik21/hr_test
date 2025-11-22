from pydantic import BaseModel, EmailStr
from typing import Optional, List
from uuid import UUID


class CandidateData(BaseModel):
    name: str
    email: EmailStr
    phone_number: Optional[str] = None


class CreateCandidateRequest(BaseModel):
    interview_id: UUID
    candidates: List[CandidateData]
