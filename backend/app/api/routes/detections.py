from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse
from typing import List, Optional
import os
import re
import json
import logging
import subprocess
from datetime import datetime, timedelta
import time
from sqlalchemy.orm import Session

from ...services.detection_service import detection_service

from ...schema import (
    Detection, Media
)

from ...utils.detection_manager import DetectionEventManager
from ...dependencies import DatabaseDep, get_db

router = APIRouter()
logger = logging.getLogger("nexguard.detections")


def _resolve_storage_dir() -> str:
    storage_dir = os.getenv("STORAGE_DIR")
    if storage_dir:
        return os.path.abspath(storage_dir)
    # fallback to backend/app/data/storage
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "storage"))


def _ensure_path(video_path: str) -> str:
    """Resolve video_path to an absolute path and keep it within storage dir."""
    storage_dir = _resolve_storage_dir()
    if not os.path.isabs(video_path):
        video_path = os.path.normpath(os.path.join(storage_dir, video_path))
    video_path_abs = os.path.abspath(video_path)
    # safety: ensure inside storage_dir
    storage_dir_abs = os.path.abspath(storage_dir)
    try:
        if os.path.commonpath([video_path_abs, storage_dir_abs]) != storage_dir_abs:
            raise HTTPException(status_code=403, detail="Forbidden")
    except ValueError:
        # commonpath can raise on Windows with different drives
        raise HTTPException(status_code=403, detail="Forbidden")
    return video_path_abs


def _is_browser_friendly(file_path: str) -> bool:
    """Best-effort check using ffprobe for H.264/AVC video."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=codec_name",
                "-of", "json",
                file_path,
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        info = json.loads(result.stdout or "{}")
        streams = info.get("streams", [])
        if not streams:
            return False
        codec = (streams[0].get("codec_name") or "").lower()
        return codec in ("h264", "avc1")
    except Exception as e:
        logger.warning("ffprobe failed for %s: %s", file_path, e)
        # If probe fails, do not block playback; return True to attempt serve
        return True


def _maybe_convert(file_path: str) -> Optional[str]:
    """Convert to H.264/AAC MP4 with faststart; returns new path or None on failure."""
    try:
        base, ext = os.path.splitext(os.path.basename(file_path))
        out_dir = os.path.dirname(file_path)
        out_path = os.path.join(out_dir, f"{base}_web.mp4")
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", file_path,
                "-c:v", "libx264", "-c:a", "aac",
                "-movflags", "+faststart",
                out_path,
            ],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        return out_path if os.path.exists(out_path) else None
    except Exception as e:
        logger.error("ffmpeg convert failed for %s: %s", file_path, e)
        return None

@router.get("/date/{date}", response_model=List[Detection])
async def get_recent_detections(
    date: datetime,
    db: DatabaseDep
):
    """Get recent detections with images by date"""
    try:
        detections = detection_service.get_by_date(
        db=db,
        date=date
    )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve detections: {str(e)}"
        )
    
    return detections

@router.get("/media/video/{detection_id}", response_class=FileResponse)
async def get_detection_video(
    detection_id: int,
    request: Request,
    db: DatabaseDep,
):
    """get detection video by detection ID"""
    try:
        video_path = detection_service.get_media_filepath(db=db, id=detection_id, media_type="video")
        if not video_path:
            raise HTTPException(status_code=404, detail="Video not found")
        # resolve and validate path
        print(f"Video path before ensure: {video_path}")
        video_path = _ensure_path(video_path)
        if not os.path.exists(video_path):
            print(f"Video path does not exist: {video_path}")
            raise HTTPException(status_code=404, detail="Video file not found")

        print(f"Serving video path: {video_path}")
        # check format and optionally convert
        if not _is_browser_friendly(video_path):
            converted = _maybe_convert(video_path)
            if converted and os.path.exists(converted):
                video_path = converted

        file_size = os.path.getsize(video_path)
        range_header = request.headers.get("range") or request.headers.get("Range")
        
        if range_header:
            m = re.match(r"bytes=(\d*)-(\d*)", range_header.strip(), flags=re.I)
            if not m:
                raise HTTPException(status_code=416, detail="Invalid Range header")
            start_str, end_str = m.group(1), m.group(2)
            start = int(start_str) if start_str else 0
            end = int(end_str) if end_str else file_size - 1
            # clamp
            start = max(0, min(start, file_size - 1))
            end = max(0, min(end, file_size - 1))
            if start > end:
                raise HTTPException(status_code=416, detail="Invalid Range values")
            
            chunk_size = (end - start) + 1
            with open(video_path, "rb") as f:
                f.seek(start)
                data = f.read(chunk_size)
            
            headers = {
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(chunk_size),
                "Content-Type": "video/mp4",
            }
            return Response(data, status_code=206, headers=headers, media_type="video/mp4")

        return FileResponse(video_path, media_type="video/mp4")
    except Exception as e:
        logger.exception("Error retrieving video for detection_id=%s", detection_id)
        raise HTTPException(status_code=500, detail=f"Error retrieving video: {str(e)}")