# NexGuard Media Storage Configuration

## Overview
All media files (images, videos, audio, thumbnails) are now stored in the `backend/storage` directory with the following structure:

```
backend/storage/
├── images/     # Camera capture images and detection snapshots
├── videos/     # Recorded video files
├── audio/      # Audio recordings
└── thumbnails/ # Video thumbnail images
```

## Configuration

### Development Environment
- Media files stored in: `backend/storage/`
- Database files stored in: `backend/app/data/database/`
- Model files stored in: `backend/app/data/models/`

### Docker Environment
- Host directory `./backend/storage` maps to container `/app/storage`
- Host directory `./backend/app/data` maps to container `/app/data`
- Environment variables set storage paths inside container

## Environment Variables

### Storage Paths
- `STORAGE_DIR`: Base directory for media storage (default: `./storage`)
- `DATA_DIR`: Base directory for application data (default: `./data`)

### Database
- `DATABASE_URL`: Database connection string
  - Development: `sqlite:///./data/database/nexguard.db`
  - Production: `postgresql://user:pass@host:port/db`

## Docker Volume Mounts

The docker-compose.yml includes these volume mounts:
```yaml
volumes:
  - ./backend/storage:/app/storage  # Media files
  - ./backend/app/data:/app/data    # Database and models
```

## MediaService Configuration

The `MediaService` class automatically:
1. Creates storage directories if they don't exist
2. Organizes files by media type (image, video, audio, thumbnail)
3. Generates timestamped filenames with camera ID
4. Uses the configured storage path from Settings

## File Organization

Media files are stored with this naming pattern:
```
{media_type}/camera_{camera_id}_{timestamp}.{extension}
```

Example:
```
storage/
├── images/camera_1_20240108_143052_123456.jpg
├── videos/camera_1_20240108_143100_789012.mp4
└── thumbnails/camera_1_20240108_143100_789012.jpg
```

## Migration from Previous Storage

If you have existing media files in other locations:
1. Move files to the new `backend/storage` structure
2. Update database records to reflect new paths
3. Ensure proper permissions are set on storage directories

## Backup Considerations

For production deployments:
- Include `backend/storage` in backup routines
- Consider separate volume mounts for high-frequency media storage
- Monitor disk space usage as media files can grow large over time
