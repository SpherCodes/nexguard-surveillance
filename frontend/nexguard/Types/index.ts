/* eslint-disable @typescript-eslint/no-unused-vars */
declare interface Camera {
  camera_id: string;
  name?: string;
  location?: string;
  status: 'online' | 'offline' | 'recording' | 'running';
  enabled: boolean;
  fps: number;
  resolution: [number, number];
  videoUrl?: string;
  zoneId?: number;
}

declare interface NormalizedCamera {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'recording';
  videoUrl?: string;
  lastSeen?: string;
  resolution?: string;
  fps?: number;
}

declare interface FeedProps{
  alertEvent: DetectionEvent;
}

declare type DetectionEvent =  {
  id: string;
  cameraId: string;
  type: string;
  timestamp: string;
  description?: string;
  thumbnailImg: string;
  confidence: GLfloat;
}

declare interface Zone {
  id: string;
  name: string;
}