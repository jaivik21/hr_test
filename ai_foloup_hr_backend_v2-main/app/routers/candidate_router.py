from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, Body
from typing import Optional, List, Dict, Any
import csv
import io
import os
from sqlalchemy import select, desc
from db import AsyncSessionLocal
from models import Candidate, Interview, Response, User
import pandas as pd
from schemas.candidate_schema import CreateCandidateRequest, CandidateData
from middleware.auth_middleware import safe_route
from utils.interview_utils import get_interview_or_404
from utils.user_auth import send_email
from utils.logger import get_logger
from config_loader import load_config
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import or_, case, desc, func, and_
import math
import uuid as uuid_lib
from utils.datetime_utils import format_datetime_ist_display, format_datetime_ist_iso

logger = get_logger(__name__)
router = APIRouter(prefix="/api/interview", tags=["candidates"])
_config = load_config()

def _format_date_for_display(dt: Optional[datetime]) -> Optional[str]:
    return format_datetime_ist_display(dt)


def _parse_date_filter_list_candidates(d: Optional[str], is_end: bool = False) -> Optional[datetime]:
    if not d:
        return None
    try:
        parts = d.split('-')
        if len(parts) == 3:
            day, month, year = parts
            day = day.zfill(2)
            month = month.zfill(2)
            normalized = f"{day}-{month}-{year}"
            parsed_date = datetime.strptime(normalized, "%d-%m-%Y")
            if is_end:
                return datetime.combine(parsed_date.date(), datetime.max.time()).replace(tzinfo=timezone.utc)
            else:
                return datetime.combine(parsed_date.date(), datetime.min.time()).replace(tzinfo=timezone.utc)
    except (ValueError, IndexError):
        try:
            dt = datetime.fromisoformat(d.replace('Z', '+00:00'))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            else:
                dt = dt.astimezone(timezone.utc)
            return dt
        except ValueError:
            return None
    return None

async def _load_responses_for_candidates(db, interview_ids: set, date_type: Optional[str], d_from: Optional[datetime], d_to: Optional[datetime]) -> list:
    all_responses = []
    if not interview_ids:
        return all_responses
    
    if date_type == "given_date" and (d_from or d_to):
        completed_query = select(Response).where(
            Response.interview_id.in_(list(interview_ids))
        ).where(Response.is_completed == True)
        completed_result = await db.execute(completed_query)
        completed_responses = completed_result.scalars().all()
        logger.info(f"Loaded {len(completed_responses)} completed responses")
        all_responses.extend(completed_responses)
        
        incomplete_query = select(Response).where(
            Response.interview_id.in_(list(interview_ids))
        ).where(Response.is_completed == False)
        incomplete_result = await db.execute(incomplete_query)
        incomplete_responses = incomplete_result.scalars().all()
        logger.info(f"Loaded {len(incomplete_responses)} incomplete responses")
        all_responses.extend(incomplete_responses)
    else:
        response_query = select(Response).where(Response.interview_id.in_(list(interview_ids)))
        response_result = await db.execute(response_query)
        all_responses = list(response_result.scalars().all())
        logger.info(f"Loaded {len(all_responses)} total responses (all types)")
    
    return all_responses

def _build_response_lookup_dict(all_responses: list) -> dict:
    response_dict = {}
    responses_without_email = 0
    responses_without_interview_id = 0
    
    for r in all_responses:
        if r.email:
            email_key = r.email.lower().strip()
            if r.interview_id:
                key = (email_key, str(r.interview_id))
                if key not in response_dict:
                    response_dict[key] = r
                    logger.info(f"Added response to dict: email={email_key}, interview_id={r.interview_id}, response_id={r.id}, end_time={r.end_time}, created_at={r.created_at}")
                elif r.created_at and response_dict[key].created_at:
                    if r.created_at > response_dict[key].created_at:
                        response_dict[key] = r
            else:
                responses_without_interview_id += 1
                logger.info(f"Response {r.id} has no interview_id, email={r.email}")
        else:
            responses_without_email += 1
            logger.info(f"Response {r.id} has no email, interview_id={r.interview_id}")
    
        logger.info(f"Created response_dict with {len(response_dict)} entries. Responses without email: {responses_without_email}, without interview_id: {responses_without_interview_id}")
    
    return response_dict

def _find_matching_response(candidate: Candidate, all_responses: list, response_dict: dict) -> Optional[Response]:
    response = None
    
    if candidate.response_id:
        for r in all_responses:
            if r.id == candidate.response_id:
                response = r
                logger.debug(f"Candidate {candidate.email} matched by response_id: {candidate.response_id}")
                break
    
    if not response and candidate.email:
        email_key = candidate.email.lower().strip()
        candidate_interview_id_str = str(candidate.interview_id)
        key = (email_key, candidate_interview_id_str)
        response = response_dict.get(key)
        if response:
            logger.info(f"✓ Candidate {candidate.email} matched by email+interview_id: {key}")
        else:
            logger.info(f"✗ Candidate {candidate.email} (interview_id={candidate_interview_id_str}) not found in response_dict. Looking for key: {key}")
            matching_email_responses = [k for k in response_dict.keys() if k[0] == email_key]
            if matching_email_responses:
                logger.info(f"  → Found responses with same email but different interview_id: {matching_email_responses}")
            matching_interview_responses = [k for k in response_dict.keys() if k[1] == candidate_interview_id_str]
            if matching_interview_responses:
                logger.info(f"  → Found responses with same interview_id but different email: {matching_interview_responses}")
    
    return response

def _apply_search_filter_list_candidates(candidate: Candidate, search: Optional[str]) -> bool:
    if not search:
        return True
    
    search_lower = search.lower().strip()
    search_match = (
        (candidate.name and search_lower in candidate.name.lower()) or
        (candidate.email and search_lower in candidate.email.lower()) or
        (candidate.phone_number and search_lower in candidate.phone_number.lower())
    )
    return search_match

def _apply_status_filter_list_candidates(response: Optional[Response], status: Optional[str]) -> bool:
    if not status:
        return True
    
    response_status = response.status if response else None
    
    if status == "shortlisted":
        return response_status in ["shortlisted", "selected"]
    elif status == "rejected":
        return response_status in ["rejected", "not_selected"]
    elif status == "no_status":
        if response_status and response_status not in ["", None] and response_status in ["shortlisted", "potential", "rejected", "selected", "not_selected"]:
            return False
        return True
    elif status == "potential":
        return response_status == "potential"
    else:
        return response_status == status

def _find_response_by_interview_id_for_given_date(candidate: Candidate, all_responses: list, d_from: Optional[datetime], d_to: Optional[datetime]) -> Optional[Response]:
    for r in all_responses:
        if r.interview_id == candidate.interview_id:
            given_date_dt = None
            if r.end_time:
                given_date_dt = r.end_time
            elif r.created_at:
                given_date_dt = r.created_at
            
            if given_date_dt:
                if given_date_dt.tzinfo is None:
                    given_date_dt = given_date_dt.replace(tzinfo=timezone.utc)
                else:
                    given_date_dt = given_date_dt.astimezone(timezone.utc)
                
                given_date_only = given_date_dt.date()
                
                if d_from and given_date_only < d_from.date():
                    continue
                if d_to and given_date_only > d_to.date():
                    continue
                return r
    
    return None

def _apply_given_date_filter(candidate: Candidate, response: Optional[Response], all_responses: list, 
                             d_from: Optional[datetime], d_to: Optional[datetime]) -> tuple[Optional[Response], bool]:
    if not response:
        response = _find_response_by_interview_id_for_given_date(candidate, all_responses, d_from, d_to)
        if not response:
            logger.debug(f"Candidate {candidate.email} skipped: no response for given_date filter")
            return None, False
    
    given_date_dt = None
    if response.end_time:
        given_date_dt = response.end_time
    elif response.created_at:
        given_date_dt = response.created_at
    
    if not given_date_dt:
        logger.debug(f"Candidate {candidate.email} skipped: response has no end_time or created_at")
        return None, False
    
    if given_date_dt.tzinfo is None:
        given_date_dt = given_date_dt.replace(tzinfo=timezone.utc)
    else:
        given_date_dt = given_date_dt.astimezone(timezone.utc)
    
    given_date_only = given_date_dt.date()    
    if d_from and given_date_only < d_from.date():
        logger.debug(f"Candidate {candidate.email} filtered out: {given_date_only} < {d_from.date()}")
        return response, False
    if d_to and given_date_only > d_to.date():
        logger.debug(f"Candidate {candidate.email} filtered out: {given_date_only} > {d_to.date()}")
        return response, False
    
    logger.debug(f"Candidate {candidate.email} passed date filter: {given_date_only} is within range")
    return response, True

def _build_candidate_data_dict(candidate: Candidate, interview: Interview, response: Optional[Response]) -> dict:
    sent_date_dt = None
    if candidate.mail_sent_at:
        sent_date_dt = candidate.mail_sent_at
    elif candidate.mail_sent and candidate.created_at:
        sent_date_dt = candidate.created_at
    
    given_date_dt = None
    if response:
        if response.end_time:
            given_date_dt = response.end_time
        elif response.created_at:
            given_date_dt = response.created_at
        
        if given_date_dt:
            if given_date_dt.tzinfo is None:
                given_date_dt = given_date_dt.replace(tzinfo=timezone.utc)
            else:
                given_date_dt = given_date_dt.astimezone(timezone.utc)
    
    overall_analysis = getattr(response, "overall_analysis", {}) if response else {}
    response_status = response.status if response else "no_status"
    
    return {
        "candidate": candidate,
        "interview": interview,
        "response": response,
        "sent_date_dt": sent_date_dt,
        "given_date_dt": given_date_dt,
        "overall_analysis": overall_analysis,
        "status": response_status
    }

def _sort_candidates_list(candidates_data: list, sort_by: str, sort_order: str) -> None:
    valid_sort_fields = ["name", "sent_date", "given_date", "overall_score", "communication_score"]
    if sort_by not in valid_sort_fields:
        sort_by = "created_at"  # Default
    
    reverse_order = sort_order.lower() in ["desc", "dsc"]
    
    if sort_by == "name":
        candidates_data.sort(key=lambda x: (x["candidate"].name or "").lower(), reverse=reverse_order)
    elif sort_by == "sent_date":
        if reverse_order:
            none_items = [c for c in candidates_data if c.get("sent_date_dt") is None]
            non_none_items = [c for c in candidates_data if c.get("sent_date_dt") is not None]
            non_none_items.sort(key=lambda x: x.get("sent_date_dt") or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
            candidates_data[:] = non_none_items + none_items
        else:
            candidates_data.sort(key=lambda x: (x.get("sent_date_dt") is None, x.get("sent_date_dt") or datetime.min.replace(tzinfo=timezone.utc)))
    elif sort_by == "given_date":
        if reverse_order:
            none_items = [c for c in candidates_data if c.get("given_date_dt") is None]
            non_none_items = [c for c in candidates_data if c.get("given_date_dt") is not None]
            non_none_items.sort(key=lambda x: x.get("given_date_dt") or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
            candidates_data[:] = non_none_items + none_items
        else:
            candidates_data.sort(key=lambda x: (x.get("given_date_dt") is None, x.get("given_date_dt") or datetime.min.replace(tzinfo=timezone.utc)))
    elif sort_by == "overall_score":
        candidates_data.sort(key=lambda x: x.get("overall_analysis", {}).get("overall_score", 0) or 0, reverse=reverse_order)
    elif sort_by == "communication_score":
        candidates_data.sort(key=lambda x: x.get("overall_analysis", {}).get("communication_score", 0) or 0, reverse=reverse_order)


def _serialize_candidate(c: Candidate) -> dict:
    return {
        "id": str(c.id),
        "interview_id": str(c.interview_id),
        "response_id": str(c.response_id) if c.response_id else None,
        "interview_name": c.interview.name,
        "name": c.name,
        "email": c.email,
        "phone_number": c.phone_number,
        "mail_sent": getattr(c, 'mail_sent', False),
        "created_at": format_datetime_ist_iso(c.created_at) if getattr(c, "created_at", None) else None
    }


async def _attach_response_if_exists(db, candidate: Candidate):
    if candidate.response_id:
        return
    result = await db.execute(
        select(Response)
        .where(Response.interview_id == candidate.interview_id)
        .where(Response.email == candidate.email)
    )
    resp = result.scalar_one_or_none()
    if resp:
        candidate.response_id = resp.id


def _get_interview_link(interview: Interview, candidate_id) -> str:
    frontend_base_url = (
        _config.get("frontend", {}).get("base_url") or
        os.getenv("FRONTEND_BASE_URL") or
        "http://localhost:5173"
    )
    
    if candidate_id is None:
        logger.warning(f"Candidate ID is None when generating interview link for interview {interview.id}")
        candidate_id_str = ""
    else:
        candidate_id_str = str(candidate_id)
        return f"{frontend_base_url}/candidate/interview/{interview.id}/{candidate_id_str}"

async def _send_invite_to_candidate(db, candidate: Candidate, interview: Interview) -> bool:
    try:
        candidate_link = _get_interview_link(interview, candidate.id)
        support_email = _config.get("SMTP", {}).get("email") or "support@example.com"
        
        subject = f"Invitation to Interview – {interview.name}"
        body = f"""Hello {candidate.name},

        We are pleased to invite you to participate in the interview process for {interview.name}.

        Please click the link below to begin your interview at your convenience:

        👉 {candidate_link}

        If you have any questions or face any issues accessing the interview, please contact us at {support_email}.

        Best regards,

        AI Hiring Assistant

        Powered by Techify Solutions"""

        send_email(candidate.email, subject, body)
        candidate.mail_sent = True
        candidate.mail_sent_at = datetime.now(timezone.utc)

        return True
    except Exception as e:
        logger.error(f"Failed to send invite to candidate {candidate.email}: {e}", exc_info=True)
        return False


async def _send_hr_notification(db, response: Response, interview: Interview) -> bool:
    try:
        if not interview.user_id:
            logger.warning(f"Interview {interview.id} has no user_id, cannot send HR notification")
            return False
        
        hr_user_result = await db.execute(
            select(User).where(User.id == interview.user_id)
        )
        hr_user = hr_user_result.scalar_one_or_none()
        
        if not hr_user or not hr_user.email:
            logger.warning(f"HR user not found or has no email for interview {interview.id}")
            return False
        
        hr_email = hr_user.email
        
        start_time_str = "N/A"
        end_time_str = "N/A"
        duration_str = "N/A"
        
        if response.start_time:
            start_time_str = response.start_time.strftime("%Y-%m-%d %H:%M:%S UTC")
        if response.end_time:
            end_time_str = response.end_time.strftime("%Y-%m-%d %H:%M:%S UTC")
        if response.duration:
            minutes = response.duration // 60
            seconds = response.duration % 60
            duration_str = f"{minutes} minutes {seconds} seconds"
        
        overall_analysis = getattr(response, "overall_analysis", None) or {}
        
        scores_section = []
        
        overall_score = overall_analysis.get("overall_score")
        if overall_score is not None:
            scores_section.append(f"Overall Score: {overall_score}/100")
        
        communication_score = overall_analysis.get("communication_score")
        if communication_score is not None:
            scores_section.append(f"Communication Score: {communication_score}/10")
        
        for key, value in overall_analysis.items():
            if key.endswith("_score") and key not in ["overall_score", "communication_score"]:
                score_name = key.replace("_score", "").replace("_", " ").title()
                scores_section.append(f"{score_name}: {value}")
        
        scores_text = "\n".join(scores_section) if scores_section else "No evaluation scores available yet."
        
        subject = f"Interview Completed – {response.name} | {interview.name}"
        body = f"""Dear HR,

        The following candidate has completed their interview. Please find the details below:

        CANDIDATE DETAILS

        Name: {response.name}

        Email: {response.email}

        INTERVIEW DETAILS

        Interview Title: {interview.name}

        TEST DURATION

        Start Time: {start_time_str}

        End Time: {end_time_str}

        Total Duration: {duration_str}

        EVALUATION SCORES

        {scores_text}

        You can review the complete candidate report and insights in the dashboard.

        Best regards,

        AI Hiring Assistant

        Powered by Techify Solutions
        """
        
        send_email(hr_email, subject, body)
        logger.info(f"HR notification sent to {hr_email} for completed interview (Response ID: {response.id})")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send HR notification for response {response.id}: {e}", exc_info=True)
        return False


async def _check_duplicate_candidate(db, interview_id: str, email: str) -> bool:
    result = await db.execute(
        select(Candidate)
        .where(Candidate.interview_id == interview_id)
        .where(Candidate.email == email)
    )
    return result.scalar_one_or_none() is not None

async def _check_candidate_has_given_interview(db, email: str) -> Optional[Dict[str, Any]]:
    email_lower = email.lower().strip()
    
    result = await db.execute(
        select(Candidate, Interview)
        .join(Interview, Candidate.interview_id == Interview.id)
        .where(Candidate.email == email_lower)
        .where(Candidate.mail_sent == True)
        .order_by(desc(Candidate.mail_sent_at).nulls_last(), desc(Candidate.created_at))
    )
    candidate_interview = result.first()
    
    if not candidate_interview:
        return None
    
    candidate, interview = candidate_interview
    
    is_given = False
    given_date = None
    
    if candidate.response_id:
        response_result = await db.execute(
            select(Response).where(Response.id == candidate.response_id)
        )
        response = response_result.scalar_one_or_none()
        
        if response:
            is_given = True
            if response.end_time:
                given_date = format_datetime_ist_iso(response.end_time)
            elif response.created_at:
                given_date = format_datetime_ist_iso(response.created_at)
    
    return {
        "is_given": is_given,
        "given_date": given_date,
        "interview_name": interview.name
    }

async def _create_candidate(db, interview_id: str, name: str, email: str, phone_number: Optional[str] = None) -> Candidate:
    candidate = Candidate(
        interview_id=interview_id,
        name=name,
        email=email,
        phone_number=phone_number,
        mail_sent=False,
    )
    await _attach_response_if_exists(db, candidate)
    db.add(candidate)
    return candidate

async def _ensure_candidate_from_response(db, response: Response, interview_id: Optional[str] = None) -> Optional[Candidate]:
    if not response.email:
        logger.debug(f"Response {response.id} has no email, cannot create candidate record")
        return None
    
    email_lower = response.email.lower().strip()
    response_interview_id = interview_id or response.interview_id
    
    if not response_interview_id:
        logger.debug(f"Response {response.id} has no interview_id, cannot create candidate record")
        return None
    
    candidate_result = await db.execute(
        select(Candidate)
        .where(Candidate.interview_id == response_interview_id)
        .where(Candidate.email == email_lower)
        .order_by(desc(Candidate.created_at))  # Get most recent if multiple
        .limit(1)
    )
    candidate = candidate_result.scalar_one_or_none()
    
    if candidate:
        if not candidate.response_id:
            candidate.response_id = response.id
            logger.info(f"Updated candidate {candidate.id} with response_id {response.id}")
        return candidate
    
    logger.info(f"Creating candidate record from response {response.id} for email {email_lower}")
    try:
        import uuid as uuid_lib
        interview_uuid = uuid_lib.UUID(response_interview_id) if isinstance(response_interview_id, str) else response_interview_id
        
        candidate = Candidate(
            interview_id=interview_uuid,
            name=response.name or email_lower.split('@')[0],  # Use name from response or derive from email
            email=email_lower,
            response_id=response.id,
            mail_sent=False,  # False because they accessed via link, not invited
            # mail_sent_at remains None since no invite was sent
        )
        db.add(candidate)
        await db.flush()
        await db.refresh(candidate)
        logger.info(f"Created candidate record {candidate.id} from response {response.id} for email {email_lower}")
        return candidate
    except Exception as create_error:
        logger.error(f"Failed to create candidate from response {response.id}: {create_error}", exc_info=True)
        return None

@router.get("/previously-appeared-candidates")
@safe_route
async def previously_appeared_candidates(email: str = Query(..., description="Email address to lookup")):
    async with AsyncSessionLocal() as db:
        email_lower = email.lower().strip()
        result = await db.execute(
            select(Candidate, Interview)
            .join(Interview, Candidate.interview_id == Interview.id)
            .where(Candidate.email == email_lower)
            .where(Candidate.mail_sent == True)
            .order_by(desc(Candidate.mail_sent_at).nulls_last(), desc(Candidate.created_at))
        )
        candidates_with_invites = result.all()
        
        if not candidates_with_invites:
            return {
                "ok": True,
                "is_given": False,
                "interviews": []
            }
        
        interviews_list = []
        is_given = False
        
        for candidate, interview in candidates_with_invites:
            given_date = None
            
            if candidate.response_id:
                response_result = await db.execute(
                    select(Response).where(Response.id == candidate.response_id)
                )
                response = response_result.scalar_one_or_none()
                
                if response:
                    is_given = True
                    if response.end_time:
                        given_date = response.end_time.isoformat()
                    elif response.created_at:
                        given_date = response.created_at.isoformat()
            
            interviews_list.append({
                "interview_name": interview.name,
                "given_date": given_date
            })
        
        return {
            "ok": True,
            "is_given": is_given,
            "interviews": interviews_list
        }

@router.post("/add-candidate")
@safe_route
async def add_candidate(payload: CreateCandidateRequest):
    async with AsyncSessionLocal() as db:
        interview = await get_interview_or_404(db, str(payload.interview_id))
        
        if not interview.is_open:
            raise HTTPException(
                status_code=400,
                detail="Cannot add candidates. Interview is not active. Please reopen the interview first."
            )
        
        created_candidates = []
        candidate_objects = []  
        
        for candidate_data in payload.candidates:
            email = candidate_data.email.lower().strip()
            
            if await _check_duplicate_candidate(db, str(payload.interview_id), email):
                raise HTTPException(
                    status_code=409,
                    detail=f"Candidate with email {email} already exists for this interview"
                )
            
            candidate = await _create_candidate(
                db, 
                str(payload.interview_id), 
                candidate_data.name, 
                email, 
                candidate_data.phone_number
            )
            
            await db.flush()
            await db.refresh(candidate)
            
            # if candidate.id is None:
            #     logger.error(f"Candidate ID is None after flush for email {email}")
            #     skipped_candidates.append({
            #         "email": email,
            #         "name": candidate_data.name,
            #         "reason": "failed to generate candidate ID"
            #     })
            #     continue
            
            invite_sent = await _send_invite_to_candidate(db, candidate, interview)
            
            candidate_objects.append((candidate, invite_sent))
        
        await db.commit()
        for candidate, invite_sent in candidate_objects:
            await db.refresh(candidate)
            created_candidates.append({
                "candidate": _serialize_candidate(candidate),
                "invite_sent": invite_sent,
                "interview_link": _get_interview_link(interview, candidate.id)
            })
        
        return {
            "ok": True,
            "created": created_candidates
        }


def _normalize_header(header: str) -> str:
    header = header.strip().lower()
    if header in ["phone number", "phone", "phone_number", "phonenumber"]:
        return "phone_number"
    return header

def _parse_upload_file(content: bytes, file_extension: str) -> List[Dict[str, Any]]:
    if file_extension == ".xlsx":
        try:
            df = pd.read_excel(io.BytesIO(content))
            df.columns = df.columns.str.strip()
            rows = df.to_dict("records")
        except ImportError:
            raise HTTPException(
                status_code=400,
                detail="XLSX support requires pandas library. Please install it or use CSV format."
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse XLSX file: {str(e)}")
    else:
        try:
            text = content.decode("utf-8-sig", errors="replace")
        except Exception:
            raise HTTPException(status_code=400, detail="CSV must be UTF-8 encoded")
        reader = csv.DictReader(io.StringIO(text, newline=""))
        rows = list(reader)

    if not rows:
        raise HTTPException(status_code=400, detail="File is empty or has no data rows")

    original_headers = list(rows[0].keys()) if rows else []

    normalized_rows = []
    for row in rows:
        normalized_row = {_normalize_header(k): v for k, v in row.items()}
        normalized_rows.append(normalized_row)

    required = {"name", "email"}
    if not required.issubset(set(normalized_rows[0].keys())):
        raise HTTPException(
            status_code=400,
            detail=f"File must include headers: Name/name, Email/email[, Phone Number/phone_number]. Found headers: {', '.join(original_headers)}"
        )

    return normalized_rows

async def _select_candidate_for_previously_appeared(db, candidate_interviews) -> tuple:
    selected_candidate = None
    selected_interview = None
    selected_is_given = False
    selected_given_date = None
    
    for prev_candidate, prev_interview in candidate_interviews:
        if prev_candidate.response_id:
            response_result = await db.execute(
                select(Response).where(Response.id == prev_candidate.response_id)
            )
            response = response_result.scalar_one_or_none()
            
            if response:
                selected_candidate = prev_candidate
                selected_interview = prev_interview
                selected_is_given = True
                if response.end_time:
                    selected_given_date = format_datetime_ist_iso(response.end_time)
                elif response.created_at:
                    selected_given_date = format_datetime_ist_iso(response.created_at)
                break
    
    if selected_candidate is None:
        prev_candidate, prev_interview = candidate_interviews[0]
        selected_candidate = prev_candidate
        selected_interview = prev_interview
        selected_is_given = False
        selected_given_date = None
    
    return selected_candidate, selected_interview, selected_is_given, selected_given_date

@router.post("/bulk-upload")
@safe_route
async def bulk_upload_candidates(
    interview_id: str = Form(...),
    file: UploadFile = File(...),
):
    async with AsyncSessionLocal() as db:
        interview = await get_interview_or_404(db, interview_id)
        
        if not interview.is_open:
            raise HTTPException(
                status_code=400,
                detail="Cannot upload candidates. Interview is not active. Please reopen the interview first."
            )

        content = await file.read()
        file_extension = os.path.splitext(file.filename or "")[1].lower()

        if file_extension not in [".csv", ".xlsx"]:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file format. Please upload a .csv or .xlsx file."
            )

        rows = _parse_upload_file(content, file_extension)
        preview_list: List[Dict[str, str]] = []
        previously_appeared: List[Dict[str, Any]] = []
        seen_emails: set[str] = set()  

        for row in rows:
            name = (row.get("name") or "").strip()
            email = (row.get("email") or "").strip()
            phone = (row.get("phone_number") or "").strip() or None

            if not name or not email:
                email_lower = email.lower() if email else ""
                if email_lower and email_lower not in seen_emails:
                    candidate_info = await _check_candidate_has_given_interview(db, email_lower)
                    # Only add to previously_appeared if candidate has actually given the interview
                    if candidate_info and candidate_info.get("is_given", False):
                        candidate_result = await db.execute(
                            select(Candidate, Interview)
                            .join(Interview, Candidate.interview_id == Interview.id)
                            .where(Candidate.email == email_lower)
                            .where(Candidate.mail_sent == True)
                            .order_by(desc(Candidate.mail_sent_at).nulls_last(), desc(Candidate.created_at))
                        )
                        candidate_interviews = candidate_result.all()
                        
                        if candidate_interviews:
                            selected_candidate, selected_interview, selected_is_given, selected_given_date = await _select_candidate_for_previously_appeared(db, candidate_interviews)
                            # Double check that is_given is True before adding
                            if selected_is_given:
                                previously_appeared.append({
                                    "name": selected_candidate.name,
                                    "email": email_lower,
                                    "phone_number": selected_candidate.phone_number or "",
                                    "is_given": selected_is_given,
                                    "given_date": selected_given_date,
                                    "interview_name": selected_interview.name
                                })
                                seen_emails.add(email_lower)
                continue

            email_lower = email.lower()
            
            if email_lower not in seen_emails:
                candidate_info = await _check_candidate_has_given_interview(db, email_lower)
                
                # Only add to previously_appeared if candidate has actually given the interview
                if candidate_info and candidate_info.get("is_given", False):
                    candidate_result = await db.execute(
                        select(Candidate, Interview)
                        .join(Interview, Candidate.interview_id == Interview.id)
                        .where(Candidate.email == email_lower)
                        .where(Candidate.mail_sent == True)
                        .order_by(desc(Candidate.mail_sent_at).nulls_last(), desc(Candidate.created_at))
                    )
                    candidate_interviews = candidate_result.all()
                    
                    if candidate_interviews:
                        selected_candidate, selected_interview, selected_is_given, selected_given_date = await _select_candidate_for_previously_appeared(db, candidate_interviews)
                        
                        # Double check that is_given is True before adding
                        if selected_is_given:
                            previously_appeared.append({
                                "name": selected_candidate.name,
                                "email": email_lower,
                                "phone_number": selected_candidate.phone_number or "",
                                "is_given": selected_is_given,
                                "given_date": selected_given_date,
                                "interview_name": selected_interview.name
                            })
                            seen_emails.add(email_lower)
                            continue
            
            if email_lower not in seen_emails:
                preview_list.append({
                    "name": name,
                    "email": email,
                    "phone_number": phone or ""
                })

        return {
            "ok": True,
            "preview_list": preview_list,
            "previously_appeared": previously_appeared
        }


@router.get("/list-candidates")
@safe_route
async def list_candidates(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="shortlisted, potential, rejected, no_status"),
    interview_id: Optional[str] = Query(None),
    date_type: Optional[str] = Query(None, description="sent_date or given_date"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    page: Optional[int] = Query(None, ge=1, description="Page number (omit for all results)"),
    page_size: Optional[int] = Query(None, ge=1, le=50, description="Page size (omit for all results)"),
    sort_by: Optional[str] = Query("created_at", description="Sort field: 'name', 'sent_date', 'given_date', 'overall_score', 'communication_score', 'created_at', 'status'"),
    sort_order: Optional[str] = Query("desc", description="Sort order: 'asc' or 'desc'")
):
    async with AsyncSessionLocal() as db:        
        d_from = _parse_date_filter_list_candidates(date_from, is_end=False) if date_type in ("sent_date", "given_date") else None
        d_to = _parse_date_filter_list_candidates(date_to, is_end=True) if date_type in ("sent_date", "given_date") else None
        candidate_query = (
            select(Candidate, Interview)
            .join(Interview, Candidate.interview_id == Interview.id)
        )
        
        if interview_id:
            candidate_query = candidate_query.where(Interview.id == interview_id)
        
        if date_type == "sent_date" and (d_from or d_to):
            sent_date_expr = case(
                (Candidate.mail_sent_at != None, func.date(Candidate.mail_sent_at)),
                else_=func.date(Candidate.created_at)
            )
            if d_from:
                candidate_query = candidate_query.where(sent_date_expr >= d_from)
            if d_to:
                candidate_query = candidate_query.where(sent_date_expr <= d_to)
        
        candidate_result = await db.execute(candidate_query)
        all_candidates_with_interviews = candidate_result.all()
        interview_ids = {candidate.interview_id for candidate, _ in all_candidates_with_interviews}
        
        all_responses = await _load_responses_for_candidates(db, interview_ids, date_type, d_from, d_to)        
        response_dict = _build_response_lookup_dict(all_responses)
        
        candidates_data = []
        matched_count = 0
        no_response_count = 0
        date_filtered_out = 0
        
        for candidate, interview in all_candidates_with_interviews:
            response = _find_matching_response(candidate, all_responses, response_dict)
            if response:
                matched_count += 1
            else:
                no_response_count += 1
                logger.debug(f"Candidate {candidate.email} (interview_id={candidate.interview_id}, response_id={candidate.response_id}) has no matching response")
            
            if not _apply_search_filter_list_candidates(candidate, search):
                continue
            
            if not _apply_status_filter_list_candidates(response, status):
                continue
            
            if date_type == "given_date":
                response, should_include = _apply_given_date_filter(candidate, response, all_responses, d_from, d_to)
                if not should_include:
                    date_filtered_out += 1
                    continue
            
            candidate_data = _build_candidate_data_dict(candidate, interview, response)
            candidates_data.append(candidate_data)
        
        total_count = len(candidates_data)
        _sort_candidates_list(candidates_data, sort_by, sort_order)

        if page is not None and page_size is not None:
            total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1
            page = min(max(page, 1), total_pages)
            offset = (page - 1) * page_size
            apply_pagination = True
        else:
            total_pages = 1 if total_count > 0 else 0
            page = 1
            page_size = total_count if total_count > 0 else 10  
            offset = 0
            apply_pagination = False
        
        if apply_pagination:
            paginated_candidates = candidates_data[offset:offset + page_size]
        else:
            paginated_candidates = candidates_data

        serialized = []

        for item in paginated_candidates:
            c = item["candidate"]
            interview = item["interview"]
            response = item["response"]
            sent_date_dt = item.get("sent_date_dt")
            given_date_dt = item.get("given_date_dt")
            overall_analysis = item["overall_analysis"]
            response_status = item["status"]
            
            summary = (
                overall_analysis.get("soft_skill_summary")
                or overall_analysis.get("overall_feedback")
            )
            
            sent_date_formatted = _format_date_for_display(sent_date_dt)
            given_date_formatted = _format_date_for_display(given_date_dt)

            serialized.append({
                **_serialize_candidate(c),
                "interview_link": _get_interview_link(interview, c.id),
                "sent_date": sent_date_formatted,
                "given_date": given_date_formatted,
                "overall_score": overall_analysis.get("overall_score"),
                "communication_score": overall_analysis.get("communication_score"),
                "summary": summary,
                "status": response_status
            })
        
        for item in serialized:
            status = item.get("status", "no_status")
            if status == "selected":
                item["status"] = "shortlisted"
            elif status in ["rejected", "not_selected"]:
                item["status"] = "rejected"
            elif status not in ["shortlisted", "potential", "rejected", "no_status"]:
                item["status"] = "no_status"


        response_data = {
            "ok": True,
            "candidates": serialized,
            "pagination": {
                "total_count": total_count,
            }
        }

        if apply_pagination:
            response_data["pagination"].update({
                "total_pages": total_pages,
                "current_page": page,
                "page_size": page_size,
                "has_next_page": page < total_pages,
                "has_previous_page": page > 1
            })
        else:
            response_data["pagination"]["is_paginated"] = False

        response_data["sort"] = {
            "sort_by": sort_by,
            "sort_order": sort_order
        }

        return response_data


async def _get_candidate_by_id_or_email(db, interview_id: str, candidate_id: Optional[str] = None, email: Optional[str] = None) -> Optional[Candidate]:
    if candidate_id:
        result = await db.execute(
            select(Candidate)
            .where(Candidate.id == candidate_id)
            .where(Candidate.interview_id == interview_id)
            .order_by(desc(Candidate.created_at))  # Get most recent if multiple
            .limit(1)
        )
    elif email:
        result = await db.execute(
            select(Candidate)
            .where(Candidate.interview_id == interview_id)
            .where(Candidate.email == email.lower().strip())
            .order_by(desc(Candidate.created_at))  # Get most recent if multiple
            .limit(1)
        )
    else:
        return None

    return result.scalar_one_or_none()

@router.post("/send-invite")
@safe_route
async def send_invite(
    interview_id: str = Body(...),
    candidate_id: Optional[str] = Body(None),
    email: Optional[str] = Body(None),
    resend: Optional[bool] = Body(False, description="Allow resending invite even if already sent"),
):
    async with AsyncSessionLocal() as db:
        interview = await get_interview_or_404(db, interview_id)

        if candidate_id or email:
            candidate = await _get_candidate_by_id_or_email(db, interview_id, candidate_id, email)
            if not candidate and email:
                logger.info(f"Candidate not found for email {email}, checking for existing Response to create candidate record")
                try:
                    interview_uuid = uuid_lib.UUID(interview_id) if isinstance(interview_id, str) else interview_id
                except ValueError as uuid_error:
                    logger.error(f"Invalid interview_id format: {interview_id}: {uuid_error}")
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid interview_id format: {interview_id}"
                    )
                
                response_query = select(Response).where(
                    Response.interview_id == interview_uuid,
                    Response.email == email.lower().strip()
                ).order_by(desc(Response.created_at)).limit(1)  # Get most recent response if multiple
                response_result = await db.execute(response_query)
                existing_response = response_result.scalar_one_or_none()
                
                if existing_response:
                    try:
                        candidate = await _ensure_candidate_from_response(db, existing_response, interview_id)
                        if candidate:
                            logger.info(f"Created/found candidate record {candidate.id} from Response {existing_response.id}")
                            await db.commit()
                            await db.refresh(candidate)
                        else:
                            raise HTTPException(
                                status_code=500,
                                detail="Failed to create candidate record from response"
                            )
                    except Exception as create_error:
                        await db.rollback()
                        if "duplicate" in str(create_error).lower() or "unique" in str(create_error).lower():
                            candidate = await _get_candidate_by_id_or_email(db, interview_id, None, email)
                            if candidate:
                                logger.info(f"Found existing candidate {candidate.id} after duplicate error")
                            else:
                                raise HTTPException(
                                    status_code=409,
                                    detail=f"Candidate with email {email} already exists for this interview"
                                )
                        else:
                            raise HTTPException(
                                status_code=500,
                                detail=f"Failed to create candidate record: {str(create_error)}"
                            )
                else:
                    raise HTTPException(
                        status_code=404,
                        detail="Candidate not found. Please add the candidate first."
                    )
            elif not candidate:
                raise HTTPException(
                    status_code=404,
                    detail="Candidate not found. Please add the candidate first."
                )

            is_resend = candidate.mail_sent
            if is_resend and not resend:
                return {
                    "ok": True,
                    "invite_sent": False,
                    "is_resend": False,
                    "message": "Invite already sent to this candidate. Use resend=true to resend.",
                    "interview_link": _get_interview_link(interview, candidate.id),
                    "candidate": _serialize_candidate(candidate)
                }

            try:
                invite_sent = await _send_invite_to_candidate(db, candidate, interview)
                if invite_sent and not candidate.mail_sent_at:
                    candidate.mail_sent_at = datetime.now(timezone.utc)
                await db.commit()
                await db.refresh(candidate)
            except Exception as invite_error:
                await db.rollback()
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to send invite: {str(invite_error)}"
                )

            return {
                "ok": True,
                "invite_sent": invite_sent,
                "is_resend": is_resend,
                "message": "Invite resent successfully" if is_resend else "Invite sent successfully",
                "interview_link": _get_interview_link(interview, candidate.id),
                "candidate": _serialize_candidate(candidate)
            }

        if resend:
            query = select(Candidate).where(
                Candidate.interview_id == interview_id
            )
        else:
            query = select(Candidate).where(
                Candidate.interview_id == interview_id,
                Candidate.mail_sent == False
            )
        
        result = await db.execute(query)
        candidates = result.scalars().all()

        if not candidates:
            message = "No candidates found to send invites to"
            if not resend:
                message += " (all have already received invites. Use resend=true to resend)"
            return {
                "ok": True,
                "message": message,
                "sent": 0,
                "failed": 0,
                "total": 0,
                "results": []
            }

        results = []
        sent_count = 0
        failed_count = 0
        resent_count = 0

        for candidate in candidates:
            is_resend = candidate.mail_sent
            invite_sent = await _send_invite_to_candidate(db, candidate, interview)
            
            if invite_sent:
                sent_count += 1
                if is_resend:
                    resent_count += 1
                results.append({
                    "candidate_id": str(candidate.id),
                    "email": candidate.email,
                    "name": candidate.name,
                    "status": "sent",
                    "is_resend": is_resend
                })
            else:
                failed_count += 1
                results.append({
                    "candidate_id": str(candidate.id),
                    "email": candidate.email,
                    "name": candidate.name,
                    "status": "failed",
                    "is_resend": is_resend
                })

        await db.commit()

        logger.info(f"Bulk invite sent: {sent_count} successful ({resent_count} resent), {failed_count} failed for interview {interview_id}")

        return {
            "ok": True,
            "sent": sent_count,
            "resent": resent_count,
            "failed": failed_count,
            "total": len(candidates),
            "results": results
        }

@router.get("/download-file")
def download_file():
    bucket_name = _config.get("sample_file",{}).get("bucket_name")
    folder = _config.get("sample_file", {}).get("folder_name")
    filename = _config.get("sample_file", {}).get("file_name")

    final_url = f"https://{bucket_name}.s3.amazonaws.com/{folder}/{filename}"
    return {
        "ok": True,
        "download_url": final_url
    }
