import json
from fastapi import APIRouter, HTTPException, Request
from pathlib import Path
from fastapi.responses import FileResponse, StreamingResponse
from typing import List
import re
import mimetypes
import logging
from datetime import datetime

from ...services.detection_service import detection_service

from ...schema import (
    Detection
)

from ...utils.detection_manager import DetectionEventManager
from ...dependencies import DatabaseDep, get_db
from ...Settings import Settings

router = APIRouter()
logger = logging.getLogger("nexguard.detections")
settings = Settings()

@router.get("/debug/list")
async def debug_list_detections(db: DatabaseDep):
    """Debug endpoint to list all detections and their media"""
    from ...core.models import Detection, Media
    
    detections = db.query(Detection).all()
    result = []
    
    for detection in detections:
        media_records = db.query(Media).filter(Media.detection_id == detection.id).all()
        result.append({
            "detection_id": detection.id,
            "timestamp": detection.timestamp,
            "media": [
                {
                    "id": media.id,
                    "type": media.media_type,
                    "path": media.path
                }
                for media in media_records
            ]
        })
    
    return result

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

@router.get("/media/video/{detection_id}")
async def get_detection_video(
    detection_id: int,
    request: Request,
    db: DatabaseDep,
):
    """Stream detection video by ID with proper range support"""
    print(f"Requesting video for detection_id={detection_id}")
    
    try:
        video_path_str = detection_service.get_media_filepath(db=db, id=detection_id, media_type="video")
        
        if not video_path_str:
            raise HTTPException(status_code=404, detail="Video not found")

        video_path = Path(video_path_str)
        if not video_path.exists():
            raise HTTPException(status_code=404, detail="Video file does not exist")
        
        print(f"Serving video from: {video_path}")
        
        file_size = video_path.stat().st_size
        range_header = request.headers.get("range") or request.headers.get("Range")
        
        base_headers = {
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Range",
        }

        if range_header:
            # Parse Range header
            m = re.match(r"bytes=(\d*)-(\d*)", range_header.strip(), flags=re.I)
            if not m:
                raise HTTPException(status_code=416, detail="Invalid Range header")

            start_str, end_str = m.groups()
            start = int(start_str) if start_str else 0
            end = int(end_str) if end_str else file_size - 1

            # Clamp values
            start = max(0, min(start, file_size - 1))
            end = max(0, min(end, file_size - 1))
            
            if start > end:
                raise HTTPException(status_code=416, detail="Invalid Range values")

            chunk_size = end - start + 1
            headers = {
                **base_headers,
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Content-Length": str(chunk_size),
                "Content-Type": "video/mp4",
            }
            
            print(f"Serving range {start}-{end} of {file_size} bytes")
            return StreamingResponse(
                iter_file(video_path, start, end),
                status_code=206,
                headers=headers,
                media_type="video/mp4"
            )

        # If no Range header, return full file
        headers = {
            **base_headers,
            "Content-Length": str(file_size),
            "Content-Type": "video/mp4",
        }
        return FileResponse(video_path, media_type="video/mp4", headers=headers)

    except Exception as e:
        logger.exception("Error retrieving video for detection_id=%s", detection_id)
        raise HTTPException(status_code=500, detail=f"Error retrieving video: {str(e)}")


def iter_file(file_path: Path, start: int, end: int, chunk_size: int = 1024*1024):
    """Generator to read file in chunks"""
    with file_path.open("rb") as f:
        f.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            read_size = min(chunk_size, remaining)
            data = f.read(read_size)
            if not data:
                break
            yield data
            remaining -= len(data)
