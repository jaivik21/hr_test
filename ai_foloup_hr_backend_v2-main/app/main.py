# Entry point (Socket.IO + FastAPI app)

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
import socketio
from sockets.interview_socket import sio
from utils.redis_utils import close_redis, get_redis
from socketio import ASGIApp 
import sockets.interview_socket
from routers.interview_router import router as interview_router
from routers.question_router import router as question_router
from routers.response_router import router as response_router
from routers.session_router import router as session_router
from routers.interviewer_router import router as interviewer_router
from routers.user_router import router as user_router
from routers.feedback_router import router as feedback_router
from routers.media_router import router as media_router
from middleware.auth_middleware import AuthMiddleware
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from pathlib import Path
import uvicorn
from config_loader import load_config
from routers.candidate_router import router as candidate_router
from utils.logger import get_logger

load_dotenv()
logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Redis connection on startup
    try:
        await get_redis()
        logger.info("Redis connection initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Redis connection: {e}")
        # Continue startup even if Redis fails - it will be retried on first use
    yield
    await close_redis()

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],  # Expose all headers
)

app.add_middleware(AuthMiddleware)

sio_app = socketio.ASGIApp(sio)
app.mount("/socket.io", sio_app)

app.include_router(interview_router)
app.include_router(question_router)
app.include_router(response_router)
app.include_router(session_router)
app.include_router(interviewer_router)
app.include_router(user_router)
app.include_router(feedback_router)
app.include_router(media_router)
app.include_router(candidate_router)

# Serve media files (images and videos)
def _find_backend_directory() -> Path:
    current_file = Path(__file__).resolve()
    current_dir = current_file.parent
    
    for parent in [current_dir] + list(current_dir.parents):
        config_file = parent / 'config.yaml'
        if config_file.exists():
            return parent
    
    if 'app' in current_dir.parts:
        app_index = current_dir.parts.index('app')
        backend_parts = current_dir.parts[:app_index]
        return Path(*backend_parts) if backend_parts else current_dir.parent
    
    return current_dir.parent

config = load_config()
storage_type = config.get('storage', {}).get('storage_type', 'local')
if storage_type == 'local':
    storage_path = config.get('storage', {}).get('storage_path')
    
    if storage_path:
        storage_path = Path(storage_path)
        if storage_path.is_absolute():
            storage_path = storage_path.resolve()
        else:
            backend_dir = _find_backend_directory()
            storage_path = (backend_dir / storage_path).resolve()
    else:
        backend_dir = _find_backend_directory()
        storage_path = (backend_dir / 'storage').resolve()
    
    storage_path.mkdir(parents=True, exist_ok=True)
    (storage_path / 'images').mkdir(parents=True, exist_ok=True)
    (storage_path / 'videos').mkdir(parents=True, exist_ok=True)
    (storage_path / 'temp').mkdir(parents=True, exist_ok=True)
    
    storage_path_str = str(storage_path)
    logger.info(f"Mounting static files from: {storage_path.resolve()}")
    logger.info(f"Videos will be served from: {storage_path.resolve() / 'videos'}")
    app.mount("/api/media/files", StaticFiles(directory=storage_path_str), name="media_files")

@app.get("/")
async def root():
    return {"message": "AI Interview Tool API", "websocket": "/socket.io"}

@app.get("/api/interview/health")
async def health_check():
    """Health check endpoint"""
    return {"ok": True, "message": "Interview API is healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)