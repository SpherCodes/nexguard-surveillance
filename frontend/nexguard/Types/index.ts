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
  lastSeen?: string;
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
