from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, Request, Depends
from typing import Optional, Dict, List, Tuple
from pathlib import Path
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func, desc, and_
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.orm import selectinload
from db import AsyncSessionLocal
from models import Interview, Response, Candidate, Interviewer, Feedback
from schemas.interview_schema import (
    DeleteInterviewRequest,
    ToggleInterviewStatusRequest,
)
from services.summarization_service import summarization_service
from services.llm_service import llm_service
from utils.interview_utils import (
    get_interview_or_404,
    extract_text_from_file,
    get_questions_list,
    parse_manual_questions,
    commit_and_refresh,
    format_duration,
    normalize_question
)
from middleware.auth_middleware import safe_route
from routers.candidate_router import _get_interview_link
from utils.datetime_utils import format_datetime_ist_iso, normalize_to_ist, convert_utc_to_ist, IST_TIMEZONE

router = APIRouter(prefix="/api/interview", tags=["interview"])

def parse_date(date_str: Optional[str], end_of_day: bool = False) -> Optional[datetime]:
    if not date_str:
        return None
    try:
        parts = date_str.split('-')
        if len(parts) == 3:
            day, month, year = parts
            day = day.zfill(2)
            month = month.zfill(2)
            normalized = f"{day}-{month}-{year}"
            parsed_date = datetime.strptime(normalized, "%d-%m-%Y")
            if end_of_day:
                parsed_date = parsed_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            else:
                parsed_date = parsed_date.replace(hour=0, minute=0, second=0, microsecond=0)
            parsed_date = parsed_date.replace(tzinfo=IST_TIMEZONE)
            return parsed_date
    except (ValueError, IndexError):
        try:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            dt_ist = convert_utc_to_ist(dt)
            if end_of_day and dt_ist:
                dt_ist = dt_ist.replace(hour=23, minute=59, second=59, microsecond=999999)
            return dt_ist
        except ValueError:
            return None
    return None

def matches_date_range(date_to_check, start_date: Optional[datetime], end_date: Optional[datetime]) -> bool:
    if not date_to_check:
        return False
    
    if isinstance(date_to_check, datetime):
        date_to_check = date_to_check.date()
    
    if start_date:
        if isinstance(start_date, datetime):
            start_date = start_date.date()
    if end_date:
        if isinstance(end_date, datetime):
            end_date = end_date.date()
    
    if start_date and date_to_check < start_date:
        return False
    if end_date and date_to_check > end_date:
        return False
    
    return True

def serialize_interview(interview, responses_count: Optional[int] = None, include_created_at: bool = False, stats: Optional[dict] = None, candidates: Optional[list] = None, responses: Optional[list] = None, interviewer_name: Optional[str] = None):
    questions = get_questions_list(interview)
    candidate_link = _get_interview_link(interview, None)
    
    sent_date = None
    if candidates:
        sent_dates = []
        for c in candidates:
            if c.mail_sent_at:
                sent_dates.append(c.mail_sent_at)
            elif c.mail_sent and c.created_at:
                sent_dates.append(c.created_at)
        if sent_dates:
            sent_date = min(sent_dates)
    
    given_date = None
    if responses:
        given_dates = []
        for r in responses:
            if r.is_completed and ((r.qa_history and len(r.qa_history) > 0) or r.overall_analysis):
                if r.end_time:
                    given_dates.append(r.end_time)
                elif r.created_at:
                    given_dates.append(r.created_at)
        if given_dates:
            given_date = min(given_dates)
    
    result = {
        "id": str(interview.id),
        "name": interview.name,
        "job_description": getattr(interview, 'job_description', None),
        # "department": getattr(interview, 'department', None),
        "mode": interview.question_mode,
        "question_count": interview.question_count,
        "context": interview.context,
        "questions": questions if questions else None,
        "candidate_link": candidate_link,
        "description": interview.description,
        "is_open": interview.is_open if hasattr(interview, 'is_open') else True,
        "interviewer_id": str(interview.interviewer_id) if interview.interviewer_id else None,
        "interviewer_name": interviewer_name,
        "time_duration": interview.time_duration,
        "sent_date": format_datetime_ist_iso(sent_date) if sent_date else None,
        "given_date": format_datetime_ist_iso(given_date) if given_date else None,
    }
    
    if responses_count is not None:
        result["responses_count"] = responses_count
    
    if include_created_at:
        result["created_at"] = format_datetime_ist_iso(interview.created_at) if interview.created_at else None
    
    if stats:
        result["stats"] = stats

    return result

@router.post("/create-interview")
@safe_route
async def create_interview(
    name: str = Form(...),
    job_description: str = Form(...),
    # department: Optional[str] = Form(None),
    description: str = Form(...),
    mode: Optional[str] = Form(None),
    question_count: int = Form(...),
    auto_question_generate: Optional[bool] = Form(None),
    manual_questions: Optional[str] = Form(None),
    # difficulty_level: Optional[str] = Form("medium"),  
    interviewer_id: Optional[str] = Form(None),
    duration_minutes: Optional[int] = Form(None),
    jd_file: Optional[UploadFile] = File(None),
):
    async with AsyncSessionLocal() as db:
        # if difficulty_level not in ["low", "medium", "high"]:
        #     difficulty_level = "medium"
        
        interviewer_id_uuid = None
        if interviewer_id:
            try:
                from models import Interviewer
                interviewer_id_uuid = uuid.UUID(interviewer_id)
                result = await db.execute(
                    select(Interviewer).where(Interviewer.id == interviewer_id_uuid)
                )
                interviewer = result.scalar_one_or_none()
                if not interviewer:
                    raise HTTPException(status_code=404, detail="Interviewer not found")
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid interviewer_id format")
        
        time_duration_str = None
        if duration_minutes and duration_minutes > 0:
            time_duration_str = str(duration_minutes)
            
        url_id = str(uuid.uuid4())
        url = f"/candidate/interview/{url_id}"
        
        readable_slug = None
        if name:
            readable_slug = name.lower().replace(' ', '-').replace('_', '-')
            readable_slug = ''.join(c for c in readable_slug if c.isalnum() or c == '-')[:50]
            readable_slug = readable_slug.strip('-')
        
        interview = Interview(
            name=name,
            job_description=job_description,
            # department=department,
            description=description,
            question_mode=mode,
            question_count=question_count,
            auto_question_generate=auto_question_generate,
            manual_questions=parse_manual_questions(manual_questions),
            interviewer_id=interviewer_id_uuid,
            time_duration=time_duration_str,
            url=url,
            readable_slug=readable_slug
        )
        db.add(interview)
        await commit_and_refresh(db, interview)
        
        if not interview.context:
            interview.context = {}
        # interview.context["difficulty_level"] = difficulty_level
        if "context_summary" not in interview.context:
            interview.context["context_summary"] = f"Interview job_description: {job_description}"
        flag_modified(interview, 'context')

        if jd_file:
            allowed_extensions = ['.pdf', '.docx', '.doc', '.txt']
            file_extension = Path(jd_file.filename).suffix.lower()
            if file_extension not in allowed_extensions:
                raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}")
            
            jd_text = extract_text_from_file(await jd_file.read(), jd_file.filename)
            jd_summary = await summarization_service.summarize_jd(jd_text)
            if isinstance(jd_summary, dict):
                # jd_summary["difficulty_level"] = difficulty_level
                jd_summary["context_summary"] = summarization_service.get_context_for_llm(jd_summary)
            interview.context = jd_summary
            flag_modified(interview, 'context')  
        
        await db.commit()
        return serialize_interview(interview)

@router.get("/list-interviews")
async def list_interviews(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),  # all, open, close
    date_type: Optional[str] = Query(None),  # sent and given
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),  
    page_size: int = Query(10, ge=1, le=50),  
):
    async with AsyncSessionLocal() as db:
        date_from_dt = parse_date(date_from, end_of_day=False) if date_from else None
        date_to_dt = parse_date(date_to, end_of_day=True) if date_to else None

        interview_query = select(Interview)
        if search:
            interview_query = interview_query.where(Interview.name.ilike(f"%{search}%"))
        
        # Filter by status (open/close)
        if status and status.lower() in ["open", "close"]:
            is_open = status.lower() == "open"
            interview_query = interview_query.where(Interview.is_open == is_open)
        
        interview_query = interview_query.order_by(desc(Interview.created_at))

        interviews = (await db.execute(interview_query)).scalars().all()
        if not interviews:
            return {
                "ok": True,
                "interviews": [],
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_items": 0,
                    "total_pages": 0
                }
            }

        interview_ids = [i.id for i in interviews]

        cand_resp_q = (
            select(Candidate, Response)
            .outerjoin(Response, Candidate.response_id == Response.id)
            .where(Candidate.interview_id.in_(interview_ids))
        )
        candidate_rows = (await db.execute(cand_resp_q)).all()  
        responses_q = (
            select(Response)
            .where(Response.interview_id.in_(interview_ids))
        )
        all_responses = (await db.execute(responses_q)).scalars().all()
        
        response_map = {r.id: r for r in all_responses}

        candidates_by_interview: Dict[uuid.UUID, List[Tuple[Candidate, Optional[Response]]]] = {}
        for c, r in candidate_rows:
            candidates_by_interview.setdefault(c.interview_id, []).append((c, r))
        linked_response_ids = {r.id for c, r in candidate_rows if r is not None}
        
        for response in all_responses:
            if response.id not in linked_response_ids:
                interview_id = response.interview_id
                if interview_id not in candidates_by_interview:
                    candidates_by_interview[interview_id] = []
                candidates_by_interview[interview_id].append((None, response))

        all_output = []

        def in_range(dt):
            if dt is None:
                return False
            dt_ist = normalize_to_ist(dt)
            if dt_ist is None:
                return False
            if date_from_dt and dt_ist < date_from_dt:
                return False
            if date_to_dt and dt_ist > date_to_dt:
                return False
            return True

        for interview in interviews:
            rows_for_interview = candidates_by_interview.get(interview.id, [])  

            included = []

            is_date_filter_active = bool(date_type and date_from_dt and date_to_dt)

            for c, r in rows_for_interview:
                if date_type == "sent":
                    candidate_dt = c.mail_sent_at if c else None
                elif date_type == "given":
                    candidate_dt = (r.end_time if r else None)
                else:
                    candidate_dt = None

                if not is_date_filter_active:
                    included.append((c, r))
                    continue

                if candidate_dt is None:
                    continue

                if in_range(candidate_dt):
                    included.append((c, r))

            if is_date_filter_active and len(included) == 0:
                continue

            if not is_date_filter_active:
                included = rows_for_interview

            sent_count = sum(1 for c, r in included if c and c.mail_sent_at)
            given_count = sum(1 for c, r in included if r and (r.end_time or (r.is_completed and (r.qa_history or r.overall_analysis))))
            shortlisted_count = sum(1 for c, r in included if r and r.status == "shortlisted")
            def is_response_completed(r):
                if not r:
                    return False
                return bool(r.end_time or (r.is_completed and (r.qa_history or r.overall_analysis)))
            pending_count = sum(1 for c, r in included if c is not None and not is_response_completed(r))

            sent_dates = []
            for c, r in included:
                if c and c.mail_sent_at:
                    sent_dates.append(c.mail_sent_at)
                elif c and c.mail_sent and c.created_at:
                    sent_dates.append(c.created_at)
            sent_date_val = min(sent_dates) if sent_dates else None

            given_dates = []
            for c, r in included:
                if r:
                    is_completed = r.end_time or (r.is_completed and ((r.qa_history and len(r.qa_history) > 0) or r.overall_analysis))
                    if is_completed:
                        if r.end_time:
                            given_dates.append(r.end_time)
                        elif r.created_at:
                            given_dates.append(r.created_at)
            given_date_val = min(given_dates) if given_dates else None

            questions = get_questions_list(interview)

            all_output.append({
                "id": str(interview.id),
                "name": interview.name,
                "job_description": getattr(interview, 'job_description', None),
                "mode": interview.question_mode,
                "question_count": interview.question_count,
                "context": interview.context,
                "questions": questions if questions else None,
                "candidate_link": _get_interview_link(interview, None),
                "description": interview.description,
                "is_open": interview.is_open if hasattr(interview, 'is_open') else True,
                "interviewer_id": str(interview.interviewer_id) if interview.interviewer_id else None,
                "time_duration": interview.time_duration,
                "sent_date": format_datetime_ist_iso(sent_date_val) if sent_date_val else None,
                "given_date": format_datetime_ist_iso(given_date_val) if given_date_val else None,
                "created_at": format_datetime_ist_iso(interview.created_at) if interview.created_at else None,
                "stats": {
                    "sent": sent_count,
                    "given": given_count,
                    "shortlisted": shortlisted_count,
                    "pending": pending_count
                }
            })

        # Calculate pagination
        total_items = len(all_output)
        total_pages = (total_items + page_size - 1) // page_size  # Ceiling division
        
        # Calculate start and end indices for the current page
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        # Slice the results for the current page
        paginated_output = all_output[start_idx:end_idx]

        return {
            "ok": True,
            "interviews": paginated_output,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_items": total_items,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1
            }
        }

@router.get("/list-single-interview")
@safe_route
async def list_single_interview(interview_id: str = Query(...)):
    async with AsyncSessionLocal() as db:
        # Eager load the interviewer relationship
        result = await db.execute(
            select(Interview)
            .options(selectinload(Interview.interviewer))
            .where(Interview.id == interview_id)
        )
        interview = result.scalar_one_or_none()
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        
        count_result = await db.execute(
            select(Response)
            .where(Response.interview_id == interview.id)
            .where(Response.is_completed == True)
        )
        completed_responses = count_result.scalars().all()
        actual_response_count = sum(
            1 for r in completed_responses
            if (r.qa_history and len(r.qa_history) > 0) or getattr(r, 'overall_analysis', None) is not None
        )
        
        sent_result = await db.execute(
            select(func.count(Candidate.id))
            .where(Candidate.interview_id == interview.id)
            .where(Candidate.mail_sent == True)
        )
        sent_count = sent_result.scalar() or 0

        shortlisted_result = await db.execute(
            select(func.count(Response.id))
            .where(Response.interview_id == interview.id)
            .where(Response.status == "shortlisted")
        )
        shortlisted_count = shortlisted_result.scalar() or 0

        candidates_sent_result = await db.execute(
            select(Candidate)
            .where(Candidate.interview_id == interview.id)
            .where(Candidate.mail_sent == True)
        )
        candidates_sent_list = candidates_sent_result.scalars().all()
        completed_response_ids = {r.id for r in completed_responses}

        pending_count = sum(
            1 for c in candidates_sent_list
            if not c.response_id or c.response_id not in completed_response_ids
        )

        sent_dates = []
        for c in candidates_sent_list:
            if c.mail_sent_at:
                sent_dates.append(c.mail_sent_at.date().isoformat())
            elif c.mail_sent and c.created_at:
                sent_dates.append(c.created_at.date().isoformat())
        
        given_dates = []
        for r in completed_responses:
            if r.end_time:
                given_dates.append(r.end_time.date().isoformat())
            elif (r.qa_history and len(r.qa_history) > 0) or getattr(r, 'overall_analysis', None) is not None:
                if r.created_at:
                    given_dates.append(r.created_at.date().isoformat())

        all_candidates_result = await db.execute(
            select(Candidate)
            .where(Candidate.interview_id == interview.id)
        )
        all_candidates = all_candidates_result.scalars().all()
        
        all_responses_result = await db.execute(
            select(Response)
            .where(Response.interview_id == interview.id)
        )
        all_responses = all_responses_result.scalars().all()

        stats = {
            "sent": sent_count,
            "given": actual_response_count,
            "shortlisted": shortlisted_count,
            "pending": pending_count,
            "sent_dates": sent_dates,  
            "given_dates": given_dates  
        }

        interviewer_name = interview.interviewer.name if interview.interviewer else None
        
        return serialize_interview(
            interview, 
            interviewer_name=interviewer_name,
            responses_count=actual_response_count, 
            include_created_at=True, 
            stats=stats,
            candidates=list(all_candidates),
            responses=list(all_responses)
        )

def merge_manual_questions(existing_questions: list, incoming_questions: list) -> list:
    existing_by_id = {q.get("id"): q for q in existing_questions if q.get("id")}
    existing_by_text = {q.get("question", "").strip(): q for q in existing_questions}
    merged = []
    processed_ids = set()
    for incoming_q in incoming_questions:
        normalized = normalize_question(incoming_q)
        incoming_id = normalized.get("id")
        incoming_text = normalized.get("question", "").strip()
        
        if incoming_id and incoming_id in existing_by_id:
            normalized["id"] = incoming_id
            processed_ids.add(incoming_id)
        
        elif not incoming_id and incoming_text in existing_by_text:
            existing_q = existing_by_text[incoming_text]
            if existing_q.get("id"):
                normalized["id"] = existing_q.get("id")
                processed_ids.add(existing_q.get("id"))
        
        merged.append(normalized)
    
    return merged
    
@router.post("/update-interview")
@safe_route
async def update_interview(
    interview_id: str = Form(...),
    mode: Optional[str] = Form(None),
    auto_question_generate: Optional[bool] = Form(None),
    manual_questions: Optional[str] = Form(None),
    job_description: Optional[str] = Form(None),
    # department: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    name: Optional[str] = Form(None),
    # difficulty_level: Optional[str] = Form(None),
    question_count: Optional[int] = Form(None),
    interviewer_id: Optional[str] = Form(None),
    duration_minutes: Optional[int] = Form(None),
):
    async with AsyncSessionLocal() as db:
        interview = await get_interview_or_404(db, interview_id)

        original_mode = interview.question_mode
        original_qc = interview.question_count

        if name is not None:
            interview.name = name
        if job_description is not None:
            interview.job_description = job_description
        # if department is not None:
        #     interview.department = department
        if description is not None:
            interview.description = description
        if mode is not None:
            interview.question_mode = mode
        mode = interview.question_mode
        auto_question_generate = auto_question_generate if auto_question_generate is not None else interview.auto_question_generate
        if question_count is not None and question_count > 0:
            interview.question_count = question_count

        if interviewer_id is not None:
            if interviewer_id == "":
                interview.interviewer_id = None
            else:
                try:
                    interviewer_id_uuid = uuid.UUID(interviewer_id)
                    interviewer_check = await db.execute(
                        select(Interviewer).where(Interviewer.id == interviewer_id_uuid)
                    )
                    if interviewer_check.scalar_one_or_none():
                        interview.interviewer_id = interviewer_id_uuid
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid interviewer_id format")

        if duration_minutes is not None and duration_minutes > 0:
            interview.time_duration = str(duration_minutes)
        
        if manual_questions is not None:
            parsed_questions = parse_manual_questions(manual_questions)
            
            if interview.question_mode == "dynamic":
                interview.manual_questions = None
            elif interview.auto_question_generate:
                if parsed_questions and len(parsed_questions) > 0:
                    formatted_questions = []
                    for q in parsed_questions:
                        formatted_q = {
                            "id": str(q.get("id")) if q.get("id") else None,
                            "question": q.get("question", "")
                            # "difficulty": q.get("depth_level", "medium")  
                        }
                        if formatted_q["id"]:
                            formatted_questions.append(formatted_q)
                        else:
                            formatted_q["id"] = str(uuid.uuid4())
                            formatted_questions.append(formatted_q)
                    
                    interview.llm_generated_questions = {"questions": formatted_questions}
                    flag_modified(interview, 'llm_generated_questions')
                    interview.manual_questions = None
            else:
                if parsed_questions and len(parsed_questions) > 0:
                    existing = interview.manual_questions or []
                    if not isinstance(existing, list):
                        existing = []
                    merged_questions = merge_manual_questions(existing, parsed_questions)
                    interview.manual_questions = merged_questions
                else:
                    interview.manual_questions = None
                if auto_question_generate is None:
                    interview.auto_question_generate = False
        
        # if difficulty_level is not None:
        #     if difficulty_level not in ["low", "medium", "high"]:
        #         difficulty_level = "medium"
        #     if not interview.context:
        #         interview.context = {}
        #     interview.context["difficulty_level"] = difficulty_level
        #     flag_modified(interview, 'context')  

        if (
            original_mode != interview.question_mode
            or original_qc != interview.question_count
        ):
            interview.llm_generated_questions = None

        await db.commit()
        await db.refresh(interview)
        return serialize_interview(interview)

@router.post("/delete-interview")
@safe_route
async def delete_interview(
    payload: DeleteInterviewRequest,
):
    async with AsyncSessionLocal() as db:
        interview = await get_interview_or_404(db, payload.interview_id)
        try:
            await db.delete(interview)
            await db.commit()
            return {"ok": True, "message": "Interview deleted successfully"}
        except Exception as e:
            await db.rollback()
            raise  

@router.post("/toggle-interview-status")
@safe_route
async def toggle_interview_status(
    payload: ToggleInterviewStatusRequest,
):
    async with AsyncSessionLocal() as db:
        interview = await get_interview_or_404(db, payload.interview_id)
        interview.is_open = not interview.is_open
        await db.commit()
        await db.refresh(interview)
        return {"ok": True, "is_open": interview.is_open}

@router.get("/check-interview")
async def check_interview(interview_id: str = Query(...)):
    """
    Public endpoint to check if an interview exists and get basic info.
    Used by candidates to verify interview before starting.
    """
    async with AsyncSessionLocal() as db:
        # Try to find by ID first
        try:
            interview_uuid = uuid.UUID(interview_id)
            result = await db.execute(select(Interview).where(Interview.id == interview_uuid))
            interview = result.scalar_one_or_none()
        except ValueError:
            # If not a valid UUID, try to find by readable_slug
            result = await db.execute(select(Interview).where(Interview.readable_slug == interview_id))
            interview = result.scalar_one_or_none()
        
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        
        return {
            "ok": True,
            "id": str(interview.id),
            "name": interview.name,
            "description": interview.description,
            "question_count": interview.question_count,
            "time_duration": interview.time_duration,
            "is_open": interview.is_open if hasattr(interview, 'is_open') else True,
        }
    
@router.get("/list-interview-responses")
@safe_route
async def list_responses(interview_id: str = Query(...)):
    async with AsyncSessionLocal() as db:
        interview = await get_interview_or_404(db, interview_id)
        result = await db.execute(select(Response).where(Response.interview_id == interview_id))
        rows = result.scalars().all()
        payload = [{
            "response_id": str(r.id),
            "name": r.name,
            "email": r.email,
            "answered_questions": len(r.qa_history or []),
            "cost": getattr(r, "cost", None),
            "deepgram_cost": getattr(r, "deepgram_cost", None),
            "elevenlabs_cost": getattr(r, "elevenlabs_cost", None),
            "azure_cost": getattr(r, "azure_cost", None),
        } for r in rows]
        return {"ok": True, "responses": payload}

@router.get("/list-interviews-names")
@safe_route
async def list_interviews_name():
    async with AsyncSessionLocal() as db :
        result = await db.execute(select(Interview))
        rows = result.scalars().all()
        payload = [{
            "interview_id": str(r.id),
            "name": r.name,
        } for r in rows]
    return {"ok":True, "interviews":payload} 