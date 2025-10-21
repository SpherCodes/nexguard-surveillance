# Lucid AI Class Diagram Prompt for NexGuard Surveillance System

Create a comprehensive UML class diagram for the NexGuard Surveillance System with the following specifications:

## System Overview
NexGuard is a real-time AI-powered surveillance system built with FastAPI (Python) backend and Next.js (TypeScript) frontend. The system performs real-time object detection using YOLO models, manages multiple camera streams, handles media storage, sends push notifications, and provides WebRTC streaming capabilities.

---

## Data Models (Backend - SQLAlchemy ORM)

### 1. Zone
**Attributes:**
- id: Integer (Primary Key, Indexed)
- name: String(100) (Unique, Not Null)
- description: String(500) (Nullable)
- created_at: DateTime

**Relationships:**
- cameras: One-to-Many → Camera (Cascade delete)

---

### 2. Camera
**Attributes:**
- id: Integer (Primary Key, Auto-increment, Unique, Indexed)
- url: String(500) (Not Null)
- name: String(100) (Nullable)
- zone_id: Integer (Foreign Key → zones.id, Indexed)
- location: String(200) (Nullable)
- fps_target: Integer (Default: 15)
- resolution_width: Integer (Default: 640)
- resolution_height: Integer (Default: 480)
- enabled: Boolean (Default: True)
- created_at: DateTime
- last_active: DateTime (Nullable)

**Relationships:**
- zone: Many-to-One → Zone
- detections: One-to-Many → Detection
- media: One-to-Many → Media

---

### 3. Detection
**Attributes:**
- id: Integer (Primary Key, Indexed)
- camera_id: Integer (Foreign Key → cameras.id, Indexed)
- timestamp: Float (Indexed)
- detection_type: String(50) (Indexed)
- confidence: Float
- notified: Boolean (Default: False)
- created_at: DateTime

**Relationships:**
- camera: Many-to-One → Camera
- media: One-to-Many → Media (Cascade delete)

---

### 4. Media
**Attributes:**
- id: Integer (Primary Key, Indexed)
- camera_id: Integer (Foreign Key → cameras.id, Indexed)
- detection_id: Integer (Foreign Key → detections.id, Nullable, Indexed)
- media_type: String(50) (Indexed) [video, image, audio]
- path: String(1000) (Not Null)
- timestamp: Float (Indexed)
- duration: Float (Nullable)
- size_bytes: Integer (Nullable)
- created_at: DateTime

**Relationships:**
- camera: Many-to-One → Camera
- detection: Many-to-One → Detection

---

### 5. User
**Attributes:**
- id: Integer (Primary Key, Indexed)
- firstname: String(50) (Not Null)
- lastname: String(50) (Not Null)
- middlename: String(50) (Nullable)
- username: String(50) (Unique, Indexed, Not Null)
- email: String(100) (Unique, Indexed, Not Null)
- password: String(255) (Not Null, Hashed)
- phone: String(20) (Nullable)
- is_active: Boolean (Default: True)
- last_login: DateTime (Nullable)
- created_at: DateTime
- role: String(20) (Default: "operator") [admin, operator, viewer]
- status: String(20) (Default: "pending") [active, pending, suspended]

**Relationships:**
- preferences: One-to-Many → NotificationPreference

---

### 6. UserDeviceToken
**Attributes:**
- id: Integer (Primary Key, Indexed)
- user_id: Integer (Foreign Key → users.id, Not Null)
- device_token: String(255) (Not Null, Unique)
- device_type: String(50) (Not Null) [ios, android, web]
- device_name: String(100) (Nullable)
- is_active: Boolean (Default: True)
- created_at: DateTime
- updated_at: DateTime

**Relationships:**
- None (references User via foreign key)

---

### 7. NotificationLog
**Attributes:**
- id: Integer (Primary Key, Indexed)
- user_id: Integer (Foreign Key → users.id, Not Null, Default: 1)
- notification_type: String(50) (Not Null) [detection, system, alert]
- title: String(255) (Not Null)
- body: Text (Not Null)
- data: Text (Nullable, JSON)
- sent_at: DateTime
- delivered: Boolean (Default: False)
- read: Boolean (Default: False)
- firebase_message_id: String(255) (Nullable)

**Relationships:**
- None (references User via foreign key)

---

### 8. NotificationPreference
**Attributes:**
- id: Integer (Primary Key, Indexed)
- user_id: Integer (Foreign Key → users.id, Not Null)
- category: String(50) (Not Null) [detections, system_alerts, security_alerts]
- enabled: Boolean (Default: True)
- created_at: DateTime
- updated_at: DateTime

**Relationships:**
- user: Many-to-One → User

---

### 9. InferenceSettings
**Attributes:**
- id: Integer (Primary Key)
- min_detection_threshold: Float (Default: 0.5, Not Null, Indexed)
- model_id: Integer (Foreign Key → ai_models.id, Nullable)

**Relationships:**
- None (references AIModels via foreign key)

---

### 10. AIModels
**Attributes:**
- id: Integer (Primary Key)
- name: String(100) (Unique, Not Null)
- description: String(500) (Nullable)
- path: String(500) (Not Null)

**Relationships:**
- None (referenced by InferenceSettings)

---

### 11. StorageSettings
**Attributes:**
- id: Integer (Primary Key)
- storage_type: String(50) (Default: "local")
- retention_days: Integer (Default: 30)
- updated_at: DateTime

**Relationships:**
- None

---

## Service Layer Classes (Backend)

### 12. CameraService
**Inherits:** CRUDBase[Camera, CameraCreate, CameraUpdate]

**Methods:**
- create(db, camera_data) → Camera
- get_by_id(db, camera_id) → Camera
- get_all(db) → List[Camera]
- update(db, camera_id, camera_data) → Camera
- delete(db, camera_id) → bool
- get_active_cameras(db) → List[Camera]

**Dependencies:**
- Uses: Camera model
- Interacts with: Database session

---

### 13. DetectionService
**Inherits:** CRUDBase[Detection, DetectionCreate, DetectionUpdate]

**Methods:**
- create(db, detection_data) → Detection
- get_by_camera(db, camera_id, limit) → List[Detection]
- get_recent(db, hours) → List[Detection]
- delete_old(db, retention_days) → int
- mark_as_notified(db, detection_id) → Detection

**Dependencies:**
- Uses: Detection model
- Interacts with: Database session, MediaService

---

### 14. MediaService
**Methods:**
- save_video(camera_id, video_path, detection_id) → Media
- save_image(camera_id, image_path, detection_id) → Media
- get_media_by_detection(db, detection_id) → List[Media]
- get_media_by_camera(db, camera_id) → List[Media]
- delete_media(media_id) → bool
- cleanup_old_media(db, retention_days) → int
- get_storage_stats() → Dict

**Exception Classes:**
- MediaNotFoundError
- MediaStorageError
- InvalidMediaError

**Dependencies:**
- Uses: Media model, file system operations
- Interacts with: Database session, storage directories

---

### 15. ZoneService
**Inherits:** CRUDBase[Zone, ZoneCreate, ZoneUpdate]

**Methods:**
- create(db, zone_data) → Zone
- get_by_id(db, zone_id) → Zone
- get_all(db) → List[Zone]
- update(db, zone_id, zone_data) → Zone
- delete(db, zone_id) → bool

**Dependencies:**
- Uses: Zone model
- Interacts with: Database session

---

### 16. AuthService
**Inherits:** CRUDBase[User, UserCreate, UserUpdate]

**Methods:**
- authenticate(db, username, password) → User | None
- create_user(db, user_data) → User
- get_user_by_username(db, username) → User
- get_user_by_email(db, email) → User
- update_last_login(db, user_id) → User
- change_password(db, user_id, new_password) → bool
- verify_token(token) → Dict
- create_access_token(user_id) → str

**Dependencies:**
- Uses: User model, JWT, password hashing (bcrypt/passlib)
- Interacts with: Database session

---

### 17. AlertService
**Attributes:**
- alert_queue: Queue
- notification_preferences: Dict
- firebase_service: FirebaseFCMService

**Methods:**
- send_detection_alert(detection, camera, media) → bool
- send_system_alert(title, body, users) → bool
- queue_notification(notification_data) → None
- process_notification_queue() → None
- get_user_preferences(user_id) → List[NotificationPreference]
- check_notification_enabled(user_id, category) → bool

**Enums:**
- NotificationType: DETECTION, SYSTEM_ALERT, SECURITY_ALERT
- NotificationPriority: LOW, MEDIUM, HIGH, CRITICAL
- Topics: DETECTIONS, SYSTEM_ALERTS, SECURITY_ALERTS

**Dependencies:**
- Uses: NotificationLog, NotificationPreference, UserDeviceToken
- Interacts with: FirebaseFCMService, Database session

---

### 18. CleanupService
**Attributes:**
- db_factory: SessionLocal
- is_running: bool
- cleanup_task: asyncio.Task

**Methods:**
- start() → None (async)
- stop() → None (async)
- _cleanup_loop() → None (async, private)
- _run_cleanup(retention_days) → Dict (async, private)
- manual_cleanup(retention_days) → Dict (async)
- get_status() → Dict

**Dependencies:**
- Uses: Detection, Media, StorageSettings models
- Interacts with: DetectionService, MediaService, Database session

---

### 19. SysConfigService
**Methods:**
- get_inference_settings(db) → InferenceSettings
- update_inference_settings(db, settings) → InferenceSettings
- get_storage_settings(db) → StorageSettings
- update_storage_settings(db, settings) → StorageSettings
- get_ai_models(db) → List[AIModels]
- get_model_by_id(db, model_id) → AIModels

**Dependencies:**
- Uses: InferenceSettings, StorageSettings, AIModels
- Interacts with: Database session

---

## Processing & Stream Management Classes

### 20. YOLOProcessor
**Attributes:**
- model: YOLO
- model_path: str
- confidence_threshold: float
- device: str

**Methods:**
- load_model(model_path) → None
- process_frame(frame) → List[Detection]
- get_model_info() → Dict
- update_confidence_threshold(threshold) → None

**Dependencies:**
- Uses: Ultralytics YOLO library
- Interacts with: InferenceSettings

---

### 21. DetectionEventManager
**Attributes:**
- storage_path: Path
- events: List
- alert_service: AlertService
- active_recordings: Dict
- recording_lock: threading.Lock
- video_duration: int
- min_confidence: float
- detection_cooldown: int
- enable_alerts: bool
- last_detection_time: Dict
- detection_cache_lock: threading.Lock
- video_capture: VideoCapture
- inference_engine: YOLOProcessor

**Methods:**
- should_record_detection(detection) → bool
- handle_detection(camera_id, frame, detections) → None
- start_recording(camera_id, detection) → None
- stop_recording(camera_id) → None
- save_detection_to_db(camera_id, detection) → Detection
- send_alert(detection, camera, media) → None

**Dependencies:**
- Uses: Detection, Media models
- Interacts with: AlertService, MediaService, DetectionService, VideoCapture

---

### 22. VideoCapture
**Attributes:**
- camera_config: CameraConfig
- cap: cv2.VideoCapture
- is_active: bool
- frame_buffer: Queue
- fps: int

**Methods:**
- start() → None
- stop() → None
- read_frame() → FrameData | None
- get_frame() → np.ndarray | None
- is_opened() → bool
- reconnect() → bool
- get_stats() → Dict

**Dependencies:**
- Uses: CameraConfig, FrameData
- Interacts with: OpenCV (cv2)

---

### 23. CameraConfig
**Attributes:**
- camera_id: int
- url: str
- fps_target: int
- resolution_width: int
- resolution_height: int
- enabled: bool

**Methods:**
- from_camera_model(camera) → CameraConfig (static)
- to_dict() → Dict

---

### 24. FrameData
**Attributes:**
- camera_id: int
- frame: np.ndarray
- timestamp: float
- frame_number: int
- resolution: Tuple[int, int]

**Methods:**
- to_dict() → Dict

---

### 25. RTCSessionManager
**Attributes:**
- sessions: Dict[str, RTCPeerConnection]
- camera_tracks: Dict[int, CameraStreamTrack]

**Methods:**
- create_session(camera_id) → str (async)
- get_session(session_id) → RTCPeerConnection
- close_session(session_id) → None (async)
- create_offer(session_id, sdp) → Dict (async)
- handle_ice_candidate(session_id, candidate) → None (async)

**Dependencies:**
- Uses: CameraStreamTrack
- Interacts with: aiortc library

---

### 26. CameraStreamTrack
**Inherits:** VideoStreamTrack

**Attributes:**
- camera_id: int
- video_capture: VideoCapture
- frame_queue: Queue

**Methods:**
- recv() → VideoFrame (async)
- stop() → None

**Dependencies:**
- Uses: VideoCapture
- Interacts with: aiortc library

---

## Utility Classes

### 27. FirebaseFCMService
**Attributes:**
- credentials: ServiceAccountCredentials
- app: firebase_admin.App

**Methods:**
- initialize() → None
- send_to_device(device_token, notification) → str
- send_to_topic(topic, notification) → str
- subscribe_to_topic(device_token, topic) → bool
- unsubscribe_from_topic(device_token, topic) → bool

**Dependencies:**
- Uses: firebase_admin library
- Interacts with: Firebase Cloud Messaging API

---

## API Route Controllers (FastAPI)

### 28. CameraRouter
**Endpoints:**
- GET /cameras → List[Camera]
- GET /cameras/{id} → Camera
- POST /cameras → Camera
- PUT /cameras/{id} → Camera
- DELETE /cameras/{id} → bool

**Dependencies:**
- Uses: CameraService, Camera schemas

---

### 29. DetectionRouter
**Endpoints:**
- GET /detections → List[Detection]
- GET /detections/{id} → Detection
- GET /detections/camera/{camera_id} → List[Detection]
- DELETE /detections/{id} → bool

**Dependencies:**
- Uses: DetectionService, Detection schemas

---

### 30. MediaRouter
**Endpoints:**
- GET /media → List[Media]
- GET /media/{id} → Media
- GET /media/detection/{detection_id} → List[Media]
- GET /media/stream/{media_id} → StreamingResponse
- DELETE /media/{id} → bool

**Dependencies:**
- Uses: MediaService, Media schemas

---

### 31. AuthRouter
**Endpoints:**
- POST /auth/login → Token
- POST /auth/register → User
- POST /auth/refresh → Token
- GET /auth/me → User
- POST /auth/logout → bool

**Dependencies:**
- Uses: AuthService, User schemas, JWT

---

### 32. NotificationRouter
**Endpoints:**
- GET /notifications → List[NotificationLog]
- GET /notifications/{id} → NotificationLog
- PUT /notifications/{id}/read → NotificationLog
- POST /notifications/device-token → UserDeviceToken
- GET /notifications/preferences → List[NotificationPreference]
- PUT /notifications/preferences → List[NotificationPreference]

**Dependencies:**
- Uses: AlertService, NotificationLog, NotificationPreference schemas

---

### 33. SystemRouter
**Endpoints:**
- GET /system/inference → InferenceSettings
- PUT /system/inference → InferenceSettings
- GET /system/storage → StorageSettings
- PUT /system/storage → StorageSettings
- GET /system/models → List[AIModels]
- POST /system/cleanup/manual → CleanupResult
- GET /system/cleanup/status → CleanupStatus

**Dependencies:**
- Uses: SysConfigService, CleanupService

---

### 34. ZoneRouter
**Endpoints:**
- GET /zones → List[Zone]
- GET /zones/{id} → Zone
- POST /zones → Zone
- PUT /zones/{id} → Zone
- DELETE /zones/{id} → bool

**Dependencies:**
- Uses: ZoneService, Zone schemas

---

### 35. WebRTCRouter
**Endpoints:**
- POST /webrtc/offer → Answer
- POST /webrtc/ice → bool
- DELETE /webrtc/session/{id} → bool

**Dependencies:**
- Uses: RTCSessionManager

---

### 36. InferenceRouter
**Endpoints:**
- POST /inference/detect → List[Detection]
- GET /inference/status → Dict

**Dependencies:**
- Uses: YOLOProcessor, DetectionEventManager

---

## Diagram Layout Instructions

**Organization:**
1. **Top Section:** Data Models (Zone, Camera, Detection, Media, User, UserDeviceToken, NotificationLog, NotificationPreference, InferenceSettings, AIModels, StorageSettings)

2. **Middle-Left Section:** Service Layer (CameraService, DetectionService, MediaService, ZoneService, AuthService, AlertService, CleanupService, SysConfigService)

3. **Middle-Right Section:** Processing & Streaming (YOLOProcessor, DetectionEventManager, VideoCapture, CameraConfig, FrameData, RTCSessionManager, CameraStreamTrack, FirebaseFCMService)

4. **Bottom Section:** API Routers (CameraRouter, DetectionRouter, MediaRouter, AuthRouter, NotificationRouter, SystemRouter, ZoneRouter, WebRTCRouter, InferenceRouter)

**Visual Guidelines:**
- Use different colors for: Models (blue), Services (green), Processing (purple), APIs (orange), Utilities (yellow)
- Show all relationships with proper cardinality (1-to-many, many-to-one, etc.)
- Include inheritance arrows for CRUDBase classes
- Show dependencies with dashed lines
- Group related classes together
- Use stereotypes: «entity», «service», «controller», «utility»

**Additional Notes:**
- All datetime fields use UTC timezone
- Password fields are hashed using bcrypt
- JWT tokens are used for authentication
- Foreign keys maintain referential integrity
- Cascade deletes are specified where appropriate
- The system uses async/await for I/O operations
- Real-time streaming uses WebRTC protocol
- Push notifications use Firebase Cloud Messaging

---

Please create a clean, professional UML class diagram with clear relationships, proper cardinality notation, and well-organized sections as specified above.
