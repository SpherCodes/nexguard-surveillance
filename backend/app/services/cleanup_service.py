"""
Cleanup Service - Manages automatic deletion of old detections and media files
based on the retention period configured in storage settings.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..core.models import Detection, Media, StorageSettings
from ..core.database.connection import SessionLocal
from ..Settings import settings

logger = logging.getLogger(__name__)


class CleanupService:
    """Service for cleaning up old detections and their associated media files"""
    
    def __init__(self):
        self.is_running = False
        self.cleanup_task: Optional[asyncio.Task] = None
        self.check_interval = 3600  # Check every hour (in seconds)
        
    async def start(self):
        """Start the cleanup background task"""
        if self.is_running:
            logger.warning("Cleanup service is already running")
            return
            
        self.is_running = True
        self.cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info("✅ Cleanup service started")
        
    async def stop(self):
        """Stop the cleanup background task"""
        self.is_running = False
        if self.cleanup_task:
            self.cleanup_task.cancel()
            try:
                await self.cleanup_task
            except asyncio.CancelledError:
                pass
        logger.info("🛑 Cleanup service stopped")
        
    async def _cleanup_loop(self):
        """Main loop that periodically runs cleanup"""
        while self.is_running:
            try:
                await self._run_cleanup()
                # Wait for the next check interval
                await asyncio.sleep(self.check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")
                # Wait a bit before retrying on error
                await asyncio.sleep(60)
                
    async def _run_cleanup(self):
        """Execute the cleanup process"""
        db = SessionLocal()
        try:
            # Get storage settings
            storage_settings = db.query(StorageSettings).first()
            if not storage_settings:
                logger.warning("No storage settings found, skipping cleanup")
                return
                
            retention_days = storage_settings.retention_days
            if retention_days <= 0:
                logger.info(f"Retention set to {retention_days} days, cleanup disabled")
                return
                
            # Calculate cutoff date
            cutoff_date = datetime.now() - timedelta(days=retention_days)
            cutoff_timestamp = cutoff_date.timestamp()
            
            logger.info(f"🧹 Running cleanup for data older than {retention_days} days (before {cutoff_date})")
            
            # Find old detections
            old_detections = db.query(Detection).filter(
                Detection.timestamp < cutoff_timestamp
            ).all()
            
            if not old_detections:
                logger.info("No old detections to clean up")
                return
                
            detection_count = len(old_detections)
            media_count = 0
            deleted_files_count = 0
            failed_files = []
            
            # Process each old detection
            for detection in old_detections:
                try:
                    # Get associated media files
                    media_files = db.query(Media).filter(
                        Media.detection_id == detection.id
                    ).all()
                    
                    # Delete physical media files
                    for media in media_files:
                        try:
                            # Get absolute path
                            if Path(media.path).is_absolute():
                                file_path = Path(media.path)
                            else:
                                file_path = settings.get_absolute_path(media.path)
                            
                            # Delete file if it exists
                            if file_path.exists():
                                file_path.unlink()
                                deleted_files_count += 1
                                logger.debug(f"Deleted file: {file_path}")
                            else:
                                logger.debug(f"File not found (already deleted?): {file_path}")
                                
                            # Delete database record
                            db.delete(media)
                            media_count += 1
                            
                        except Exception as e:
                            logger.error(f"Failed to delete media file {media.path}: {e}")
                            failed_files.append(str(media.path))
                    
                    # Delete detection record (cascade will handle any remaining media records)
                    db.delete(detection)
                    
                except Exception as e:
                    logger.error(f"Failed to process detection {detection.id}: {e}")
                    continue
            
            # Commit all changes
            db.commit()
            
            # Log summary
            logger.info(
                f"✅ Cleanup complete: "
                f"Removed {detection_count} detections, "
                f"{media_count} media records, "
                f"{deleted_files_count} physical files"
            )
            
            if failed_files:
                logger.warning(f"Failed to delete {len(failed_files)} files: {failed_files[:10]}")
                
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Cleanup failed: {e}")
            raise
        finally:
            db.close()
            
    async def manual_cleanup(self, retention_days: Optional[int] = None) -> dict:
        """
        Manually trigger a cleanup operation
        
        Args:
            retention_days: Override the configured retention period (optional)
            
        Returns:
            Dictionary with cleanup statistics
        """
        db = SessionLocal()
        try:
            # Get storage settings
            storage_settings = db.query(StorageSettings).first()
            if not storage_settings and retention_days is None:
                raise ValueError("No storage settings found and no retention_days provided")
                
            days = retention_days if retention_days is not None else storage_settings.retention_days
            
            if days <= 0:
                return {
                    "success": False,
                    "message": "Retention period must be greater than 0",
                    "detections_removed": 0,
                    "media_removed": 0,
                    "files_deleted": 0
                }
            
            # Calculate cutoff date
            cutoff_date = datetime.now() - timedelta(days=days)
            cutoff_timestamp = cutoff_date.timestamp()
            
            # Find old detections
            old_detections = db.query(Detection).filter(
                Detection.timestamp < cutoff_timestamp
            ).all()
            
            detection_count = len(old_detections)
            media_count = 0
            deleted_files_count = 0
            
            # Process each old detection
            for detection in old_detections:
                media_files = db.query(Media).filter(
                    Media.detection_id == detection.id
                ).all()
                
                for media in media_files:
                    try:
                        if Path(media.path).is_absolute():
                            file_path = Path(media.path)
                        else:
                            file_path = settings.get_absolute_path(media.path)
                        
                        if file_path.exists():
                            file_path.unlink()
                            deleted_files_count += 1
                            
                        db.delete(media)
                        media_count += 1
                    except Exception as e:
                        logger.error(f"Failed to delete media: {e}")
                
                db.delete(detection)
            
            db.commit()
            
            return {
                "success": True,
                "message": f"Cleaned up data older than {days} days",
                "cutoff_date": cutoff_date.isoformat(),
                "detections_removed": detection_count,
                "media_removed": media_count,
                "files_deleted": deleted_files_count
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Manual cleanup failed: {e}")
            raise
        finally:
            db.close()


# Global instance
cleanup_service = CleanupService()
