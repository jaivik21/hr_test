from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request
from datetime import datetime, timezone
from sqlalchemy import update, func, select
import uuid
import asyncio
from db import AsyncSessionLocal
from models import Interview, Response, Candidate
from schemas.interview_schema import StartInterviewRequest, EndInterviewRequest, TabSwitchCountRequest
from utils.interview_utils import get_interview_or_404, get_response_or_404, commit_and_refresh, get_questions_list
from utils.redis_utils import create_session, set_session_meta
from services.llm_service import llm_service
import secrets
from middleware.auth_middleware import safe_route
from services.storage_service import storage_service
from routers.media_router import _merge_video_background
from utils.logger import get_logger
from utils.cost_utils import apply_response_cost
from routers.candidate_router import _send_hr_notification, _ensure_candidate_from_response
from utils.datetime_utils import format_datetime_ist_iso

logger = get_logger(__name__)
router = APIRouter(prefix="/api/interview", tags=["sessions"])

@router.post("/start-interview")
@safe_route
async def start_interview(request: StartInterviewRequest):
    async with AsyncSessionLocal() as db:
        interview = await get_interview_or_404(db, request.interview_id)
        
        if not interview.is_open:
            raise HTTPException(status_code=403, detail="This interview is currently closed. Please contact the HR team.")
        
        email = request.candidate_email.lower().strip() if request.candidate_email else None
        
        if email:
            existing_responses = await db.execute(
                select(Response)
                .where(Response.interview_id == interview.id)
                .where(Response.email == email)
                .where(Response.is_completed == True)
            )
            existing = existing_responses.scalars().first()
            if existing:
                raise HTTPException(
                    status_code=403,
                    detail="You have already completed this interview. Each candidate can only take the interview once."
                )
        
        response = Response(
            interview_id=interview.id,
            name=request.candidate_name,
            email=email or request.candidate_email,
            start_time=datetime.now(timezone.utc)
        )
        db.add(response)
        await commit_and_refresh(db, response)
        
        await db.execute(
            update(Interview)
            .where(Interview.id == interview.id)
            .values(response_count=func.coalesce(Interview.response_count, 0) + 1)
        )
        
        if email:
            candidate = await _ensure_candidate_from_response(db, response, str(interview.id))
            if candidate:
                logger.info(f"Ensured candidate record exists for response {response.id}, candidate_id: {candidate.id}")
            else:
                logger.warning(f"Could not create candidate record for response {response.id} with email {email}")
        
        await db.commit()

        session_id = f"ws_{interview.id}_{response.id}"
        session_token = secrets.token_urlsafe(24)
        try:
            await create_session(session_id)
            await set_session_meta(session_id, {
                "interview_id": str(interview.id),
                "response_id": str(response.id),
                "mode": interview.question_mode,
                "session_token": session_token,
                "started_at": format_datetime_ist_iso(datetime.now(timezone.utc))
            })
        except Exception as e:
            logger.error(f"Redis session init failed: {e}", exc_info=True)

        duration_minutes = None
        if interview.time_duration and interview.time_duration.isdigit():
            duration_minutes = int(interview.time_duration)
        
        return {
            "ok": True,
            "response_id": str(response.id),
            "interview_id": str(interview.id),
            "session_id": session_id,
            "session_token": session_token,
            "mode": interview.question_mode,
            "duration_minutes": duration_minutes,
            "start_time": format_datetime_ist_iso(response.start_time) if response.start_time else None
        }

@router.post("/end-interview")
@safe_route
async def end_interview(request: EndInterviewRequest, http_request: Request, background_tasks: BackgroundTasks = BackgroundTasks()):
    base_url = str(http_request.base_url)
    async with AsyncSessionLocal() as db:
        response = await get_response_or_404(db, request.response_id)
        interview = await get_interview_or_404(db, str(response.interview_id))
        
        response.is_completed = True
        
        end_time = datetime.now(timezone.utc)
        if not response.end_time:
            response.end_time = end_time
        elif response.end_time < end_time:
            response.end_time = end_time
        
        if response.start_time and response.end_time:
            duration_delta = response.end_time - response.start_time
            duration_seconds = int(duration_delta.total_seconds())
            response.duration = duration_seconds
            logger.debug(f"Interview duration calculated: {duration_seconds} seconds ({duration_seconds // 60}m {duration_seconds % 60}s)")
        
        qa_history = response.qa_history or []
        if len(qa_history) > 0:
            overall_analysis = getattr(response, "overall_analysis", None)
            if not overall_analysis:
                try:
                    if interview.context:
                        final_analysis,final_usage = await llm_service.generate_final_analysis(
                            str(interview.id), qa_history
                        )
                        try:
                            if final_usage:
                                final_analysis = dict(final_analysis or {})
                                final_analysis["_usage"] = final_usage
                            setattr(response, "overall_analysis", final_analysis)
                            
                            # if final_analysis and (not hasattr(response, 'status') or not response.status or response.status == "no_status"):
                            #     score = final_analysis.get("overall_score", 0)
                            #     if score >= 80:
                            #         response.status = "selected"
                            #     elif score >= 60:
                            #         response.status = "potential"
                            #     elif score < 40:
                            #         response.status = "not_selected"
                            #     else:
                            #         response.status = "potential"
                            response.status_source = "manual"
                        except Exception as e:
                            logger.warning(f"Failed to set overall_analysis: {e}", exc_info=True)
                except Exception as e:
                    logger.warning(f"Final analysis generation failed: {e}", exc_info=True)
        
        apply_response_cost(response)
        
        if response.email:
            candidate = await _ensure_candidate_from_response(db, response)
            if candidate:
                logger.info(f"Ensured candidate record exists for response {response.id} during interview end, candidate_id: {candidate.id}")
            else:
                logger.warning(f"Could not create candidate record for response {response.id} with email {response.email}")
        
        await db.commit()
        
        # Send HR notification email when interview is completed
        try:
            await _send_hr_notification(db, response, interview)
        except Exception as e:
            logger.error(f"Failed to send HR notification for response {request.response_id}: {e}", exc_info=True)
        
        logger.debug(f"Adding video merge task for response_id: {request.response_id}")
        background_tasks.add_task(_merge_video_background, request.response_id, base_url)
        logger.debug(f"Video merge task added to background for response_id: {request.response_id}")

        if interview.question_mode == "dynamic":
            try:
                interview.llm_generated_questions = None
                await db.commit()
            except Exception:
                pass
            total_questions = interview.question_count or 0
        else:
            questions_list = get_questions_list(interview)
            total_questions = len(questions_list) if questions_list else 0
        
        questions_answered = len(qa_history)
        is_partially_complete = questions_answered < total_questions if total_questions > 0 else False
        
        return {
            "ok": True,
            "message": "Interview ended successfully",
            "questions_answered": questions_answered,
            "total_questions": total_questions,
            "is_partially_complete": is_partially_complete,
            "end_time": format_datetime_ist_iso(response.end_time) if response.end_time else None,
            "duration_seconds": response.duration if response.duration else None,
            "video_merge_started": True  # Indicate that video merge has been triggered
        }

@router.post("/tab-switch-count")
@safe_route
async def tab_switch_count(request: TabSwitchCountRequest):
    async with AsyncSessionLocal() as db:
        interview = await get_interview_or_404(db, request.interview_id)
        response = await get_response_or_404(db, request.response_id)
        
        if str(response.interview_id) != request.interview_id:
            raise HTTPException(
                status_code=400,
                detail="Response does not belong to the specified interview"
            )
        
        response.tab_switch_count = request.tab_switch_count
        await db.commit()
        await db.refresh(response)
        
        logger.info(f"Updated tab switch count for response {request.response_id}: {request.tab_switch_count}")
        
        return {
            "ok": True,
            "message": "Tab switch count updated successfully",
            "response_id": str(response.id),
            "interview_id": request.interview_id,
            "tab_switch_count": response.tab_switch_count
        }

