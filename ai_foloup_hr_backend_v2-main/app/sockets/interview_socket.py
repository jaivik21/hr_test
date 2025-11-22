import socketio
from utils.redis_utils import create_session, add_audio_chunk, get_audio_chunks, remove_session
from services.stt_service import stt_service 
from sqlalchemy import select
from db import AsyncSessionLocal
from models import Response
import asyncio
import base64
import re
import time
from services.storage_service import storage_service
from utils.logger import get_logger
from utils.audio_utils import extract_opus_from_webm_chunk

logger = get_logger(__name__)
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
_sessions = {}  

async def _cleanup_session(sid):
    sess = _sessions.pop(sid, None)
    if not sess:
        logger.debug(f"Cleanup requested for sid={sid} but no session found")
        return

    session_id = sess.get("session_id", "unknown")
    response_id = sess.get("response_id", "unknown")
    logger.info(f"Cleaning up session for sid={sid}, session_id={session_id}, response_id={response_id}")

    if "audio_queue" in sess and sess["audio_queue"]:
        try:
            await sess["audio_queue"].put(None)
        except Exception as e:
            logger.warning(f"Error sending shutdown signal to audio queue for sid={sid}: {e}")

    if "transcript_queue" in sess and sess.get("transcript_queue"):
        try:
            await sess["transcript_queue"].put(None)
        except Exception as e:
            logger.warning(f"Error sending shutdown to transcript queue for sid={sid}, response_id={response_id}: {e}")
    
    for task_name in ["stt_task", "emitter_task"]:
        if task_name in sess and sess[task_name]:
            try:
                task = sess[task_name]
                if not task.done():
                    task.cancel()
                    try:
                        await asyncio.wait_for(task, timeout=2.0)
                    except asyncio.TimeoutError:
                        logger.warning(f"Task {task_name} did not cancel within timeout for sid={sid}, response_id={response_id}")
                    except asyncio.CancelledError:
                        pass
                else:
                    # Task is already done, check for exceptions to prevent "Task exception was never retrieved"
                    try:
                        await task
                    except Exception as task_error:
                        logger.warning(f"Task {task_name} had exception for sid={sid}, response_id={response_id}: {type(task_error).__name__}: {task_error}")
            except asyncio.CancelledError:
                pass  
            except Exception as e:
                logger.warning(f"Error handling {task_name} for sid={sid}, response_id={response_id}: {type(e).__name__}: {e}")

    if "session_id" in sess:
        try:
            await remove_session(sess["session_id"])
            await sio.leave_room(sid, sess["session_id"])
        except Exception as e:
            logger.warning(f"Error removing session for sid={sid}: {e}")
    
    if hasattr(send_audio_chunk, '_chunk_counts') and sid in send_audio_chunk._chunk_counts:
        del send_audio_chunk._chunk_counts[sid]


@sio.event
async def connect(sid, environ):
    await sio.emit("connected", {"sid": sid}, to=sid)


@sio.event
async def disconnect(sid):
    await _cleanup_session(sid)


@sio.event
async def start_interview(sid, data):
    interview_id = data.get("interview_id")
    response_id = data.get("response_id")
    
    if not interview_id:
        return {"ok": False, "error": "interview_id is required"}
    

    async with AsyncSessionLocal() as session:
        from models import Interview
        result = await session.execute(select(Interview).where(Interview.id == interview_id))
        interview = result.scalar_one_or_none()
        
        if not interview:
            return {"ok": False, "error": f"Interview with id {interview_id} not found"}

        if not interview.is_open:
            return {"ok": False, "error": "Interview is not active"}
    

    session_id = f"{interview_id}_{response_id}"
    await create_session(session_id)
    
    async def transcript_emitter(sid, t_queue, response_id_for_logging):
        last_partial = ""
        while True:
            try:
                update = await t_queue.get()
                if update is None:
                    break
                text = update["text"] if isinstance(update, dict) else str(update)
                is_final = update.get("is_final") if isinstance(update, dict) else True
                try:
                    await sio.emit("partial_transcript", {"text": text, "is_final": is_final}, to=sid)
                except Exception as emit_error:
                    logger.warning(f"Failed to emit transcript to sid={sid}, response_id={response_id_for_logging}: {type(emit_error).__name__}: {emit_error}")
                if is_final:  
                    last_partial = ""
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in transcript emitter for sid={sid}, response_id={response_id_for_logging}: {type(e).__name__}: {e}")
        
    old_session = _sessions.get(sid)
    if old_session:
        old_response_id = old_session.get("response_id", "unknown")
        if old_response_id != response_id:
            logger.info(f"Different response_id detected (old: {old_response_id}, new: {response_id}), cleaning up old session")
        await _cleanup_session(sid)
    
    audio_queue = asyncio.Queue(maxsize=100)
    transcript_queue = asyncio.Queue(maxsize=50)
    
    emitter_task = asyncio.create_task(transcript_emitter(sid, transcript_queue, response_id))
    stt_task = asyncio.create_task(stt_service.stream_transcribe_session(audio_queue, transcript_queue, session_id=session_id))
    
    _sessions[sid] = {
        "session_id": session_id, 
        "response_id": response_id,
        "audio_queue": audio_queue,
        "transcript_queue": transcript_queue,  
        "stt_task": stt_task,
        "emitter_task": emitter_task,
        "created_at": time.time(),
        "reconnecting": False,  
    }
    
    active_sessions = {k: v.get("response_id", "unknown") for k, v in _sessions.items() if v.get("stt_task") and not v.get("stt_task").done()}
    logger.info(f"Started STT session: sid={sid}, response_id={response_id}, active_sessions={len(active_sessions)}")
    await sio.enter_room(sid, session_id)

    
    return {"ok": True, "session_id": session_id, "response_id":response_id}


@sio.event
async def send_audio_chunk(sid, data):
    sess = _sessions.get(sid)
    if not sess:
        logger.warning(f"Received audio chunk from sid={sid} but no active session found. Active sessions: {list(_sessions.keys())}")
        return {"ok": False, "error": "No active session"}

    chunk_bytes = data if isinstance(data, (bytes, bytearray)) else data.get("chunk_data", data)
    
    if not chunk_bytes:
        logger.warning(f"Received empty audio chunk from sid={sid}, response_id={sess.get('response_id', 'unknown')}")
        return {"ok": False, "error": "Empty audio chunk"}
    
    session_id = sess.get("session_id", "unknown")
    response_id = sess.get("response_id", "unknown")
    audio_queue = sess.get("audio_queue")
    
    if not audio_queue:
        logger.error(f"No audio_queue found for sid={sid}, response_id={response_id}")
        return {"ok": False, "error": "Audio queue not available"}
    
    queue_size = audio_queue.qsize()
    if queue_size > 50:
        logger.warning(f"Audio queue backing up: sid={sid}, response_id={response_id}, queue_size={queue_size}")
    
    if not hasattr(send_audio_chunk, '_chunk_counts'):
        send_audio_chunk._chunk_counts = {}
    if sid not in send_audio_chunk._chunk_counts:
        send_audio_chunk._chunk_counts[sid] = 0
        logger.info(f"First audio chunk: response_id={response_id}, size={len(chunk_bytes)} bytes")
    send_audio_chunk._chunk_counts[sid] += 1
    
    if send_audio_chunk._chunk_counts[sid] % 100 == 0:
        logger.debug(f"Received {send_audio_chunk._chunk_counts[sid]} audio chunks for sid={sid}, response_id={response_id}")
        
    stt_task = sess.get("stt_task")
    if stt_task and stt_task.done():
        if sess.get("reconnecting", False):
            logger.debug(f"Reconnection already in progress for sid={sid}, response_id={response_id}, dropping chunk")
            return {"ok": False, "error": "Reconnection in progress"}
        
        logger.warning(f"STT task for sid={sid}, response_id={response_id} is done but audio chunks still arriving. Attempting to reconnect...")
        sess["reconnecting"] = True
        
        try:
            parts = session_id.split("_", 1)
            if len(parts) != 2:
                logger.error(f"Cannot extract interview_id from session_id={session_id}")
                sess.pop("reconnecting", None)
                return {"ok": False, "error": "Invalid session_id format"}
            
            interview_id = parts[0]
            await _cleanup_session(sid)
            
            result = await start_interview(sid, {
                "interview_id": interview_id,
                "response_id": response_id
            })
            
            if result.get("ok"):
                logger.info(f"Successfully reconnected STT session for sid={sid}, response_id={response_id}")
                new_sess = _sessions.get(sid)
                if new_sess and new_sess.get("audio_queue"):
                    new_sess.pop("reconnecting", None)
                    await new_sess["audio_queue"].put(chunk_bytes)
                    await add_audio_chunk(session_id, chunk_bytes)
                    return {"ok": True, "reconnected": True}
            else:
                logger.error(f"Failed to reconnect STT session for sid={sid}: {result.get('error')}")
            
            new_sess = _sessions.get(sid)
            if new_sess:
                new_sess.pop("reconnecting", None)
            elif sess:
                sess.pop("reconnecting", None)
                
        except Exception as reconnect_error:
            logger.error(f"Error during STT reconnection for sid={sid}, response_id={response_id}: {type(reconnect_error).__name__}: {reconnect_error}")
            new_sess = _sessions.get(sid)
            if new_sess:
                new_sess.pop("reconnecting", None)
            elif sess:
                sess.pop("reconnecting", None)
        
        return {"ok": False, "error": "STT session has ended and reconnection failed"}
    
    try:
        # Extract Opus from WebM containers before sending to Deepgram
        # Try to extract to Ogg/Opus format (Deepgram accepts this with encoding=opus)
        # If extraction fails, send WebM (Deepgram accepts this with encoding=webm)
        audio_data = chunk_bytes
        extraction_successful = False
        
        if len(chunk_bytes) >= 4 and chunk_bytes[:4] == b'\x1a\x45\xdf\xa3':  # WebM EBML header
            # Extract Opus audio from WebM container (run in thread to avoid blocking)
            try:
                extracted = await asyncio.to_thread(extract_opus_from_webm_chunk, chunk_bytes)
                if extracted and len(extracted) > 0:
                    audio_data = extracted
                    extraction_successful = True
                    if send_audio_chunk._chunk_counts[sid] == 1:
                        logger.info(f"Extracted Ogg/Opus from WebM chunk for response_id={response_id}, original={len(chunk_bytes)} bytes, extracted={len(audio_data)} bytes")
                else:
                    # Extraction failed - will send WebM with encoding=webm
                    if send_audio_chunk._chunk_counts[sid] == 1:
                        logger.warning(f"Failed to extract Opus from WebM chunk for response_id={response_id}, will send WebM with encoding=webm")
            except Exception as extract_error:
                logger.warning(f"Error extracting Opus from WebM chunk for response_id={response_id}: {extract_error}, will send WebM with encoding=webm")
        
        # Store extraction status in session for Deepgram URL configuration
        if "audio_queue" in sess:
            sess["opus_extraction_works"] = extraction_successful
        
        await audio_queue.put(audio_data)
        asyncio.create_task(add_audio_chunk(session_id, chunk_bytes))  # Store original for later use
        return {"ok": True}
    except Exception as e:
        logger.error(f"Error processing audio chunk for sid={sid}, response_id={response_id}, session_id={session_id}: {type(e).__name__}: {e}")
        return {"ok": False, "error": f"Failed to process chunk: {str(e)}"}



@sio.event
async def end_interview(sid, data=None):
    sess = _sessions.get(sid)
    if not sess:
        return {"ok": False, "error": "No active session"}
    session_id = sess["session_id"]
    response_id = sess["response_id"]

    if "audio_queue" in sess:
        try:
            await sess["audio_queue"].put(None)
        except Exception:
            pass

    for task_name in ["stt_task", "emitter_task"]:
        task = sess.get(task_name)
        if task:
            try:
                if not task.done():
                    task.cancel()
                    try:
                        await asyncio.wait_for(task, timeout=2.0)
                    except asyncio.TimeoutError:
                        logger.warning(f"Task {task_name} did not cancel within timeout for sid={sid}")
                    except asyncio.CancelledError:
                        pass
                else:
                    # Task is already done, check for exceptions
                    try:
                        await task
                    except Exception as task_error:
                        logger.warning(f"Task {task_name} had exception for sid={sid}: {task_error}")
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.warning(f"Error cancelling task {task_name} for sid={sid}: {e}")
    try:
        final_text = await stt_service.transcribe_session(session_id)
        
        # Only emit and save if we got a valid transcript
        if final_text:
            try:
                await sio.emit("transcript_result", {"text": final_text}, to=sid)
            except Exception as emit_error:
                logger.warning(f"Failed to emit transcript_result to sid={sid}, response_id={response_id}: {emit_error}")

            try:
                async with AsyncSessionLocal() as session:
                    result = await session.execute(select(Response).where(Response.id == response_id))
                    resp = result.scalar_one_or_none()
                    if resp:
                        if hasattr(resp, 'transcripts') and isinstance(resp.transcripts, list):
                            resp.transcripts.append(final_text)
                        else:
                            pass
                        resp.is_ended = True
                        await session.commit()
            except Exception as db_error:
                logger.error(f"Failed to save transcript to database for response_id {response_id}: {db_error}", exc_info=True)

        return {"ok": True, "final": True, "transcript": final_text}
    except Exception as e:
        logger.error(f"Error in end_interview for sid={sid}, response_id={response_id}: {e}", exc_info=True)
        return {"ok": False, "error": "Failed to process final transcript", "transcript": ""}
    finally:
        try:
            await remove_session(session_id)
        except Exception:
            pass
        try:
            await sio.leave_room(sid, session_id)
        except Exception:
            pass
        _sessions.pop(sid, None)

@sio.event
async def save_video_chunk(sid, data):
    response_id = data.get("response_id")
    chunk = data.get("chunk")
    file_extension = data.get("file_extension", "webm")
    chunk_index = data.get("chunk_index", 0)

    if chunk_index == 0:
        logger.info(f"CRITICAL: Received chunk 0 (EBML header) for response_id: {response_id}")
    else:
        logger.debug(f"Received chunk {chunk_index} for response_id: {response_id}")

    if not chunk or not response_id:
        error_msg = f"Missing response_id or chunk (chunk_index: {chunk_index})"
        await sio.emit("error", {"error": error_msg}, to=sid)
        return

    try:
        if isinstance(chunk, str) and chunk.startswith("data:"):
            chunk = chunk.split(",", 1)[1]
        
        if not isinstance(chunk, str):
            raise ValueError(f"Chunk data must be a string, got {type(chunk)}")
        
        chunk = chunk.strip().replace('\n', '').replace('\r', '').replace(' ', '')
        try:
            if chunk_index == 0:
                logger.debug(f"Chunk 0 base64 string length: {len(chunk)}, first 20 chars: {chunk[:20]}...")
            
            chunk_bytes = base64.b64decode(chunk, validate=True)
        except Exception as e:
            raise ValueError(f"Invalid base64 encoding: {str(e)}")

        if len(chunk_bytes) < 50:
            raise ValueError(f"Invalid chunk size: {len(chunk_bytes)} bytes (minimum: 50 bytes)")
        
        if chunk_index == 0:
            header_info = chunk_bytes[0:4].hex() if len(chunk_bytes) >= 4 else 'N/A'
            if len(chunk_bytes) >= 4:
                expected_header = b'\x1a\x45\xdf\xa3'
                actual_header = chunk_bytes[0:4]
                if actual_header == expected_header:
                    logger.debug(f"Chunk 0 has valid EBML header")
                else:
                    logger.warning(f"Chunk 0 EBML header mismatch: expected {expected_header.hex()}, got {actual_header.hex()}")
        else:
            logger.debug(f"Decoded chunk {chunk_index}: {len(chunk_bytes)} bytes, first 4 bytes: {chunk_bytes[0:4].hex() if len(chunk_bytes) >= 4 else 'N/A'}")

        saved_path = await storage_service.save_chunk(
            chunk_bytes, response_id, file_extension, chunk_index
        )
        if chunk_index == 0:
            logger.info(f"CRITICAL chunk 0 saved -> {saved_path}")
        else:
            logger.debug(f"Chunk #{chunk_index:05d} saved -> {saved_path}")
        await sio.emit("video_chunk_saved", {"ok": True, "index": chunk_index}, to=sid)

    except Exception as e:
        await sio.emit("error", {"error": str(e)}, to=sid)
