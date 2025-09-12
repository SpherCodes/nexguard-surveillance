from typing import List, Optional, Dict, Any
from datetime import datetime
import os
import shutil
from pathlib import Path
import logging
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, and_, or_

from ..Settings import settings
from ..core.models import Media as MediaModel
from ..schema.media   import MediaCreate, Media as MediaSchema, MediaType, MediaWithRelations

logger = logging.getLogger(__name__)


class MediaService:
    """Service for managing media files and database records"""
    
    def __init__(self, media_storage_path: Optional[str] = None):
        if media_storage_path is None:
            self.media_storage_path = Path(settings.STORAGE_DIR)
        else:
            self.media_storage_path = Path(media_storage_path)
        
        self.media_storage_path.mkdir(parents=True, exist_ok=True)
        
        for media_type in MediaType:
            (self.media_storage_path / media_type.value).mkdir(exist_ok=True)
    
    def create_media(
        self, 
        db: Session, 
        media_data: MediaCreate,
        file_content: Optional[bytes] = None
    ) -> MediaSchema:
        """
        Persist a new media record and return it as a Pydantic MediaSchema.
        """
        try:
            if Path(media_data.path).is_absolute():
                file_path = Path(media_data.path)
            else:
                file_path = Path(settings.STORAGE_DIR) / media_data.path
            
            if file_content is None and not file_path.exists():
                raise InvalidMediaError(f"Media file not found at path: {file_path}")
            
            if file_content:
                stored_path = self._store_file_content(
                    file_content, 
                    media_data.media_type,
                    media_data.camera_id
                )
                media_data.path = str(stored_path)
                media_data.size_bytes = len(file_content)
            
            if media_data.size_bytes is None and file_path.exists():
                media_data.size_bytes = file_path.stat().st_size
            
            # Create database record
            db_media = MediaModel(
                camera_id   = media_data.camera_id,
                detection_id= media_data.detection_id,
                media_type  = media_data.media_type.value,
                path        = media_data.path,
                timestamp   = media_data.timestamp,
                duration    = media_data.duration,
                size_bytes  = media_data.size_bytes
            )
            db.add(db_media)
            db.commit()
            db.refresh(db_media)
            
            logger.info(f"Created media record {db_media.id} for camera {media_data.camera_id}")
            return MediaSchema.model_validate(db_media)
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating media: {str(e)}")
            if isinstance(e, (MediaStorageError, InvalidMediaError)):
                raise
            raise MediaStorageError(f"Failed to create media: {str(e)}")
    
    async def get_media_by_id(
        self, 
        db: Session, 
        media_id: int,
        include_relations: bool = False
    ) -> MediaSchema:
        """
        Get media by ID
        
        Args:
            db: Database session
            media_id: Media ID
            include_relations: Include camera and detection relations
            
        Returns:
            Media record
            
        Raises:
            MediaNotFoundError: If media not found
        """
        query = db.query(MediaModel)
        
        if include_relations:
            query = query.options(
                db.joinedload(MediaModel.camera),
                db.joinedload(MediaModel.detection)
            )
        
        db_media = query.filter(MediaModel.id == media_id).first()
        
        if not db_media:
            raise MediaNotFoundError(f"Media with ID {media_id} not found")
        
        if include_relations:
            return MediaWithRelations.model_validate(db_media)
        return MediaSchema.model_validate(db_media)
    
    async def get_media_by_camera(
        self,
        db: Session,
        camera_id: int,
        media_type: Optional[MediaType] = None,
        limit: int = 100,
        offset: int = 0,
        order_by: str = "timestamp",
        order_desc: bool = True
    ) -> List[MediaModel]:
        """
        Get media by camera ID
        
        Args:
            db: Database session
            camera_id: Camera ID
            media_type: Optional media type filter
            limit: Maximum number of results
            offset: Offset for pagination
            order_by: Field to order by (timestamp, created_at, size_bytes)
            order_desc: Order descending if True
            
        Returns:
            List of media records
        """
        query = db.query(MediaModel).filter(MediaModel.camera_id == camera_id)
        
        if media_type:
            query = query.filter(MediaModel.media_type == media_type)
        
        # Apply ordering
        order_field = getattr(MediaModel, order_by, MediaModel.timestamp)
        if order_desc:
            query = query.order_by(desc(order_field))
        else:
            query = query.order_by(asc(order_field))
        
        db_media_list = query.offset(offset).limit(limit).all()
        return [MediaSchema.model_validate(media) for media in db_media_list]
    
    async def get_media_by_detection(
        self,
        db: Session,
        detection_id: int
    ) -> List[MediaModel]:
        """
        Get media associated with a detection
        
        Args:
            db: Database session
            detection_id: Detection ID
            
        Returns:
            List of media records
        """
        db_media_list = db.query(MediaModel).filter(
            MediaModel.detection_id == detection_id
        ).order_by(desc(MediaModel.timestamp)).all()
        
        return [MediaSchema.model_validate(media) for media in db_media_list]
    
    async def get_media_by_time_range(
        self,
        db: Session,
        start_timestamp: float,
        end_timestamp: float,
        camera_id: Optional[int] = None,
        media_type: Optional[MediaType] = None,
        limit: int = 1000
    ) -> List[MediaSchema]:
        """
        Get media within a time range
        
        Args:
            db: Database session
            start_timestamp: Start time (Unix timestamp)
            end_timestamp: End time (Unix timestamp)
            camera_id: Optional camera filter
            media_type: Optional media type filter
            limit: Maximum results
            
        Returns:
            List of media records
        """
        query = db.query(MediaModel).filter(
            and_(
                MediaModel.timestamp >= start_timestamp,
                MediaModel.timestamp <= end_timestamp
            )
        )
        
        if camera_id:
            query = query.filter(MediaModel.camera_id == camera_id)
        
        if media_type:
            query = query.filter(MediaModel.media_type == media_type)
        
        db_media_list = query.order_by(desc(MediaModel.timestamp)).limit(limit).all()
        return [MediaSchema.model_validate(media) for media in db_media_list]
    
    async def delete_media(
        self,
        db: Session,
        media_id: int,
        delete_file: bool = True
    ) -> bool:
        """
        Delete media record and optionally the file
        
        Args:
            db: Database session
            media_id: Media ID
            delete_file: Whether to delete the physical file
            
        Returns:
            True if deleted successfully
            
        Raises:
            MediaNotFoundError: If media not found
        """
        db_media = db.query(MediaModel).filter(MediaModel.id == media_id).first()
        
        if not db_media:
            raise MediaNotFoundError(f"Media with ID {media_id} not found")
        
        file_path = db_media.path
        
        try:
            # Delete database record
            db.delete(db_media)
            db.commit()
            
            # Delete physical file if requested and exists
            if delete_file and file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    logger.info(f"Deleted media file: {file_path}")
                except OSError as e:
                    logger.warning(f"Could not delete media file {file_path}: {str(e)}")
            
            logger.info(f"Deleted media record {media_id}")
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting media {media_id}: {str(e)}")
            raise MediaStorageError(f"Failed to delete media: {str(e)}")
    
    async def get_media_stats(
        self,
        db: Session,
        camera_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get media statistics
        
        Args:
            db: Database session
            camera_id: Optional camera filter
            
        Returns:
            Dictionary with media statistics
        """
        query = db.query(MediaModel)
        
        if camera_id:
            query = query.filter(MediaModel.camera_id == camera_id)
        
        # Get counts by media type
        stats = {
            "total_count": query.count(),
            "by_type": {},
            "total_size_bytes": 0,
            "avg_size_bytes": 0
        }
        
        for media_type in MediaType:
            type_query = query.filter(MediaModel.media_type == media_type)
            count = type_query.count()
            total_size = db.query(db.func.sum(MediaModel.size_bytes)).filter(
                MediaModel.media_type == media_type
            ).scalar() or 0
            
            if camera_id:
                type_query = type_query.filter(MediaModel.camera_id == camera_id)
                total_size = db.query(db.func.sum(MediaModel.size_bytes)).filter(
                    and_(
                        MediaModel.media_type == media_type,
                        MediaModel.camera_id == camera_id
                    )
                ).scalar() or 0
            
            stats["by_type"][media_type.value] = {
                "count": count,
                "total_size_bytes": total_size,
                "avg_size_bytes": total_size / count if count > 0 else 0
            }
            
            stats["total_size_bytes"] += total_size
        
        if stats["total_count"] > 0:
            stats["avg_size_bytes"] = stats["total_size_bytes"] / stats["total_count"]
        
        return stats
    
    async def cleanup_old_media(
        self,
        db: Session,
        days_old: int = 30,
        camera_id: Optional[int] = None,
        delete_files: bool = True
    ) -> int:
        """
        Clean up old media records
        
        Args:
            db: Database session
            days_old: Delete media older than this many days
            camera_id: Optional camera filter
            delete_files: Whether to delete physical files
            
        Returns:
            Number of records deleted
        """
        cutoff_timestamp = datetime.now().timestamp() - (days_old * 24 * 60 * 60)
        
        query = db.query(MediaModel).filter(MediaModel.timestamp < cutoff_timestamp)
        
        if camera_id:
            query = query.filter(MediaModel.camera_id == camera_id)
        
        old_media = query.all()
        deleted_count = 0
        
        for media in old_media:
            try:
                file_path = media.path
                
                # Delete database record
                db.delete(media)
                
                # Delete physical file if requested
                if delete_files and file_path and os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except OSError as e:
                        logger.warning(f"Could not delete old media file {file_path}: {str(e)}")
                
                deleted_count += 1
                
            except Exception as e:
                logger.error(f"Error deleting old media {media.id}: {str(e)}")
                continue
        
        if deleted_count > 0:
            db.commit()
            logger.info(f"Cleaned up {deleted_count} old media records")
        
        return deleted_count
    
    async def get_file_content(self, media_id: int, db: Session) -> bytes:
        """
        Get media file content
        
        Args:
            media_id: Media ID
            db: Database session
            
        Returns:
            File content as bytes
            
        Raises:
            MediaNotFoundError: If media or file not found
        """
        media = await self.get_media_by_id(db, media_id)
        
        if not os.path.exists(media.path):
            raise MediaNotFoundError(f"Media file not found at path: {media.path}")
        
        try:
            with open(media.path, 'rb') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Error reading media file {media.path}: {str(e)}")
            raise MediaStorageError(f"Failed to read media file: {str(e)}")
    
    async def _store_file_content(
        self,
        content: bytes,
        media_type: MediaType,
        camera_id: int
    ) -> Path:
        """
        Store file content to disk
        
        Args:
            content: File content bytes
            media_type: Type of media
            camera_id: Camera ID
            
        Returns:
            Path where file was stored
            
        Raises:
            MediaStorageError: If storage fails
        """
        try:
            # Create filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            filename = f"camera_{camera_id}_{timestamp}"
            
            # Add appropriate extension based on media type
            extensions = {
                MediaType.IMAGE: ".jpg",
                MediaType.VIDEO: ".mp4",
                MediaType.AUDIO: ".wav",
                MediaType.THUMBNAIL: ".jpg"
            }
            filename += extensions.get(media_type, ".bin")
            
            # Create full path
            file_path = self.media_storage_path / media_type.value / filename
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write content to file
            with open(file_path, 'wb') as f:
                f.write(content)
            
            logger.info(f"Stored media file: {file_path}")
            return file_path
            
        except Exception as e:
            logger.error(f"Error storing media file: {str(e)}")
            raise MediaStorageError(f"Failed to store media file: {str(e)}")

media_service = MediaService()

# Custom exceptions
class MediaNotFoundError(Exception):
    """Raised when media is not found"""
    pass


class MediaStorageError(Exception):
    """Raised when media storage operations fail"""
    pass


class InvalidMediaError(Exception):
    """Raised when media data is invalid"""
    pass