# SQLAlchemy models

import uuid
import enum
from datetime import datetime
from sqlalchemy import (create_engine, Column,String,Integer,FLOAT,Text,Boolean,DateTime,ForeignKey,Enum,JSON,ARRAY,TIMESTAMP,func)
from sqlalchemy.dialects.postgresql import JSONB,UUID
from sqlalchemy.orm import declarative_base,relationship

Base = declarative_base()

class PlanEnum(enum.Enum):
    free = "free"
    pro = "pro"
    free_trial_over = "free_trial_over"

class Organization(Base):
    __tablename__ = "organization"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    name = Column(Text)
    image_url = Column(Text)
    allowed_responses_count = Column(Integer)
    plan = Column(Enum(PlanEnum), nullable=False, default=PlanEnum.free)  
   
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="organization", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "user"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    first_name = Column(Text)
    last_name = Column(Text)
    email = Column(Text)
    password_hash = Column(Text)
    role = Column(String, nullable=False, default="user")
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organization.id"))
    reset_otp = Column(String(6))  # 6-digit OTP
    reset_otp_expires_at = Column(TIMESTAMP(timezone=True))
    otp_verified_at = Column(TIMESTAMP(timezone=True))  # Timestamp when OTP was verified

    organization = relationship("Organization", back_populates="users")
    interviews = relationship("Interview", back_populates="user", cascade="all, delete-orphan")

class Interviewer(Base):
    __tablename__ = "interviewer"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    name = Column(Text, nullable=False)
    accent = Column(Text)  # e.g., "American", "British", "Australian"
    elevenlabs_voice_id = Column(Text)  # Voice ID from ElevenLabs
    is_active = Column(Boolean, default=True)

    interviews = relationship("Interview", back_populates="interviewer")

class Interview(Base):
    __tablename__ = "interview"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    name = Column(Text)
    description = Column(Text)
    # department = Column(Text)
    job_description = Column(Text)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organization.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"))
    interviewer_id = Column(UUID(as_uuid=True), ForeignKey("interviewer.id"))
    is_active = Column(Boolean, default=True)
    is_anonymous = Column(Boolean, default=False)
    is_open = Column(Boolean, default=True)
    url = Column(Text)
    readable_slug = Column(Text)
    question_count = Column(Integer)
    response_count = Column(Integer)
    time_duration = Column(Text)
    llm_generated_questions = Column(JSONB)
    context = Column(JSONB, default={})  
    question_mode = Column(String, default="predefined")  
    auto_question_generate = Column(Boolean, default=True)
    manual_questions = Column(JSONB)

    organization = relationship("Organization", back_populates="interviews")
    user = relationship("User", back_populates="interviews")
    interviewer = relationship("Interviewer", back_populates="interviews")
    responses = relationship("Response", back_populates="interview", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="interview", cascade="all, delete-orphan")

class Candidate(Base):
    __tablename__ = "candidate"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    interview_id = Column(UUID(as_uuid=True), ForeignKey("interview.id"), nullable=False)
    name = Column(Text, nullable=False)
    email = Column(Text, nullable=False)
    phone_number = Column(Text)
    mail_sent = Column(Boolean, default=False)
    mail_sent_at = Column(TIMESTAMP(timezone=True), nullable=True)  # Timestamp when invite was sent
    response_id = Column(UUID(as_uuid=True), ForeignKey("response.id"), nullable=True)

    interview = relationship("Interview")
    response = relationship("Response")


class Response(Base):
    __tablename__ = "response"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    interview_id = Column(UUID(as_uuid=True), ForeignKey("interview.id"))
    name = Column(Text)
    email = Column(Text)
    start_time = Column(TIMESTAMP(timezone=True))
    end_time = Column(TIMESTAMP(timezone=True))
    interview_session_id = Column(String, unique=True)
    current_question_index = Column(Integer, default=0)
    is_completed = Column(Boolean, default=False)
    qa_history = Column(JSONB, default=[])  
    duration = Column(Integer)  
    status = Column(String, default="no_status")
    status_source = Column(String, default="manual")
    candidate_image_url = Column(Text, nullable=True)
    candidate_video_url = Column(Text, nullable=True)
    overall_analysis = Column(JSONB, default={})
    cost = Column(FLOAT, nullable=False, default=0.0)
    deepgram_cost = Column(FLOAT, nullable=False, default=0.0)
    elevenlabs_cost = Column(FLOAT, nullable=False, default=0.0)
    azure_cost = Column(FLOAT, nullable=False, default=0.0)
    tab_switch_count = Column(Integer, nullable=True, default=0)

    interview = relationship("Interview", back_populates="responses")
    feedbacks = relationship("Feedback", back_populates="response", cascade="all, delete-orphan")

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    interview_id = Column(UUID(as_uuid=True), ForeignKey("interview.id"))
    response_id = Column(UUID(as_uuid=True), ForeignKey("response.id"))
    email = Column(Text)
    feedback = Column(Text)
    satisfaction = Column(Integer)
    
    interview = relationship("Interview", back_populates="feedbacks")
    response = relationship("Response", back_populates="feedbacks")