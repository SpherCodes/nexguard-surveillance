import { cameraFormSchema } from '@/lib/utils';
import z from 'zod';

/* eslint-disable @typescript-eslint/no-unused-vars */

interface WebRTCConnection {
  peerConnection: RTCPeerConnection | null;
  websocket: WebSocket | null;
  stream: MediaStream | null;
  connectionState: 'connecting' | 'connected' | 'failed' | 'closed';
  lastError?: Error;
}

interface WebRTCConfig {
  stunServer: string;
  apiUrl: string;
  signalingPath: string;
  connectionTimeout: number;
  streamTimeout: number;
  iceGatheringTimeout: number;
}
interface Camera {
  camera_id: string;
  name?: string;
  location?: string;
  status: 'online' | 'offline' | 'recording';
  enabled: boolean;
  fps: number;
  resolution: [number, number];
  videoUrl?: string;
  zoneId?: number;
}

interface SystemInfrenceSettings {
  model: string;
  min_detection_threshold: number;
}

interface SystemStorageSettings {
  storageType: 'local' | 'cloud';
  retentionDays: number;
}

interface FeedProps {
  alertEvent: DetectionEvent;
}

type DetectionEvent = {
  id: string;
  cameraId: string;
  type: string;
  timestamp: string;
  description?: string;
  thumbnailImg: string;
  confidence: GLfloat;
  thumbnail?: string;
};

declare interface Zone {
  id: number;
  name: string;
}

type CameraFormData = z.infer<typeof cameraFormSchema>;

interface CameraFormProps {
  initialData?: Camera | null;
  zones: Zone[];
  onSubmit: (data: CameraFormData, id?: string) => void;
  onDelete?: (id: string) => void;
  onCreateZone: (zoneName: string) => Promise<Zone>;
}

interface InfrenceFormProps {
  initialData: SystemInfrenceSettings;
  onSave: (data: SystemInfrenceSettings) => void;
  isLoading?: boolean;
}

interface StorageFormProps {
  initialData: SystemStorageSettings;
  onSave: (data: SystemStorageSettings) => void;
  isLoading?: boolean;
}

interface UserFormProps {
  initialData?: {
    username: string;
    role: 'admin' | 'user';
  };
  onSave: (data: { username: string; role: 'admin' | 'user' }) => void;
}

interface CameraSettingsProps {
  cameras: Camera[];
}

export type {
  Camera,
  CameraFormData,
  CameraFormProps,
  InfrenceFormProps,
  FeedProps,
  DetectionEvent,
  Zone,
  CameraSettingsProps,
  SystemInfrenceSettings,
  SystemStorageSettings,
  StorageFormProps,
  WebRTCConfig,
  WebRTCConnection,
};
