from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
import os
from functools import wraps
from utils.logger import get_logger
from utils.user_auth import verify_access_token

logger = get_logger(__name__)

PUBLIC_PATHS = {
    "/", 
    "/docs", 
    "/redoc", 
    "/openapi.json", 
    "/api/health",
    "/api/auth/login",
    "/api/auth/signup",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/refresh",  # Refresh endpoint is public (uses refresh token in header)
    "/api/auth/verify-otp",
    "/api/interview/start-interview",
    "/api/interview/end-interview",
    "/api/interview/submit-answer",
    "/api/interview/check-interview",
    "/api/interview/tab-switch-count",
    "/api/interview/get-current-question",
    "/api/feedback/candidate-feedback",
    "/api/media/upload-candidate-image",
    "/api/media/upload-candidate-video",
    "/api/media/upload-chunk",
    "/api/interview/health"
}

# Paths that should be public (for media file access)
PUBLIC_PATH_PREFIXES = [
    "/api/media/files"
]

class AuthMiddleware(BaseHTTPMiddleware):
    """
    JWT-based authentication middleware.
    Validates Bearer tokens in Authorization header.
    """
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        while "//" in path:
            path = path.replace("//", "/")
        
        path = path.rstrip("/") if path != "/" else path

        if request.method == "OPTIONS":
            return await call_next(request)

        if path in PUBLIC_PATHS:
            logger.info(f"Public path allowed (exact match): {path}")
            return await call_next(request)
        
        if (path + "/") in PUBLIC_PATHS:
            logger.info(f"Public path allowed (with trailing slash): {path}")
            return await call_next(request)

        for prefix in PUBLIC_PATH_PREFIXES:
            if path.startswith(prefix):
                logger.debug(f"Public path prefix matched: {path} (prefix: {prefix})")
                return await call_next(request)
        
        logger.debug(f"Path not in public paths, requiring auth: {path} (method: {request.method})")

        # Try JWT Bearer token authentication first
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "").strip()
            payload = verify_access_token(token)
            
            if payload:
                request.state.user_id = payload.get("sub")
                request.state.user_email = payload.get("email")
                return await call_next(request)
            else:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Invalid or expired access token"},
                    headers={"WWW-Authenticate": "Bearer"}
                )
        
        return JSONResponse(
            status_code=401,
            content={"detail": "Authentication required. Please provide a valid Bearer token."},
            headers={"WWW-Authenticate": "Bearer"}
        )


def safe_route(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except HTTPException:
            raise  
        except Exception as e:
            logger.error(f"{func.__name__} failed: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=str(e))
    return wrapper