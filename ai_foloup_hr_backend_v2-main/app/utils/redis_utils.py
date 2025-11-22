# get_redis(), TTL management, key generation

import redis.asyncio as aioredis
import os
from dotenv import load_dotenv
from utils.logger import get_logger
import asyncio

load_dotenv()
logger = get_logger(__name__)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
_redis = None
_redis_lock = None

def _ensure_lock():
    """Ensure the async lock exists for Redis initialization."""
    global _redis_lock
    if _redis_lock is None:
        _redis_lock = asyncio.Lock()
    return _redis_lock

async def get_redis():
    """Get or create Redis connection pool with proper initialization."""
    global _redis
    if _redis is None:
        lock = _ensure_lock()
        async with lock:
            # Double-check pattern to avoid race conditions
            if _redis is None:
                _redis = aioredis.from_url(
                    REDIS_URL,
                    decode_responses=False,
                    max_connections=100,  # Allow up to 100 concurrent connections
                    retry_on_timeout=True,
                    socket_keepalive=True,  # Enable keepalive with system defaults (compatible with uvloop)
                    health_check_interval=30,  
                )
                # Verify connection by pinging Redis
                try:
                    await _redis.ping()
                    logger.info(f"Redis connection pool initialized and verified with max_connections=100")
                except Exception as e:
                    logger.error(f"Failed to verify Redis connection: {e}")
                    await _redis.aclose()
                    _redis = None
                    raise
    return _redis

def _key(session_id: str) -> str:
    return f"session:{session_id}:chunks"

async def create_session(session_id: str):
    redis = await get_redis()
    key = _key(session_id)
    try:
        await redis.delete(key)
        await redis.expire(key, 3600)
        logger.debug(f"Redis session created: {session_id}")
    except Exception as e:
        logger.error(f"Redis error creating session for session_id={session_id}: {type(e).__name__}: {e}")
        raise  

async def add_audio_chunk(session_id: str, chunk_bytes: bytes):
    redis = await get_redis()
    key = _key(session_id)
    try:
        await redis.rpush(key, chunk_bytes)
        await redis.expire(key, 3600)
    except Exception as e:
        logger.error(f"Redis error adding audio chunk for session_id={session_id}: {type(e).__name__}: {e}")
        raise

async def get_audio_chunks(session_id: str):
    redis = await get_redis()
    return await redis.lrange(_key(session_id), 0, -1) or []

async def remove_session(session_id: str):
    redis = await get_redis()
    await redis.delete(_key(session_id))

async def close_redis():
    global _redis
    if _redis:
        try:
            await _redis.aclose()
        except Exception as e:
            logger.error(f"Error closing Redis connection: {e}")
        finally:
            _redis = None

def _meta_key(session_id: str) -> str:
    return f"session:{session_id}:meta"

async def set_session_meta(session_id: str, data: dict):
    redis = await get_redis()
    key = _meta_key(session_id)
    pipe = redis.pipeline()
    for k, v in (data or {}).items():
        bval = v if isinstance(v, (bytes, bytearray)) else str(v).encode("utf-8")
        pipe.hset(key, k, bval)
    pipe.expire(key, 7200)
    await pipe.execute()

async def get_session_meta(session_id: str) -> dict:
    redis = await get_redis()
    key = _meta_key(session_id)
    raw = await redis.hgetall(key)
    if not raw:
        return {}
    return { (k.decode("utf-8") if isinstance(k, (bytes, bytearray)) else str(k)):
             (v.decode("utf-8") if isinstance(v, (bytes, bytearray)) else str(v))
             for k, v in raw.items() }

async def delete_session_all(session_id: str):
    redis = await get_redis()
    await redis.delete(_meta_key(session_id))
    await remove_session(session_id)