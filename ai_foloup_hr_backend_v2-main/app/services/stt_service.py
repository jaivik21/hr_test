# Deepgram / Whisper / Azure integration
import os
import aiohttp
import json
import asyncio
import uuid
import time
from typing import AsyncIterator, Optional, List
from utils.redis_utils import get_audio_chunks
from utils import audio_utils
from config_loader import load_config
from utils.logger import get_logger

logger = get_logger(__name__)


class STTProvider:
    async def transcribe(self, audio_bytes: bytes, language: Optional[str] = None) -> str:
        raise NotImplementedError

    async def stream_transcribe(self, audio_queue: asyncio.Queue, transcript_queue: asyncio.Queue):
        raise NotImplementedError


class AzureWhisperProvider(STTProvider):
    def __init__(self):
        self.api_key = os.getenv("AZURE_OPENAI_API_KEY")
        self.api_base = os.getenv("AZURE_OPENAI_ENDPOINT")
        self.deployment = os.getenv("AZURE_OPENAI_WHISPER_DEPLOYMENT")
        self.api_version = os.getenv("AZURE_OPENAI_WHISPER_API_VERSION")

        if not all([self.api_key, self.api_base, self.deployment, self.api_version]):
            raise ValueError("Missing Azure Whisper configuration. Check your environment variables.")

    async def transcribe(self, audio_bytes: bytes, language: Optional[str] = None) -> str:
        url = f"{self.api_base}/openai/deployments/{self.deployment}/audio/transcriptions?api-version={self.api_version}"
        headers = {"api-key": self.api_key}

        form = aiohttp.FormData()
        if language:
            form.add_field("language", language)
        form.add_field("file", audio_bytes, filename="audio.wav", content_type="application/octet-stream")

        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=180)) as session:
            async with session.post(url, headers=headers, data=form) as response:
                data = await response.json()
                if response.status != 200:
                    raise RuntimeError(f"Azure Whisper Error: {response.status} - {data}")
                return data.get("text", "")


class DeepgramProvider(STTProvider):
    def __init__(self):
        self.api_key = os.getenv("DEEPGRAM_API_KEY")
        self.api_url = "https://api.deepgram.com/v1/listen"

        if not self.api_key:
            raise ValueError("Missing Deepgram API key. Please set DEEPGRAM_API_KEY.")

    async def transcribe(self, audio_bytes: bytes, language: Optional[str] = None) -> str:
        headers = {
            "Authorization": f"Token {self.api_key}",
            "Content-Type": "audio/wav"
        }

        params = {}
        if language:
            params["language"] = language

        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=180)) as session:
            async with session.post(self.api_url, headers=headers, params=params, data=audio_bytes) as response:
                data = await response.json()
                if response.status != 200:
                    raise RuntimeError(f"Deepgram Error: {response.status} - {data}")

                results = data.get("results", {}).get("channels", [{}])[0].get("alternatives", [{}])
                return results[0].get("transcript", "")
    
    async def stream_transcribe(self, audio_queue: asyncio.Queue, transcript_queue: asyncio.Queue, session_id: Optional[str] = None):
        connection_id = str(uuid.uuid4())[:8]
        session_label = f"[{session_id}]" if session_id else ""
        log_prefix = f"DEEPGRAM{session_label}[{connection_id}]"
        
        # Deepgram WebSocket API - we'll detect format from first chunk
        # If extraction succeeds, we send Ogg/Opus (encoding=opus)
        # If extraction fails, we send WebM (encoding=webm)
        # Start with encoding=opus, will be updated if needed
        url = (
            "wss://api.deepgram.com/v1/listen"
            "?model=nova-2&punctuate=true&interim_results=true&endpointing=50&smart_format=true"
            "&encoding=opus&sample_rate=48000"
        )
        headers = {
            "Authorization": f"Token {self.api_key}",
            "X-Session-ID": session_id if session_id else "",
        }

        connection_start_time = time.time()
        logger.info(f"{log_prefix} Connecting to Deepgram for session_id={session_id}")

        try:
            timeout = aiohttp.ClientTimeout(total=None, connect=30, sock_read=60, sock_connect=30)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                try:
                    async with session.ws_connect(
                        url, 
                        headers=headers,
                        heartbeat=30,  
                        receive_timeout=60,  
                        autoclose=False,  
                        autoping=True,  
                    ) as ws:
                        connection_established_time = time.time()
                        connection_latency = (connection_established_time - connection_start_time) * 1000
                        logger.info(f"{log_prefix} Deepgram connected (latency: {connection_latency:.0f}ms) for response_id={session_id.split('_')[-1] if '_' in session_id else session_id}")
                        
                        chunks_sent = 0
                        transcripts_received = 0
                        final_transcripts = 0
                        last_activity_time = time.time()
                        connection_closed = False

                        async def sender(ws, audio_queue):
                            nonlocal chunks_sent, last_activity_time, connection_closed
                            first_chunk_received = False
                            
                            while True:
                                try:
                                    if not first_chunk_received:
                                        chunk = await audio_queue.get()
                                        first_chunk_received = True
                                    else:
                                        try:
                                            chunk = await asyncio.wait_for(audio_queue.get(), timeout=5.0)
                                        except asyncio.TimeoutError:
                                            if connection_closed:
                                                logger.info(f"{log_prefix} Connection closed, exiting sender")
                                                break
                                            await asyncio.sleep(0)
                                            continue
                                    
                                    if chunk is None:
                                        logger.info(f"{log_prefix} Received shutdown signal (None chunk), sending CloseStream")
                                        try:
                                            await ws.send_json({'type': 'CloseStream'})
                                            logger.info(f"{log_prefix} CloseStream message sent successfully")
                                        except Exception as e:
                                            logger.warning(f"{log_prefix} Failed to send CloseStream: {e}")
                                        break
                                    if not chunk:
                                        continue
                                    try:
                                        if connection_closed:
                                            logger.warning(f"{log_prefix} Attempted to send chunk but connection is closed")
                                            break
                                        
                                        await ws.send_bytes(chunk)
                                        chunks_sent += 1
                                        last_activity_time = time.time()
                                        if chunks_sent == 1:
                                            # Detect audio format from first chunk
                                            format_hint = "unknown"
                                            if len(chunk) >= 4:
                                                header = chunk[:4]
                                                if header == b'\x1a\x45\xdf\xa3':  # WebM/Matroska EBML header
                                                    format_hint = "WebM"
                                                elif header[:3] == b'RIFF':  # WAV header
                                                    format_hint = "WAV"
                                                elif header[:4] == b'fLaC':  # FLAC header
                                                    format_hint = "FLAC"
                                                elif header[:2] == b'\xff\xfb' or header[:2] == b'\xff\xf3':  # MP3
                                                    format_hint = "MP3"
                                                elif header[:4] == b'OggS':  # Ogg/Opus
                                                    format_hint = "Ogg/Opus"
                                            logger.info(f"{log_prefix} First chunk sent ({len(chunk)} bytes), detected format: {format_hint}, first 20 bytes hex: {chunk[:20].hex() if len(chunk) >= 20 else 'N/A'}")
                                        elif chunks_sent % 50 == 0:  # Log every 50 chunks
                                            logger.debug(f"{log_prefix} Sent {chunks_sent} chunks (last chunk: {len(chunk)} bytes)")
                                    except ConnectionResetError as e:
                                        logger.error(f"{log_prefix} Connection reset while sending audio chunk #{chunks_sent}: {e}")
                                        connection_closed = True
                                        remaining = audio_queue.qsize()
                                        if remaining > 0:
                                            logger.warning(f"{log_prefix} {remaining} chunks still in queue when connection reset")
                                        break
                                    except Exception as e:
                                        error_type = type(e).__name__
                                        error_msg = str(e)
                                        if "closing" in error_msg.lower() or "closed" in error_msg.lower() or "transport" in error_msg.lower():
                                            logger.error(f"{log_prefix} Connection closed while sending audio chunk #{chunks_sent}: {error_type}: {error_msg}")
                                            connection_closed = True
                                            remaining = audio_queue.qsize()
                                            if remaining > 0:
                                                logger.warning(f"{log_prefix} {remaining} chunks still in queue when connection closed")
                                        else:
                                            logger.error(f"{log_prefix} Error sending audio chunk #{chunks_sent}: {error_type}: {error_msg}")
                                        break
                                except asyncio.CancelledError:
                                    logger.info(f"{log_prefix} Sender task cancelled")
                                    break
                                except Exception as e:
                                    logger.error(f"{log_prefix} Unexpected error in sender: {type(e).__name__}: {e}")
                                    break
                            
                            logger.info(f"{log_prefix} Sender task completed. Total chunks sent: {chunks_sent}")

                        async def receiver(ws, transcript_queue):
                            """Receives transcript results from Deepgram and puts them in the queue."""
                            nonlocal transcripts_received, final_transcripts, last_activity_time, connection_closed, chunks_sent
                            
                            try:
                                async for msg in ws:
                                    last_activity_time = time.time()
                                    
                                    if msg.type == aiohttp.WSMsgType.TEXT:
                                        try:
                                            data = json.loads(msg.data)
                                            msg_type = data.get('type', 'Unknown')
                                            
                                            if msg_type == 'Error':
                                                error_details = json.dumps(data, indent=2)
                                                logger.error(f"{log_prefix} Deepgram error: {error_details}")
                                                # Put error in queue so frontend can be notified
                                                await transcript_queue.put({
                                                    "text": f"Deepgram error: {data.get('message', 'Unknown error')}",
                                                    "is_final": True,
                                                    "error": True
                                                })
                                            elif msg_type == 'Results':
                                                transcript = data.get('channel', {}).get('alternatives', [{}])[0].get('transcript', '')
                                                is_final = data.get('is_final', False)
                                                
                                                if transcript:
                                                    transcripts_received += 1
                                                    if is_final:
                                                        final_transcripts += 1
                                                        logger.info(f"{log_prefix} Received FINAL transcript #{final_transcripts}: '{transcript[:100]}{'...' if len(transcript) > 100 else ''}'")
                                                    else:
                                                        if transcripts_received % 10 == 0:  # Log every 10th interim to avoid spam
                                                            logger.debug(f"{log_prefix} Received interim transcript #{transcripts_received}: '{transcript[:50]}{'...' if len(transcript) > 50 else ''}'")
                                                    
                                                    await transcript_queue.put({
                                                        "text": transcript,
                                                        "is_final": is_final
                                                    })
                                                else:
                                                    # Log more details about empty results
                                                    channel_data = data.get('channel', {})
                                                    alternatives = channel_data.get('alternatives', [{}])
                                                    confidence = alternatives[0].get('confidence', 'N/A') if alternatives else 'N/A'
                                                    words = alternatives[0].get('words', []) if alternatives else []
                                                    logger.warning(f"{log_prefix} Empty transcript in Results message (is_final={is_final}, confidence={confidence}, words_count={len(words)}, chunks_sent={chunks_sent})")
                                                    # If we've sent many chunks but still no transcript, log the full response for debugging
                                                    if chunks_sent > 10 and transcripts_received == 0:
                                                        logger.warning(f"{log_prefix} No transcripts after {chunks_sent} chunks. Full response: {json.dumps(data, indent=2)[:500]}")
                                        except json.JSONDecodeError as e:
                                            logger.error(f"{log_prefix} Failed to parse JSON message: {e}, raw: {msg.data[:200]}")
                                        except Exception as e:
                                            logger.error(f"{log_prefix} Error processing message: {type(e).__name__}: {e}")
                                    elif msg.type == aiohttp.WSMsgType.CLOSED:
                                        logger.warning(f"{log_prefix} WebSocket CLOSED by Deepgram (chunks_sent={chunks_sent}, transcripts={transcripts_received})")
                                        connection_closed = True
                                        break
                                    elif msg.type == aiohttp.WSMsgType.ERROR:
                                        error_data = msg.data if hasattr(msg, 'data') else 'Unknown error'
                                        logger.error(f"{log_prefix} WebSocket ERROR: {error_data}")
                                        connection_closed = True
                                        break
                                    elif msg.type == aiohttp.WSMsgType.BINARY:
                                        logger.debug(f"{log_prefix} Unexpected binary message: {len(msg.data)} bytes")
                            except asyncio.CancelledError:
                                logger.info(f"{log_prefix} Receiver task cancelled")
                            except Exception as e:
                                logger.error(f"{log_prefix} Unexpected error in receiver: {type(e).__name__}: {e}")
                            
                            logger.info(f"{log_prefix} Receiver completed: transcripts={transcripts_received} (final={final_transcripts})")

                        sender_task = asyncio.create_task(sender(ws, audio_queue))
                        receiver_task = asyncio.create_task(receiver(ws, transcript_queue))
                        
                        try:
                            done, pending = await asyncio.wait(
                                [sender_task, receiver_task],
                                return_when=asyncio.FIRST_COMPLETED
                            )
                            
                            if receiver_task in done and sender_task not in done:
                                logger.info(f"{log_prefix} Receiver completed first, waiting for sender to finish...")
                                try:
                                    await asyncio.wait_for(sender_task, timeout=5.0)
                                except asyncio.TimeoutError:
                                    logger.warning(f"{log_prefix} Sender did not complete within timeout, cancelling")
                                    sender_task.cancel()
                                    try:
                                        await sender_task
                                    except asyncio.CancelledError:
                                        pass
                            
                            elif sender_task in done and receiver_task not in done:
                                logger.info(f"{log_prefix} Sender completed first, waiting for receiver to finish...")
                                try:
                                    await asyncio.wait_for(receiver_task, timeout=2.0)
                                except asyncio.TimeoutError:
                                    logger.warning(f"{log_prefix} Receiver did not complete within timeout, cancelling")
                                    receiver_task.cancel()
                                    try:
                                        await receiver_task
                                    except asyncio.CancelledError:
                                        pass
                            
                            if pending:
                                await asyncio.gather(*pending, return_exceptions=True)
                                
                        finally:
                            connection_end_time = time.time()
                            connection_duration = connection_end_time - connection_start_time
                            logger.info(f"{log_prefix} Deepgram session ended: session_id={session_id}, duration={connection_duration:.1f}s, chunks={chunks_sent}, transcripts={transcripts_received} (final={final_transcripts})")
                            
                            for t in (sender_task, receiver_task):
                                if not t.done():
                                    t.cancel()
                                    try:
                                        await asyncio.wait_for(t, timeout=1.0)
                                    except (asyncio.CancelledError, asyncio.TimeoutError):
                                        pass
                except aiohttp.ClientError as e:
                    connection_fail_time = time.time()
                    connection_fail_latency = (connection_fail_time - connection_start_time) * 1000
                    logger.error(f"{log_prefix} Failed to establish WebSocket connection after {connection_fail_latency:.2f}ms: {type(e).__name__}: {e}")
                    raise
                except Exception as e:
                    connection_fail_time = time.time()
                    connection_fail_latency = (connection_fail_time - connection_start_time) * 1000
                    logger.error(f"{log_prefix} Unexpected error during connection setup after {connection_fail_latency:.2f}ms: {type(e).__name__}: {e}")
                    raise
        except Exception as e:
            logger.error(f"{log_prefix} Fatal error in stream_transcribe: {type(e).__name__}: {e}", exc_info=True)
            raise


class STTService:
    def __init__(self, provider: Optional[STTProvider] = None):
        self.config = load_config()
        provider_name = self.config.get('stt', {}).get('provider')
        
        provider_name_lower = provider_name.lower().strip() if provider_name else ''
        provider_map = {
            'deepgram': DeepgramProvider,
            'deepgram_provider': DeepgramProvider,
            'azure_whisper': AzureWhisperProvider,
            'azure': AzureWhisperProvider,  
        }
        
        provider_class = provider_map.get(provider_name_lower)
        if not provider_class:
            raise ValueError(
                f"Unknown STT provider: {provider_name}. "
                f"Available providers: {', '.join(set(provider_map.keys()))}"
            )
        
        self.provider = provider_class()

    async def transcribe_session(self, session_id: str, language: Optional[str] = None) -> str:
        """
        Transcribe audio chunks from a session.
        Returns empty string if transcription fails or no audio is available.
        """
        try:
            chunks: List[bytes] = await get_audio_chunks(session_id)
            if not chunks:
                logger.warning(f"No audio chunks found for session_id: {session_id}")
                return ""

            audio_data = audio_utils.merge_chunks(chunks)
            if not audio_data:
                logger.warning(f"Empty audio data after merging chunks for session_id: {session_id}")
                return ""
            
            try:
                audio_data = audio_utils.converted_audio_compatible(audio_data)
            except RuntimeError as e:
                logger.error(f"Failed to convert audio for session_id {session_id}: {e}")
                return ""
            except Exception as e:
                logger.error(f"Unexpected error converting audio for session_id {session_id}: {e}", exc_info=True)
                return ""
            
            return await self.provider.transcribe(audio_data, language)
        except Exception as e:
            logger.error(f"Error in transcribe_session for session_id {session_id}: {e}", exc_info=True)
            return ""

    async def stream_transcribe_session(self, audio_queue: asyncio.Queue, transcript_queue: asyncio.Queue, session_id: Optional[str] = None):
        """Initiates a streaming transcription session."""
        if hasattr(self.provider, 'stream_transcribe'):
            await self.provider.stream_transcribe(audio_queue, transcript_queue, session_id=session_id)
        else:
            logger.warning(f"STT provider {type(self.provider).__name__} does not support streaming transcription")




stt_service = STTService()
