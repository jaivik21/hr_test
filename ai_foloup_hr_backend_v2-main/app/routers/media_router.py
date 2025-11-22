from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, Request
from services.storage_service import storage_service
from db import AsyncSessionLocal
from utils.interview_utils import get_response_or_404
from utils.logger import get_logger
import asyncio
from typing import Set

logger = get_logger(__name__)
router = APIRouter(prefix="/api/media", tags=["media"])

# Track ongoing video merge tasks to prevent duplicates
_ongoing_merges: Set[str] = set()
_merge_lock = asyncio.Lock()


@router.post("/upload-candidate-image")
async def upload_candidate_image(image: UploadFile = File(...), response_id: str = Form(...)):
    async with AsyncSessionLocal() as db:
        response = await get_response_or_404(db, response_id)
        content = await image.read()
        file_extension = image.filename.split('.')[-1].lower()

        storage_url = await storage_service.save_candidate_image(content, response_id, file_extension)

        response.candidate_image_url = storage_url
        await db.commit()
        await db.refresh(response)
        return {"ok": True, "storage_path": storage_url}


async def _merge_video_background(response_id: str, base_url: str = None):
    """
    Background task to merge video chunks. 
    Wrapped in comprehensive error handling to prevent server crashes.
    """
    try:
        logger.info(f"Starting video merge for response_id: {response_id}")
        await asyncio.sleep(3)  

        retries = 3
        for attempt in range(retries):
            try:
                logger.info(f"Attempt {attempt + 1}/{retries} for response_id: {response_id}")
                # save_candidate_video already runs in thread pool internally, but we keep await here
                # for proper async handling
                logger.info(f"Calling save_candidate_video for response_id: {response_id}")
                merged_path = await storage_service.save_candidate_video(response_id, base_url)
                logger.info(f"save_candidate_video returned for response_id: {response_id}, result: {merged_path is not None}")
                
                if merged_path:
                    logger.info(f"Got merged path for response_id: {response_id}, path: {merged_path}")
                    try:
                        async with AsyncSessionLocal() as db:
                            response = await get_response_or_404(db, response_id)
                            if hasattr(response, 'candidate_video_url') and response.candidate_video_url != merged_path:
                                response.candidate_video_url = merged_path
                                await db.commit()
                                await db.refresh(response)
                        logger.info(f"Successfully merged video for response_id: {response_id}, path: {merged_path}")
                        return
                    except Exception as db_error:
                        logger.error(f"Database update failed for response_id {response_id}: {db_error}", exc_info=True)
                        # Continue even if DB update fails - video was merged successfully
                        return
                else:
                    logger.warning(f"No merged path returned for response_id: {response_id}")
            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed for response_id {response_id}: {e}", exc_info=True)
                if attempt < retries - 1:
                    await asyncio.sleep(2)
        
        logger.error(f"Failed to merge video after {retries} attempts for response_id: {response_id}")
    except asyncio.CancelledError:
        logger.warning(f"Video merge task cancelled for response_id: {response_id}")
        raise
    except Exception as e:
        # Catch-all to prevent any unhandled exception from crashing the server
        logger.critical(f"CRITICAL: Unhandled exception in video merge background task for response_id {response_id}: {e}", exc_info=True)
        # Don't re-raise - we want to prevent server crash
    finally:
        # Remove from ongoing merges set when done
        async with _merge_lock:
            _ongoing_merges.discard(response_id)

def _video_already_exists(response_id: str) -> bool:
    video_path = storage_service.video_dir / f"{response_id}.mp4"
    return video_path.exists() and video_path.stat().st_size > 0

@router.post("/upload-candidate-video")
async def upload_candidate_video(request: Request, response_id: str = Form(...), background_tasks: BackgroundTasks = BackgroundTasks()):
    """
    Endpoint called when candidate uploads video chunks.
    NOTE: This should NOT trigger merge immediately - merge should happen after interview ends.
    This endpoint is just for acknowledgment. The actual merge is triggered by end-interview.
    """
    async with AsyncSessionLocal() as db:
        response = await get_response_or_404(db, response_id)
        if response.candidate_video_url and _video_already_exists(response_id):
            return {"ok": True, "message": "Video already exists, skipping merge"}
    
    # Don't start merge here - wait for end-interview to trigger merge
    # This prevents premature merging before all chunks arrive
    logger.debug(f"Video chunks received for response_id: {response_id}, merge will happen after interview ends")
    return {"ok": True, "message": "Video chunks received, merge will happen after interview ends"}
