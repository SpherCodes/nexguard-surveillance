# Automatic Cleanup Service

## Overview

The Cleanup Service automatically removes old detection records and their associated media files based on the retention period configured in the storage settings. This helps manage disk space and keeps the database performant.

## Features

- **Automatic Cleanup**: Runs every hour to check for and remove old data
- **Manual Cleanup**: Administrators can trigger cleanup on-demand
- **Configurable Retention**: Set retention period from 7 to 30+ days
- **Safe Deletion**: Only removes data older than the configured retention period
- **File System Cleanup**: Removes both database records and physical media files
- **Background Operation**: Runs asynchronously without affecting system performance

## How It Works

### Automatic Cleanup

The service runs in the background and checks every hour (3600 seconds) for:
1. Detections older than the retention period
2. Associated media files (images, videos, audio)
3. Physical files on disk

When old data is found, it:
1. Deletes physical media files from storage
2. Removes media database records
3. Removes detection database records
4. Logs the cleanup statistics

### Retention Period

The retention period is configured in **Settings > System & AI > Video Storage**:

- **7 Days**: Keep videos for one week
- **14 Days**: Keep videos for two weeks  
- **30 Days**: Keep videos for one month (default)

Videos and detections older than this period will be automatically deleted.

## API Endpoints

### Manual Cleanup

Trigger a cleanup operation immediately:

```http
POST /api/v1/system/cleanup/manual
```

**Query Parameters:**
- `retention_days` (optional): Override the configured retention period

**Response:**
```json
{
  "success": true,
  "message": "Cleaned up data older than 30 days",
  "cutoff_date": "2025-09-07T10:30:00",
  "detections_removed": 150,
  "media_removed": 450,
  "files_deleted": 430
}
```

### Cleanup Status

Check if the cleanup service is running:

```http
GET /api/v1/system/cleanup/status
```

**Response:**
```json
{
  "is_running": true,
  "check_interval_seconds": 3600,
  "check_interval_hours": 1.0
}
```

## Frontend Integration

### Manual Cleanup Button

In the Storage Settings form, users can:
1. Set the retention period
2. Click "Clean Up Now" to immediately remove old data
3. See a confirmation dialog before cleanup
4. Receive a notification with cleanup statistics

### Usage

1. Navigate to **Settings > System & AI > Video Storage**
2. Scroll to "Clean Up Old Data Now" section
3. Review the retention period
4. Click "Clean Up Now"
5. Confirm the action
6. Wait for the cleanup to complete

## Configuration

### Adjust Check Interval

To change how often the cleanup runs, modify the `check_interval` in `cleanup_service.py`:

```python
self.check_interval = 3600  # Check every hour (in seconds)
```

Common intervals:
- Every 30 minutes: `1800`
- Every hour: `3600` (default)
- Every 6 hours: `21600`
- Daily: `86400`

### Disable Automatic Cleanup

Set retention days to `0` or negative value to disable automatic cleanup while keeping manual cleanup available.

## Logging

The service logs all cleanup operations:

```
INFO: 🧹 Running cleanup for data older than 30 days (before 2025-09-07 10:30:00)
INFO: ✅ Cleanup complete: Removed 150 detections, 450 media records, 430 physical files
```

Failed operations are also logged:
```
ERROR: Failed to delete media file /path/to/file.mp4: Permission denied
WARNING: Failed to delete 5 files: ['/path/file1.mp4', ...]
```

## Safety Features

1. **Timestamp-Based**: Only removes data older than the cutoff date
2. **Transaction-Based**: Database changes are rolled back if errors occur  
3. **Confirmation Required**: Manual cleanup requires user confirmation
4. **Detailed Logging**: All operations are logged for audit trail
5. **Graceful Degradation**: Continues cleanup even if individual files fail

## Monitoring

Monitor cleanup effectiveness by:

1. Checking application logs for cleanup statistics
2. Using the `/api/v1/system/cleanup/status` endpoint
3. Monitoring disk space usage over time
4. Reviewing cleanup notifications in the UI

## Troubleshooting

### Cleanup Not Running

- Check logs for errors during service startup
- Verify retention days is greater than 0
- Ensure the service started: Look for "✅ Cleanup service started" in logs

### Files Not Being Deleted

- Check file permissions on storage directories
- Verify paths are correct in database records
- Review error logs for specific file deletion failures

### Database Records Remain

- Check for foreign key constraints
- Verify cascade delete is configured on relationships
- Review transaction rollback logs

## Performance Considerations

- Cleanup runs in background thread (doesn't block requests)
- Large deletions may take several minutes
- Database commits are batched per detection
- File I/O is the slowest operation

For large installations with millions of records, consider:
- Running manual cleanup during off-peak hours
- Adjusting retention period to reduce data volume
- Adding database indexes on timestamp columns

## Future Enhancements

Potential improvements:
- [ ] Configurable check interval from UI
- [ ] Email notifications for cleanup results
- [ ] Disk space threshold alerts
- [ ] Selective cleanup (by camera or zone)
- [ ] Archive to cloud storage before deletion
- [ ] Cleanup scheduling (specific times/days)
