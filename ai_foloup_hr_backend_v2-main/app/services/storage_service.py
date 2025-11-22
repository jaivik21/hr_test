import shutil
import re
import subprocess
import sys
import asyncio
from pathlib import Path
import boto3
from botocore.exceptions import ClientError
from io import BytesIO

current_file = Path(__file__).resolve()
app_dir = current_file.parent
backend_dir = app_dir.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
from config_loader import load_config
from utils.logger import get_logger

logger = get_logger(__name__)

class StorageService:
    def __init__(self):
        config = load_config()
        self.storage_type = config.get('storage', {}).get('storage_type', 'local')
        
        if self.storage_type == 'local':
            storage_path = config.get('storage', {}).get('storage_path')
            
            if storage_path:
                storage_path = Path(storage_path)
                if storage_path.is_absolute():
                    self.base_path = storage_path.resolve()
                else:
                    backend_dir = self._find_backend_directory()
                    self.base_path = (backend_dir / storage_path).resolve()
            else:
                backend_dir = self._find_backend_directory()
                self.base_path = (backend_dir / 'storage').resolve()
        else:
            backend_dir = self._find_backend_directory()
            storage_path = config.get('storage', {}).get('storage_path')
            if storage_path:
                storage_path = Path(storage_path)
                if storage_path.is_absolute():
                    self.base_path = storage_path.resolve()
                else:
                    self.base_path = (backend_dir / storage_path).resolve()
            else:
                self.base_path = (backend_dir / 'storage').resolve()
        
        self.temp_dir = self.base_path / "temp"
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Temp directory (always local): {self.temp_dir}")
        if self.storage_type == 'local':
            self.video_dir = self.base_path / "videos"
            self.video_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Video directory (local): {self.video_dir}")
        else:
            self.video_dir = self.base_path / "videos"
        
        if self.storage_type == "s3":
            self.s3_bucket = config.get('storage', {}).get('bucket_name')
            if not self.s3_bucket:
                logger.warning("S3 bucket name not configured - S3 storage will fail")
            else:
                self.s3_client = boto3.client(
                    "s3",
                    aws_access_key_id = config.get('storage', {}).get('s3_access_key'),
                    aws_secret_access_key = config.get('storage', {}).get('s3_secret_key'),
                    region_name = config.get('storage', {}).get('region_name')
                )
        else:
            self.s3_bucket = None
            self.s3_client = None
            logger.info("Using local storage - S3 client not initialized")

    def _upload_to_s3(self, key:str, bytes_data:bytes) -> str :
        if not hasattr(self, 's3_client') or self.s3_client is None:
            raise RuntimeError(f"S3 client not initialized. Cannot upload {key}. Make sure storage_type is 's3' in config.")
        if not self.s3_bucket:
            raise RuntimeError(f"S3 bucket not configured. Cannot upload {key}")
        
        try :
            self.s3_client.upload_fileobj(BytesIO(bytes_data), self.s3_bucket, key)
            url = f'https://{self.s3_bucket}.s3.amazonaws.com/{key}'
            logger.debug(f"S3 upload successful: {url}")
            return url
        except ClientError as e:
            logger.error(f"S3 upload failed for {key}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error uploading to S3 for {key}: {e}", exc_info=True)
            raise

    def _find_backend_directory(self) -> Path:
        current_file = Path(__file__).resolve()
        current_dir = current_file.parent
        
        for parent in [current_dir] + list(current_dir.parents):
            config_file = parent / 'config.yaml'
            if config_file.exists():
                return parent
        
        if 'app' in current_dir.parts and 'services' in current_dir.parts:
            app_index = current_dir.parts.index('app')
            backend_parts = current_dir.parts[:app_index]
            return Path(*backend_parts) if backend_parts else current_dir.parent.parent
        
        return current_dir.parent.parent

    async def save_candidate_image(self, file_content: bytes, response_id: str, file_extension: str) -> str:
        """
        Save candidate image. Uses local storage if storage_type is 'local', S3 if 's3'.
        """
        if self.storage_type == "local":
            image_dir = self.base_path / "images"
            image_dir.mkdir(parents=True, exist_ok=True)
            file_path = image_dir / f"{response_id}.{file_extension}"
            with open(file_path, "wb") as f:
                f.write(file_content)
            logger.info(f"Image saved locally for response_id: {response_id}, path: {file_path}")
            return f"images/{response_id}.{file_extension}"
        else:
            key = f"images/{response_id}.{file_extension}"
            url = self._upload_to_s3(key, file_content)
            logger.info(f"Image uploaded to S3 for response_id: {response_id}, key: {key}")
            return url
    
    def _get_next_chunk_index(self, chunk_dir: Path, file_extension: str, proposed_index: int = None) -> int:
        """Get the next available chunk index."""
        if proposed_index is None:
            existing = sorted(chunk_dir.glob(f"chunk_*.{file_extension}"))
            return len(existing)
        
        proposed_path = chunk_dir / f"chunk_{proposed_index:05d}.{file_extension}"
        if not proposed_path.exists():
            return proposed_index
        
        existing = sorted(chunk_dir.glob(f"chunk_*.{file_extension}"))
        max_index = -1
        for f in existing:
            match = re.search(r'chunk_(\d+)', f.name)
            if match:
                max_index = max(max_index, int(match.group(1)))
        return max_index + 1

    async def save_chunk(self, file_content: bytes, response_id: str, file_extension: str, chunk_index: int = None) -> str:
        """
        Save a video chunk to temporary storage.
        Chunks are ALWAYS stored locally in temp directory, regardless of storage_type.
        
        Chunk Path Structure:
            {base_path}/temp/{response_id}/chunk_{index:05d}.{extension}
            
        Where base_path is determined by:
            - If storage_path in config is absolute: uses that path
            - If storage_path in config is relative: {backend_dir}/{storage_path}
            - If storage_path not set: {backend_dir}/storage
            
        Example with config.yaml storage_path: "app/cache/storage"
            Chunks stored at: {backend_dir}/app/cache/storage/temp/{response_id}/chunk_00000.webm
        """
        chunk_dir = self.temp_dir / response_id
        chunk_dir.mkdir(parents=True, exist_ok=True)
        logger.debug(f"Saving chunk to local temp directory: {chunk_dir} (absolute: {chunk_dir.resolve()})")

        chunk_index = self._get_next_chunk_index(chunk_dir, file_extension, chunk_index)
        file_path = chunk_dir / f"chunk_{chunk_index:05d}.{file_extension}"
        
        if file_extension.lower() == "webm" and chunk_index == 0 and len(file_content) >= 4:
            if file_content[0:4] != b'\x1a\x45\xdf\xa3':
                pass  
        
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        saved_size = file_path.stat().st_size
        if saved_size != len(file_content):
            raise IOError(f"File size mismatch: expected {len(file_content)} bytes, got {saved_size} bytes")

        return str(file_path)

    def _find_all_chunks(self, temp_response_dir: Path):
        all_chunks = sorted(
            temp_response_dir.glob("chunk_*.webm"),
            key=lambda f: int(re.search(r'chunk_(\d+)', f.name).group(1))
        )
        
        valid_chunks = []
        for chunk_file in all_chunks:
            try:
                size = chunk_file.stat().st_size
                if size < 100:  
                    continue
                
                with open(chunk_file, "rb") as f:
                    header = f.read(4)
                    if len(header) < 4:
                        continue
                
                valid_chunks.append(chunk_file)
            except Exception:
                continue  # Skip invalid chunks silently
        
        return valid_chunks

    def _get_video_url(self, response_id: str, base_url: str = None) -> str:
        """
        Get video URL. Returns local path if storage_type is 'local', S3 URL if 's3'.
        """
        if self.storage_type == 'local':
            url = f"/api/media/files/videos/{response_id}.mp4"
            url = url.replace('//', '/')
            return url
        else:
            return f"https://{self.s3_bucket}.s3.amazonaws.com/videos/{response_id}.mp4"

    def _validate_chunks(self, chunks: list) -> bool:
        if not chunks:
            return False
        
        chunk_indices = [int(re.search(r'chunk_(\d+)', c.name).group(1)) for c in chunks]
        if 0 not in chunk_indices:
            return False
        
        if len(chunks) == 1 and chunks[0].stat().st_size < 100_000:
            return False
        
        return True

    def _merge_chunks_to_webm(self, chunks: list, merged_webm: Path) -> bool:
        """
        Merge WebM chunks into a single file.
        Returns True if successful, False otherwise.
        """
        try:
            logger.info(f"Merging {len(chunks)} chunks into {merged_webm}")
            total_expected_size = sum(chunk.stat().st_size for chunk in chunks)
            logger.info(f"Total expected size after merge: {total_expected_size} bytes")
            
            bytes_written = 0
            with open(merged_webm, "wb") as outfile:
                for idx, chunk_file in enumerate(chunks):
                    try:
                        chunk_size = chunk_file.stat().st_size
                        if chunk_size == 0:
                            logger.warning(f"Chunk {idx + 1}/{len(chunks)} is empty: {chunk_file.name}")
                            continue
                        
                        logger.debug(f"Reading chunk {idx + 1}/{len(chunks)}: {chunk_file.name} ({chunk_size} bytes)")
                        
                        with open(chunk_file, "rb") as infile:
                            # Read in chunks to avoid memory issues with large files
                            while True:
                                chunk_data = infile.read(8192)  # 8KB chunks
                                if not chunk_data:
                                    break
                                outfile.write(chunk_data)
                                bytes_written += len(chunk_data)
                        
                        logger.debug(f"Chunk {idx + 1} written successfully")
                    except FileNotFoundError as e:
                        logger.error(f"Chunk file not found: {chunk_file.name}, error: {e}")
                        return False
                    except PermissionError as e:
                        logger.error(f"Permission error reading chunk {chunk_file.name}: {e}")
                        return False
                    except Exception as chunk_error:
                        logger.error(f"Error reading chunk {chunk_file.name}: {chunk_error}", exc_info=True)
                        return False
            
            # Verify the merged file was created and has content
            if not merged_webm.exists():
                logger.error(f"Merged WebM file was not created: {merged_webm}")
                return False
            
            merged_size = merged_webm.stat().st_size
            logger.info(f"Merged WebM file created: {merged_webm}, size: {merged_size} bytes (expected: {total_expected_size} bytes, written: {bytes_written} bytes)")
            
            if merged_size == 0:
                logger.error(f"Merged WebM file is empty: {merged_webm}")
                return False
            
            # Size validation - allow some tolerance (within 1% or 1MB)
            size_diff = abs(merged_size - total_expected_size)
            if size_diff > max(total_expected_size * 0.01, 1024 * 1024):
                logger.warning(f"Size mismatch: merged={merged_size}, expected={total_expected_size}, diff={size_diff} bytes")
                # Don't fail - might be due to file system overhead or compression
            
            # Validate WebM header (EBML header: 0x1A 0x45 0xDF 0xA3)
            with open(merged_webm, "rb") as f:
                header = f.read(4)
                if len(header) < 4:
                    logger.error(f"Merged WebM file too small to have valid header: {merged_webm}")
                    return False
                
                if header != b'\x1a\x45\xdf\xa3':
                    logger.warning(f"WebM header check: Got {header.hex()}, expected 1a45dfa3")
                    logger.info(f"Proceeding - FFmpeg will handle format validation")
            
            logger.info(f"Successfully merged {len(chunks)} chunks to WebM: {merged_webm} ({merged_size} bytes)")
            return True
        except Exception as e:
            logger.error(f"Exception merging chunks to WebM: {e}", exc_info=True)
            # Clean up partial file
            try:
                if merged_webm.exists():
                    merged_webm.unlink()
                    logger.debug(f"Cleaned up partial merged file: {merged_webm}")
            except Exception:
                pass
            return False

    def _build_ffmpeg_command(self, merged_webm: Path, output_path: Path) -> list:
        """Build FFmpeg command for WebM to MP4 conversion."""
        # Optimized for corrupted/fragmented WebM files from MediaRecorder
        # Reduced analyze/probe duration to speed up processing
        # Added vsync and frame rate to handle duplicate frames
        return [
            "ffmpeg",
            "-analyzeduration", "10000000",  # 10 seconds (reduced from max to speed up)
            "-probesize", "10000000",  # 10MB (reduced from max to speed up)
            "-fflags", "+genpts+igndts+discardcorrupt",
            "-err_detect", "ignore_err",
            "-i", str(merged_webm),
            "-vsync", "cfr",  # Constant frame rate (prevents frame duplication)
            "-r", "30",  # Force 30fps output (handles variable frame rate issues)
            "-c:v", "libx264", "-preset", "medium", "-crf", "23",  # medium preset for better speed/quality balance
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            "-avoid_negative_ts", "make_zero",
            "-f", "mp4",
            "-y",
            str(output_path)
        ]

    def _validate_output_video(self, output_path: Path) -> bool:
        if not output_path.exists():
            return False
        
        if output_path.stat().st_size == 0:
            return False
        
        try:
            probe_cmd = [
                "ffprobe", "-v", "error", "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1", str(output_path)
            ]
            # This is called from async context, but validation is quick so we allow blocking here
            # If this becomes an issue, we can make it async too
            probe_result = subprocess.run(probe_cmd, capture_output=True, text=True, timeout=10)
            if probe_result.returncode == 0:
                duration = float(probe_result.stdout.strip().split('\n')[0] or 0)
                return duration > 0
        except Exception:
            pass
        
        return True

    def _save_candidate_video_sync(self, response_id: str, base_url: str = None, file_extension: str = "webm") -> str:
        """
        Synchronous version of video processing - contains all blocking operations.
        Uses local storage if storage_type is 'local', S3 if 's3'.
        Temp files are always kept locally for processing.
        This should be called via asyncio.to_thread() to avoid blocking the event loop.
        """
        use_s3 = self.storage_type == 's3'
        logger.info(f"Video processing for response_id: {response_id}, storage_type: {self.storage_type}, use_s3: {use_s3}")
        
        if use_s3:
            # For S3: process in temp directory, then upload
            output_path = self.temp_dir / f"{response_id}.mp4"
            logger.info(f"Using S3 storage, processing video in temp directory: {output_path}")
        else:
            # For local: save directly to videos directory
            output_path = self.video_dir / f"{response_id}.mp4"
            logger.info(f"Using local storage, output will be in videos directory: {output_path}")
        
        # Check if video already exists (only for local storage)
        if not use_s3 and output_path.exists() and output_path.stat().st_size > 0:
            logger.info(f"Video already exists: {output_path}, size: {output_path.stat().st_size} bytes")
            return self._get_video_url(response_id, base_url)
        
        # Temp directory is ALWAYS local - contains chunks, merged.webm, etc.
        # This is independent of storage_type (local or s3)
        temp_response_dir = self.temp_dir / response_id
        if not temp_response_dir.exists():
            logger.warning(f"Temp directory not found: {temp_response_dir}")
            return None
        logger.debug(f"Using local temp directory for processing: {temp_response_dir}")
        
        chunks = self._find_all_chunks(temp_response_dir)
        logger.info(f"Found {len(chunks)} chunks for response_id: {response_id}")
        
        if not chunks:
            logger.error(f"No chunks found in temp directory: {temp_response_dir}")
            return None
        
        # Log chunk details
        for idx, chunk in enumerate(chunks[:5]):  # Log first 5 chunks
            logger.debug(f"Chunk {idx + 1}: {chunk.name}, size: {chunk.stat().st_size} bytes")
        if len(chunks) > 5:
            logger.debug(f"... and {len(chunks) - 5} more chunks")
        
        if not self._validate_chunks(chunks):
            logger.warning(f"Chunks validation failed for response_id: {response_id}")
            logger.warning(f"Chunk details: count={len(chunks)}, first_chunk={chunks[0].name if chunks else 'N/A'}")
            return None
        
        merged_webm = temp_response_dir / "merged.webm"
        logger.info(f"Starting chunk merge for response_id: {response_id}, output: {merged_webm}")
        
        if not self._merge_chunks_to_webm(chunks, merged_webm):
            logger.error(f"Failed to merge chunks to WebM for response_id: {response_id}")
            # Check if merged file exists
            if merged_webm.exists():
                logger.error(f"Merged file exists but merge failed: {merged_webm}, size: {merged_webm.stat().st_size} bytes")
            else:
                logger.error(f"Merged file was not created: {merged_webm}")
            return None
        
        # Verify merged file exists and has content
        if not merged_webm.exists():
            logger.error(f"Merged WebM file does not exist after merge: {merged_webm}")
            return None
        
        merged_size = merged_webm.stat().st_size
        if merged_size == 0:
            logger.error(f"Merged WebM file is empty: {merged_webm}")
            return None
        
        logger.info(f"Chunks merged successfully. Merged WebM size: {merged_size} bytes")

        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)
        logger.info(f"Output directory ensured: {output_path.parent}")

        ffmpeg_cmd = self._build_ffmpeg_command(merged_webm, output_path)
        logger.info(f"Running FFmpeg to convert WebM to MP4 for response_id: {response_id}")
        logger.info(f"Input: {merged_webm} (exists: {merged_webm.exists()}, size: {merged_webm.stat().st_size if merged_webm.exists() else 0} bytes)")
        logger.info(f"Output: {output_path} (will upload to S3 after processing)")
        logger.debug(f"FFmpeg command: {' '.join(ffmpeg_cmd)}")
        
        try:
            # Run FFmpeg subprocess (blocking operation)
            logger.info(f"Starting FFmpeg process for response_id: {response_id}")
            import time
            start_time = time.time()
            
            # Run FFmpeg with timeout - increased to 900s (15 min) for large/corrupted files
            # Also capture stderr in real-time to see progress
            result = subprocess.run(
                ffmpeg_cmd, 
                check=True, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE, 
                timeout=900  # 15 minutes for very large or problematic videos
            )
            
            elapsed_time = time.time() - start_time
            logger.info(f"FFmpeg completed successfully for response_id: {response_id} in {elapsed_time:.2f} seconds")
            
            # Always log FFmpeg stderr for debugging (it often contains useful info)
            if result.stderr:
                stderr_output = result.stderr.decode('utf-8', errors='ignore')
                # Log last 1000 chars of stderr (usually contains the most relevant info)
                stderr_snippet = stderr_output[-1000:] if len(stderr_output) > 1000 else stderr_output
                if 'error' in stderr_output.lower() or 'failed' in stderr_output.lower():
                    logger.error(f"FFmpeg reported errors for response_id {response_id}: {stderr_snippet}")
                else:
                    logger.debug(f"FFmpeg stderr for response_id {response_id}: {stderr_snippet}")
            
            # Verify output file was created
            if not output_path.exists():
                logger.error(f"FFmpeg completed but output file does not exist: {output_path}")
                return None
            
            output_size = output_path.stat().st_size
            logger.info(f"FFmpeg output file created: {output_path}, size: {output_size} bytes")
            
            if output_size == 0:
                logger.error(f"FFmpeg output file is empty: {output_path}")
                return None
            
            if not self._validate_output_video(output_path):
                logger.error(f"Output video validation failed for response_id: {response_id}")
                return None
            
            logger.info(f"Video successfully created: {output_path}, size: {output_path.stat().st_size} bytes")

            response_url = None
            if use_s3:
                # Upload to S3
                logger.info(f"Uploading video to S3 for response_id: {response_id}")
                try:
                    with open(output_path, "rb") as f:
                        response_url = self._upload_to_s3(f"videos/{response_id}.mp4", f.read())
                    logger.info(f"Video uploaded to S3 successfully for response_id: {response_id}, URL: {response_url}")
                    
                    # Clean up local temp files after successful S3 upload
                    # NOTE: Don't clean up temp_response_dir yet - more chunks might still arrive
                    # The directory will be cleaned up later or on next merge attempt
                    try:
                        output_path.unlink(missing_ok=True)
                        logger.debug(f"Removed temp video file: {output_path}")
                    except TypeError:
                        if output_path.exists():
                            output_path.unlink()
                    except Exception as cleanup_error:
                        logger.warning(f"Failed to remove temp video file {output_path}: {cleanup_error}")
                    
                    # Don't clean up temp_response_dir here - chunks might still be arriving
                    # It will be cleaned up on the next successful merge or by a cleanup job
                    
                    return response_url
                except Exception as s3_error:
                    logger.error(f"Failed to upload video to S3 for response_id: {response_id}: {s3_error}", exc_info=True)
                    # Don't clean up temp files if S3 upload failed - might want to retry
                    return None
            else:
                # Local storage - just clean up temp directory, keep the video file
                try:
                    shutil.rmtree(temp_response_dir, ignore_errors=True)
                    logger.debug(f"Cleaned up temp directory: {temp_response_dir}")
                except Exception as cleanup_error:
                    logger.warning(f"Failed to remove temp directory {temp_response_dir}: {cleanup_error}")
                
                return self._get_video_url(response_id, base_url)
            
        except subprocess.TimeoutExpired as e:
            logger.error(f"FFmpeg timeout (600s) for response_id: {response_id}")
            if hasattr(e, 'stderr') and e.stderr:
                stderr_output = e.stderr.decode('utf-8', errors='ignore')
                logger.error(f"FFmpeg stderr before timeout: {stderr_output[-500:]}")
            return None
        except subprocess.CalledProcessError as e:
            error_msg = "Unknown error"
            if e.stderr:
                try:
                    error_msg = e.stderr.decode('utf-8', errors='ignore')
                except:
                    error_msg = str(e.stderr)
            elif e.stdout:
                try:
                    error_msg = e.stdout.decode('utf-8', errors='ignore')
                except:
                    pass
            
            logger.error(f"FFmpeg failed for response_id: {response_id}")
            logger.error(f"FFmpeg return code: {e.returncode}")
            logger.error(f"FFmpeg error output: {error_msg[-2000:] if len(error_msg) > 2000 else error_msg}")
            
            # Check if output file exists despite error
            if output_path.exists():
                output_size = output_path.stat().st_size
                logger.warning(f"Output file exists despite FFmpeg error: {output_path}, size: {output_size} bytes")
                if output_size > 0:
                    logger.info(f"Attempting to use output file despite FFmpeg error")
                else:
                    logger.error(f"Output file is empty, removing: {output_path}")
                    try:
                        output_path.unlink()
                    except:
                        pass
                    return None
            else:
                logger.error(f"Output file was not created: {output_path}")
            
            return None
        except Exception as e:
            logger.error(f"Unexpected error during video conversion for response_id: {response_id}: {e}", exc_info=True)
            return None

    async def save_candidate_video(self, response_id: str, base_url: str = None, file_extension: str = "webm") -> str:
        try:
            try:
                return await asyncio.to_thread(
                    self._save_candidate_video_sync,
                    response_id,
                    base_url,
                    file_extension
                )
            except AttributeError:
                # Fallback for Python < 3.9
                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(
                    None,
                    self._save_candidate_video_sync,
                    response_id,
                    base_url,
                    file_extension
                )
        except Exception as e:
            logger.error(f"Error in async wrapper for video processing for response_id: {response_id}: {e}", exc_info=True)
            return None


storage_service = StorageService()
