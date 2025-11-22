# Audio processing (chunk merge, conversion)
from typing import List, Optional
from io import BytesIO
from pydub import AudioSegment  # pip install pydub
import wave
import tempfile
import subprocess
import asyncio

def merge_chunks(chunks: List[bytes]) -> bytes:
    if not chunks:
        return b""
    return b"".join(chunks)


def extract_opus_from_webm_chunk(webm_bytes: bytes) -> Optional[bytes]:
    """
    Extract raw Opus audio from a WebM container chunk using ffmpeg.
    This is needed because Deepgram WebSocket API expects raw Opus, not WebM containers.
    Returns raw Opus bytes, or None if extraction fails.
    """
    if not webm_bytes or len(webm_bytes) < 4:
        return None
    
    # Check if it's WebM (EBML header: 1a 45 df a3)
    if webm_bytes[:4] != b'\x1a\x45\xdf\xa3':
        # Not WebM, return as-is (might already be raw audio)
        return webm_bytes
    
    try:
        # Use ffmpeg to extract Opus audio from WebM
        # Try Ogg/Opus format first (Deepgram might accept it with encoding=opus)
        # If that fails, we'll send WebM with encoding=webm
        ffmpeg_cmd = [
            "ffmpeg",
            "-i", "pipe:0",  # Read from stdin
            "-vn",  # No video
            "-acodec", "copy",  # Copy Opus codec (don't re-encode)
            "-f", "ogg",  # Output Ogg/Opus container (more compatible than raw data)
            "pipe:1",  # Write to stdout
            "-loglevel", "error"  # Suppress verbose output
        ]
        
        process = subprocess.run(
            ffmpeg_cmd,
            input=webm_bytes,
            capture_output=True,
            timeout=3,  # 3 second timeout for small chunks
            check=False
        )
        
        if process.returncode == 0 and len(process.stdout) > 0:
            return process.stdout
        else:
            # Extraction failed - return None to send WebM as-is
            return None
    except subprocess.TimeoutExpired:
        return None
    except Exception:
        return None


def converted_audio_compatible(audio_bytes: bytes) -> bytes:
    """
    Convert audio bytes to compatible WAV format.
    Returns converted audio bytes, or raises RuntimeError if conversion fails.
    """
    if not audio_bytes:
        raise ValueError("Empty audio bytes provided")
    
    buf = BytesIO(audio_bytes)
    try:
        audio = AudioSegment.from_file(buf) 
    except Exception as e:
        raise RuntimeError(f"Failed to parse audio bytes: {e}")

    try:
        audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)  # 16-bit

        out_buf = BytesIO()
        audio.export(out_buf, format="wav")
        return out_buf.getvalue()
    except Exception as e:
        raise RuntimeError(f"Failed to convert audio format: {e}")
