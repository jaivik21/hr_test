from fastapi import APIRouter, HTTPException, Query, Depends, BackgroundTasks
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.orm.attributes import flag_modified
from db import AsyncSessionLocal
from models import Response, Candidate, Feedback, Interviewer
from schemas.interview_schema import (
    SubmitAnswerRequest,
    UpdateResponseStatusRequest
)
from services.llm_service import llm_service
from utils.interview_utils import (
    get_interview_or_404,
    get_response_or_404,
    get_questions_list,
    question_text,
    format_duration
)
from utils.cost_utils import apply_response_cost, calculate_response_cost
from utils.logger import get_logger
from routers.candidate_router import _send_hr_notification
from routers.candidate_router import _format_date_for_display, _get_interview_link
from utils.datetime_utils import format_datetime_ist_iso

logger = get_logger(__name__)
router = APIRouter(prefix="/api/interview", tags=["responses"])


# def _auto_assign_status(score: int) -> str:
#     if score >= 80:
#         return "selected"
#     elif score >= 60:
#         return "potential"
#     elif score < 40:
#         return "not_selected"
#     else:
#         return "potential"

# async def _assign_status_if_needed(db, response, overall_analysis: dict):
#     if not overall_analysis:
#         return
    
#     status = getattr(response, 'status', None) or "no_status"
#     if status == "no_status":
#         score = overall_analysis.get("overall_score", 0)
#         response.status = _auto_assign_status(score)
#         response.status_source = "auto"
#         await db.commit()

async def _ensure_analysis(db, response, interview_id: str) -> dict:
    overall_analysis = getattr(response, "overall_analysis", None)
    if not overall_analysis and response.qa_history:
        try:
            overall_analysis, usage = await llm_service.generate_final_analysis(str(interview_id), response.qa_history)
            if usage:
                overall_analysis = dict(overall_analysis or {})
                overall_analysis["_usage"] = usage           
            setattr(response, "overall_analysis", overall_analysis)
            apply_response_cost(response)
            await db.commit()
        except Exception:
            pass
    return overall_analysis or {}

def _get_candidate_summary(overall_analysis: dict) -> str:
    return (
        overall_analysis.get("soft_skill_summary", "") or 
        overall_analysis.get("overall_feedback", "")
    )

# Helper functions for get_overall_analysis
def _parse_date_filters(date_from: Optional[str], date_to: Optional[str]) -> tuple[Optional[datetime], Optional[datetime]]:
    """Parse date_from and date_to strings into datetime objects."""
    date_from_parsed = None
    date_to_parsed = None
    
    if date_from:
        try:
            parsed_date = datetime.strptime(date_from, "%d-%m-%Y")
            date_from_parsed = datetime.combine(parsed_date.date(), datetime.min.time()).replace(tzinfo=timezone.utc)
        except ValueError:
            try:
                date_from_parsed = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                if date_from_parsed.tzinfo is None:
                    date_from_parsed = date_from_parsed.replace(tzinfo=timezone.utc)
                else:
                    date_from_parsed = date_from_parsed.astimezone(timezone.utc)
            except ValueError:
                pass
    
    if date_to:
        try:
            parsed_date = datetime.strptime(date_to, "%d-%m-%Y")
            date_to_parsed = datetime.combine(parsed_date.date(), datetime.max.time()).replace(tzinfo=timezone.utc)
        except ValueError:
            try:
                date_to_parsed = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                if date_to_parsed.tzinfo is None:
                    date_to_parsed = date_to_parsed.replace(tzinfo=timezone.utc)
                else:
                    date_to_parsed = date_to_parsed.astimezone(timezone.utc)
            except ValueError:
                pass
    
    return date_from_parsed, date_to_parsed

def _normalize_status(status: str) -> str:
    """Normalize status values to standard format."""
    if status == "selected":
        return "shortlisted"
    elif status in ["rejected", "not_selected"]:
        return "rejected"
    elif status not in ["shortlisted", "potential", "rejected", "no_status"]:
        return "no_status"
    return status

def _apply_date_filter(date_type: Optional[str], 
                       date_from_parsed: Optional[datetime], date_to_parsed: Optional[datetime],
                       sent_date: Optional[datetime], given_date: Optional[datetime]) -> bool:
    """Check if date matches the filter criteria."""
    if not date_type or not (date_from_parsed or date_to_parsed):
        return True
    
    if date_type == "sent_date":
        check_date = sent_date
    elif date_type == "given_date":
        check_date = given_date
    else:
        check_date = None
    
    if not check_date:
        return False
    
    # Normalize to UTC
    if check_date.tzinfo is None:
        check_date = check_date.replace(tzinfo=timezone.utc)
    else:
        check_date = check_date.astimezone(timezone.utc)
    
    if date_from_parsed and check_date.date() < date_from_parsed.date():
        return False
    if date_to_parsed and check_date.date() > date_to_parsed.date():
        return False
    
    return True

def _apply_status_filter(normalized_status: str, status_filter: Optional[str]) -> bool:
    if not status_filter or status_filter.lower() == "all":
        return True
    
    status_normalized = _normalize_status(status_filter.lower())
    return normalized_status == status_normalized

def _apply_search_filter(name: Optional[str], email: Optional[str], search: Optional[str]) -> bool:
    if not search:
        return True
    
    search_lower = search.lower().strip()
    name_match = name and search_lower in name.lower()
    return name_match 

def _build_candidate_dict(candidate_or_response, response, sent_date: Optional[datetime], given_date: Optional[datetime], interview=None) -> dict:
    hasattr_name = hasattr(candidate_or_response, 'name')
    name = candidate_or_response.name if hasattr_name else getattr(response, 'name', '')
    email = candidate_or_response.email if hasattr_name else getattr(response, 'email', '')
    
    overall_analysis = response.overall_analysis or {} if response else {}
    overall_score = overall_analysis.get("overall_score", 0) if response else 0
    communication_score = overall_analysis.get("communication_score", 0) if response else 0
    summary = _get_candidate_summary(overall_analysis) if response else ""
    
    response_status = getattr(response, 'status', None) or "no_status" if response else "no_status"
    normalized_status = _normalize_status(response_status)
    
    # Get candidate_id from candidate_or_response if it's a Candidate object
    candidate_id = None
    interview_link = None
    if candidate_or_response and hasattr(candidate_or_response, 'id'):
        candidate_id = str(candidate_or_response.id)
        if interview:
            interview_link = _get_interview_link(interview, candidate_or_response.id)
    
    return {
        "response_id": str(response.id) if response else None,
        "candidate_id": candidate_id,
        "interview_link": interview_link,
        "name": name,
        "email": email,
        "overall_score": overall_score,
        "communication_score": communication_score,
        "summary": summary,
        "status": normalized_status,
        "status_source": getattr(response, 'status_source', 'manual') if response else "manual",
        "created_at": format_datetime_ist_iso(response.created_at) if response and response.created_at else None,
        "sent_date": _format_date_for_display(sent_date),
        "given_date": _format_date_for_display(given_date),
        "image_url": getattr(response, 'candidate_image_url', None) if response else None,
        "video_url": getattr(response, 'candidate_video_url', None) if response else None,
        "cost": getattr(response, "cost", None) if response else None,
        "deepgram_cost": getattr(response, "deepgram_cost", None) if response else None,
        "elevenlabs_cost": getattr(response, "elevenlabs_cost", None) if response else None,
        "azure_cost": getattr(response, "azure_cost", None) if response else None
    }

def _sort_candidates(candidates: list, sort_by: str, sort_order: str) -> None:
    """Sort candidates list in-place based on sort_by and sort_order."""
    valid_sort_fields = ["name", "sent_date", "given_date", "overall_score", "communication_score", "created_at", "status"]
    if sort_by not in valid_sort_fields:
        sort_by = "overall_score"
    
    reverse_order = sort_order.lower() == "desc"
    
    if sort_by == "name":
        candidates.sort(key=lambda x: (x.get("name") or "").lower(), reverse=reverse_order)
    elif sort_by == "sent_date":
        if reverse_order:
            none_items = [c for c in candidates if c.get("sent_date") is None]
            non_none_items = [c for c in candidates if c.get("sent_date") is not None]
            non_none_items.sort(key=lambda x: x.get("sent_date") or "", reverse=True)
            candidates[:] = non_none_items + none_items
        else:
            candidates.sort(key=lambda x: (x.get("sent_date") is None, x.get("sent_date") or ""))
    elif sort_by == "given_date":
        if reverse_order:
            none_items = [c for c in candidates if c.get("given_date") is None]
            non_none_items = [c for c in candidates if c.get("given_date") is not None]
            non_none_items.sort(key=lambda x: x.get("given_date") or "", reverse=True)
            candidates[:] = non_none_items + none_items
        else:
            candidates.sort(key=lambda x: (x.get("given_date") is None, x.get("given_date") or ""))
    elif sort_by == "created_at":
        candidates.sort(key=lambda x: x.get("created_at") or "", reverse=reverse_order)
    elif sort_by == "status":
        status_priority = {"shortlisted": 1, "potential": 2, "no_status": 3, "rejected": 4}
        candidates.sort(key=lambda x: status_priority.get(x.get("status", "no_status"), 3), reverse=reverse_order)
    else:
        candidates.sort(key=lambda x: x.get(sort_by, 0), reverse=reverse_order)

def _calculate_duration(response) -> tuple[int, str]:
    if response.start_time and response.end_time:
        duration_seconds = int((response.end_time - response.start_time).total_seconds())
    else:
        duration_seconds = response.duration if response.duration else 0
    return duration_seconds, format_duration(duration_seconds)

def _build_question_summaries(interview, qa_history: list, overall_analysis: dict) -> list:
    all_questions = get_questions_list(interview)
    
    if interview.question_mode == "dynamic" and interview.question_count:
        while len(all_questions) < interview.question_count:
            all_questions.append({
                "question": f"Question {len(all_questions) + 1} (not generated - interview ended early)",
                "id": None
            })
    
    llm_summaries = {}
    if overall_analysis and "question_summaries" in overall_analysis:
        for qs in overall_analysis["question_summaries"]:
            llm_summaries[qs.get("question", "")] = qs.get("summary", "")
    
    question_summary = []
    for idx, q in enumerate(all_questions):
        q_text = question_text(q) if isinstance(q, dict) else str(q)
        
        has_answer = False
        answer_text = ""
        qa_analysis = {}
        if idx < len(qa_history):
            qa_item = qa_history[idx]
            answer_text = qa_item.get("answer", "").strip()
            has_answer = bool(answer_text)
            qa_analysis = qa_item.get("analysis", {}) if isinstance(qa_item.get("analysis"), dict) else {}
        
        summary = llm_summaries.get(q_text, "")
        
        if has_answer:
            if qa_analysis:
                summary = qa_analysis.get("feedback") or qa_analysis.get("summary", "")
                
                if not summary:
                    weaknesses = qa_analysis.get("weaknesses", [])
                    suggestions = qa_analysis.get("suggestions", [])
                    if weaknesses or suggestions:
                        summary_parts = []
                        if weaknesses:
                            summary_parts.append("Weaknesses: " + "; ".join(weaknesses[:2]))
                        if suggestions:
                            summary_parts.append("Suggestions: " + "; ".join(suggestions[:2]))
                        summary = ". ".join(summary_parts)
            
            if not summary or summary.lower() == "not answered":
                if answer_text and len(answer_text) > 3:
                    summary = answer_text[:200] + "..." if len(answer_text) > 200 else answer_text
                else:
                    summary = "Candidate provided a brief response: " + answer_text
        elif not summary:
            if idx < len(qa_history):
                summary = "Not Answered"
            else:
                summary = "Not Asked"
        
        if not summary or summary.lower() == "not asked":
            status = "not_asked"
        elif summary.lower() == "not answered" and not has_answer:
            status = "not_answered"
        else:
            status = "asked"
        
        question_summary.append({
            "question_number": idx + 1,
            "question": q_text,
            "status": status,
            "summary": summary if summary else "Not Answered"
        })
    
    return question_summary

def _build_transcript(qa_history: list, candidate_name: str, start_time: Optional[datetime] = None, duration_seconds: int = 0) -> list:
    transcript = []
    current_time_seconds = 0
    
    if start_time and duration_seconds > 0 and len(qa_history) > 0:
        time_per_qa = int(duration_seconds / len(qa_history)) if len(qa_history) > 0 else 0
    else:
        time_per_qa = 0
    
    for idx, qa in enumerate(qa_history):
        if qa.get("question"):
            timestamp = _format_timestamp(int(current_time_seconds))
            transcript.append({
                "speaker": "AI interviewer",
                "text": qa.get("question"),
                "timestamp": timestamp
            })
            current_time_seconds += 10
        
        if qa.get("answer"):
            timestamp = _format_timestamp(int(current_time_seconds))
            transcript.append({
                "speaker": candidate_name or "Candidate",
                "text": qa.get("answer"),
                "timestamp": timestamp
            })
            if time_per_qa > 0:
                answer_time = max(15, time_per_qa - 10)  
            else:
                answer_time = 30  
            current_time_seconds += answer_time
    
    return transcript

def _format_timestamp(seconds: int) -> str:
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02d}:{secs:02d}"

@router.post("/submit-answer")
async def submit_answer(request: SubmitAnswerRequest, background_tasks: BackgroundTasks = BackgroundTasks()):
    async with AsyncSessionLocal() as db:
        response = await get_response_or_404(db, request.response_id)
        interview = await get_interview_or_404(db, str(response.interview_id))

        qa_pair = {
            "question": request.question,
            "answer": request.transcript,
            "analysis": {}
        }

        updated_qa_history = list(response.qa_history or [])
        updated_qa_history.append(qa_pair)
        response.qa_history = updated_qa_history
        flag_modified(response, 'qa_history')
        response.current_question_index += 1

        if interview.context:
            try:
                analysis,usage = await llm_service.analyze_response(
                    str(interview.id),
                    request.transcript,
                    {"question": request.question}
                )
                updated_qa_history[-1]["analysis"] = analysis or {}
                if usage:
                    updated_qa_history[-1]["analysis_usage"] = usage
                response.qa_history = updated_qa_history
                flag_modified(response, 'qa_history')
            except Exception:
                pass

        total_questions = (
            interview.question_count 
            if interview.question_mode == "dynamic" and interview.question_count 
            else len(get_questions_list(interview))
        )
        
        is_complete = response.current_question_index >= total_questions and total_questions > 0

        cost_info = None

        if is_complete:
            response.is_completed = True
            if not response.end_time:
                response.end_time = datetime.now(timezone.utc)
            
            if response.start_time and response.end_time:
                response.duration = int((response.end_time - response.start_time).total_seconds())
            
            if interview.context:
                try:
                    final_analysis, final_usage = await llm_service.generate_final_analysis(
                        str(interview.id), response.qa_history
                    )
                    if final_usage:
                        final_analysis = dict(final_analysis or {})
                        final_analysis["_usage"] = final_usage
                    setattr(response, "overall_analysis", final_analysis)
                    # await _assign_status_if_needed(db, response, final_analysis)
                except Exception:
                    pass
            
            cost_info = apply_response_cost(response)

        try:
            await db.commit()
            await db.refresh(response)
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to save response: {str(e)}")

        if is_complete:
            try:
                await _send_hr_notification(db, response, interview)
            except Exception as e:
                logger.error(f"Failed to send HR notification for response {response.id}: {e}", exc_info=True)
            
            from routers.media_router import _merge_video_background
            background_tasks.add_task(_merge_video_background, str(response.id), None)
            logger.debug(f"Video merge task added for auto-completed interview, response_id: {response.id}")

        return {
            "ok": True,
            "complete": is_complete,
            "question_number": response.current_question_index,
            "total_questions": total_questions,
            "questions_answered": len(response.qa_history) if response.qa_history else 0,
            "analysis": qa_pair.get("analysis", {}),
            "final_analysis": getattr(response, "overall_analysis", None) if is_complete else None,
            "cost": cost_info.get("total_cost") if cost_info else None,
            "deepgram_cost": getattr(response, "deepgram_cost", None),
            "elevenlabs_cost": getattr(response, "elevenlabs_cost", None),
            "azure_cost": getattr(response, "azure_cost", None),
            "cost_breakdown": cost_info if cost_info else None
        }

@router.get("/get-overall-analysis")
async def get_overall_analysis(
    interview_id: str = Query(...),
    period: str = Query("all", description="Filter period: 'all', 'monthly', or 'weekly'"),
    include_candidates: bool = Query(True, description="Include detailed candidate list"),
    search : Optional[str] = Query(None, description="Search candidate by name"),
    status : Optional[str] = Query(None, description="Filter by status"),
    date_type : Optional[str] = Query(None, description="Filter by date type"),
    date_from : Optional[str] = Query(None, description="Start date"),
    date_to : Optional[str] = Query(None, description="End date"),
    page: Optional[int] = Query(None, ge=1, description="Page number (omit for all results)"),
    page_size: Optional[int] = Query(None, ge=1, le=50, description="Page size (omit for all results)"),
    sort_by: str = Query("overall_score", description="Sort field: 'name', 'sent_date', 'given_date', 'overall_score', 'communication_score'"),
    sort_order: str = Query("desc", description="Sort order: 'asc' or 'desc'")
):
    async with AsyncSessionLocal() as db:
        interview = await get_interview_or_404(db, interview_id)
        
        interviewer_name = None
        if interview.interviewer_id:
            interviewer_result = await db.execute(
                select(Interviewer).where(Interviewer.id == interview.interviewer_id)
            )
            interviewer = interviewer_result.scalar_one_or_none()
            if interviewer:
                interviewer_name = interviewer.name
        
        now = datetime.now(timezone.utc)
        start_date = None
        if period == "weekly":
            start_date = now - timedelta(days=7)
        elif period == "monthly":
            start_date = now - timedelta(days=30)
        
        date_from_parsed, date_to_parsed = _parse_date_filters(date_from, date_to)
        
        candidates_result = await db.execute(
            select(Candidate)
            .where(Candidate.interview_id == interview.id)
        )
        all_candidates = candidates_result.scalars().all()
        candidate_dict = {c.email.lower(): c for c in all_candidates if c.email}
        
        result = await db.execute(
            select(Response)
            .where(Response.interview_id == interview_id)
            .where(Response.is_completed == True)
        )
        all_responses = [
            r for r in result.scalars().all()
            if (r.qa_history and len(r.qa_history) > 0) or getattr(r, 'overall_analysis', None) is not None
        ]
        
        all_responses_for_lookup = all_responses.copy()
        if date_type == "given_date" and (date_from_parsed or date_to_parsed):
            incomplete_result = await db.execute(
                select(Response)
                .where(Response.interview_id == interview_id)
                .where(Response.is_completed == False)
            )
            incomplete_responses = incomplete_result.scalars().all()
            all_responses_for_lookup.extend(incomplete_responses)
        
        response_dict = {}
        for r in all_responses_for_lookup:
            if r.email:
                email_lower = r.email.lower()
                if email_lower not in response_dict or (r.created_at and response_dict[email_lower].created_at and r.created_at > response_dict[email_lower].created_at):
                    response_dict[email_lower] = r
        
        if start_date:
            responses = [r for r in all_responses if r.created_at and r.created_at >= start_date]
        else:
            responses = all_responses
        has_date_filters = date_type in ["sent_date", "given_date"] and (date_from_parsed or date_to_parsed)
        process_all_candidates = has_date_filters or include_candidates
        
        candidates = []
        total_duration = 0
        sentiment_counts_ai = {"positive": 0, "neutral": 0, "negative": 0}
        sentiment_counts_feedback = {"positive": 0, "neutral": 0, "negative": 0}
        sentiment_by_score = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        status_counts = {"shortlisted": 0, "potential": 0, "rejected": 0, "no_status": 0}
        
        processed_emails = set()
        
        for r in responses:
            overall_analysis = r.overall_analysis or {}
            overall_score = overall_analysis.get("overall_score", 0)
            communication_score = overall_analysis.get("communication_score", 0)
            
            response_status = getattr(r, 'status', None) or "no_status"
            normalized_status = _normalize_status(response_status)
            
            candidate = None
            sent_date = None
            if r.email:
                candidate = candidate_dict.get(r.email.lower())
                if candidate:
                    sent_date = candidate.mail_sent_at or (candidate.created_at if candidate.mail_sent else None)
            
            given_date = r.end_time or r.created_at
            
            date_match = _apply_date_filter(date_type, date_from_parsed, date_to_parsed, sent_date, given_date)
            status_match = _apply_status_filter(normalized_status, status)
            search_match = _apply_search_filter(r.name, r.email, search)
            
            if include_candidates and date_match and status_match and search_match:
                email_lower = r.email.lower() if r.email else None
                if email_lower:
                    processed_emails.add(email_lower)
                
                candidates.append(_build_candidate_dict(candidate or r, r, sent_date, given_date, interview))
            
            if r.duration:
                total_duration += r.duration
            
            sentiment = overall_analysis.get("sentiment", "neutral").lower()
            sentiment_counts_ai[sentiment] = sentiment_counts_ai.get(sentiment, 0) + 1
            status_counts[normalized_status] = status_counts.get(normalized_status, 0) + 1
        
        if process_all_candidates and include_candidates:
            for candidate in all_candidates:
                if not candidate.email:
                    continue
                
                email_lower = candidate.email.lower()
                if email_lower in processed_emails:
                    continue
                
                sent_date = None
                if candidate.mail_sent_at:
                    sent_date = candidate.mail_sent_at
                elif candidate.mail_sent and candidate.created_at:
                    sent_date = candidate.created_at
                
                given_date = None
                response = response_dict.get(email_lower)
                if response:
                    if response.end_time:
                        given_date = response.end_time
                    elif response.created_at:
                        given_date = response.created_at
                
                date_match = _apply_date_filter(date_type, date_from_parsed, date_to_parsed, sent_date, given_date)
                status_match = _apply_status_filter("no_status", status)  # Candidates without responses are "no_status"
                search_match = _apply_search_filter(candidate.name, candidate.email, search)
                
                if date_match and status_match and search_match:
                    candidates.append(_build_candidate_dict(candidate, response, sent_date, given_date, interview))
        
        if include_candidates:
            _sort_candidates(candidates, sort_by, sort_order)
        
        if start_date:
            feedbacks_result = await db.execute(
                select(Feedback)
                .where(Feedback.interview_id == interview.id)
                .where(Feedback.created_at >= start_date)
            )
        else:
            feedbacks_result = await db.execute(
                select(Feedback)
                .where(Feedback.interview_id == interview.id)
            )
        feedbacks = feedbacks_result.scalars().all()
        for fb in feedbacks:
            if fb.satisfaction:
                satisfaction = fb.satisfaction
                sentiment_by_score[satisfaction] = sentiment_by_score.get(satisfaction, 0) + 1
                
                if satisfaction >= 4:
                    sentiment_counts_feedback["positive"] += 1
                elif satisfaction == 3:
                    sentiment_counts_feedback["neutral"] += 1
                else:
                    sentiment_counts_feedback["negative"] += 1
        
        total_responses = len(responses)
        total_all_responses = len(all_responses)
        avg_duration = format_duration(int(total_duration / total_responses) if total_responses > 0 else 0)
        
        sent_count_result = await db.execute(
            select(func.count(Candidate.id))
            .where(Candidate.interview_id == interview.id)
            .where(Candidate.mail_sent == True)
        )
        total_sent = sent_count_result.scalar() or 0
        completed_candidates_with_sent_invites = set()
        for r in all_responses:
            if r.email:
                email_lower = r.email.lower()
                candidate = candidate_dict.get(email_lower)
                if candidate and candidate.mail_sent:
                    completed_candidates_with_sent_invites.add(email_lower)
        
        total_completed = len(completed_candidates_with_sent_invites)
        completion_rate_value = round(((total_completed / total_sent) * 100) if total_sent > 0 else 0, 1)
        completion_rate = f"{completion_rate_value}%"
        
        total_candidates = len(candidates) if include_candidates else 0
        
        if page is not None and page_size is not None:
            total_pages = (total_candidates + page_size - 1) // page_size if total_candidates > 0 else 0
            current_page = min(page, total_pages) if total_pages > 0 else 1
            
            offset = (current_page - 1) * page_size
            paginated_candidates = []
            
            if include_candidates and total_candidates > 0:
                paginated_candidates = candidates[offset:offset + page_size]
        else:
            paginated_candidates = candidates if include_candidates else []
            total_pages = 1 if total_candidates > 0 else 0
            current_page = 1
            page_size = total_candidates if total_candidates > 0 else 10  # For display purposes
        
        response_data = {
            "ok": True,
            "interview": {
                "id": str(interview.id),
                "name": interview.name,
                "job_description": getattr(interview, "job_description", None) or "",
                "description": getattr(interview, "description", None) or "",
                "time_duration": interview.time_duration,
                "interviewer_name": interviewer_name
            },
            "metrics": {
                "average_duration": avg_duration,
                "completion_rate": completion_rate,
                "total_sent": total_sent,
                "total_completed": total_completed,
                "candidate_sentiment": sentiment_counts_feedback,  # Use feedback-based sentiment for dashboard
                "status": {
                    **status_counts
                }
            },
            "period": period,
            "period_start": format_datetime_ist_iso(start_date) if start_date else None,
            "period_end": format_datetime_ist_iso(now) if start_date else None
        }
        
        if include_candidates:
            response_data["candidates"] = paginated_candidates
            if page is not None and page_size is not None:
                response_data["pagination"] = {
                    "total_count": total_candidates,
                    "total_pages": total_pages,
                    "current_page": current_page,
                    "page_size": page_size,
                    "has_next_page": current_page < total_pages,
                    "has_previous_page": current_page > 1
                }
            else:
                response_data["pagination"] = {
                    "total_count": total_candidates,
                    "is_paginated": False
                }
            response_data["sort"] = {"sort_by": sort_by, "sort_order": sort_order}
        
        return response_data


@router.get("/get-response")
async def get_response_detail(response_id: str = Query(...)):
    async with AsyncSessionLocal() as db:
        response = await get_response_or_404(db, response_id)
        interview = await get_interview_or_404(db, str(response.interview_id))
        
        candidate = None
        sent_date = None
        if response.email:
            candidate_result = await db.execute(
                select(Candidate)
                .where(Candidate.email == response.email)
                .where(Candidate.interview_id == response.interview_id)
            )
            candidate = candidate_result.scalar_one_or_none()
            if candidate:
                if candidate.mail_sent_at:
                    sent_date = candidate.mail_sent_at
                elif candidate.mail_sent and candidate.created_at:
                    sent_date = candidate.created_at
        
        given_date = response.end_time or response.created_at
        
        qa_history = response.qa_history or []
        overall_analysis = response.overall_analysis or {}
        cost_breakdown = calculate_response_cost(response)

        duration_seconds, duration_formatted = _calculate_duration(response)
        question_summary = _build_question_summaries(interview, qa_history, overall_analysis)
        transcript = _build_transcript(qa_history, response.name, response.start_time, duration_seconds)
        
        return {
            "ok": True,
            "interview": {
                "id": str(interview.id),
                "name": interview.name,
                "job_description": getattr(interview, "job_description", None) or "",
                # "department": getattr(interview, "department", None) or "",
                "time_duration": interview.time_duration
            },
            "candidate": {
                "response_id": str(response.id),
                "name": response.name,
                "email": response.email,
                "role": interview.name,  # Role/Position from interview name
                "created_at": format_datetime_ist_iso(response.created_at) if response.created_at else None,
                "sent_date": _format_date_for_display(sent_date),
                "given_date": _format_date_for_display(given_date),
                "image_url": getattr(response, 'candidate_image_url', None),
                "cost": getattr(response, "cost", None),
                "deepgram_cost": getattr(response, "deepgram_cost", None),
                "elevenlabs_cost": getattr(response, "elevenlabs_cost", None),
                "azure_cost": getattr(response, "azure_cost", None),
                "cost_breakdown": cost_breakdown
            },
            "recording": {
                "duration": duration_formatted,
                "duration_seconds": duration_seconds,
                "available": duration_seconds > 0,
                "image_url": getattr(response, 'candidate_image_url', None),
                "video_url": getattr(response, 'candidate_video_url', None),
                "tab_switch_count": getattr(response, "tab_switch_count", 0) or 0
            },
            "general_summary": {
                "overall_score": overall_analysis.get("overall_score", 0),
                "overall_feedback": overall_analysis.get("overall_feedback", "") or overall_analysis.get("overallFeedback", ""),
                "communication_score": overall_analysis.get("communication_score", 0),
                "communication_feedback": overall_analysis.get("communication_feedback", ""),
                "satisfaction_score": overall_analysis.get("satisfaction_score", 0),
                "sentiment": overall_analysis.get("sentiment", "neutral").lower()
            },
            "question_summary": question_summary,
            "transcript": transcript,
            "qa_history": qa_history,
            "status": getattr(response, 'status', 'no_status'),
            "status_source": getattr(response, 'status_source', 'auto')
        }

@router.post("/update-response-status")
async def update_response_status(request: UpdateResponseStatusRequest):
    async with AsyncSessionLocal() as db:
        response = await get_response_or_404(db, request.response_id)
        valid_statuses = ["shortlisted", "rejected", "potential", "no_status"]
        if request.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        
        response.status = request.status
        response.status_source = "manual"
        await db.commit()
        await db.refresh(response)
        
        return {"ok": True, "status": response.status, "status_source": response.status_source}

