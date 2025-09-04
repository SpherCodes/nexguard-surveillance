import { cameraFormSchema } from '@/lib/utils';
import z from 'zod';

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
  cameraId: number;
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
  timestamp: Date;
  description?: string;
  confidence: GLfloat;
  image_media?: DetectionImageMedia[];
};

type DetectionImageMedia = {
  cameraId: number;
  detectionId: number;
  imageData: string;
  createdAt: Date;
};

declare interface Zone {
  id: number;
  name: string;
}

type CameraFormData = z.infer<typeof cameraFormSchema>;

interface CameraFormProps {
  initialData?: Camera | null;
  zones: Zone[];
  onSubmit: (data: CameraFormData, id?: number) => void;
  onDelete?: () => void;
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

interface signInProps {
  email: string;
  password: string;
}

interface SignUpProps {
  userName: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  password: string;
  email?: string;
  phoneNumber?: string;
  acceptTerms?: boolean;
}

export interface User {
  id?: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  role?: 'operator' | 'admin' | 'super_admin';
  status?: 'pending' | 'approved' | 'suspended' | 'rejected';
}
export interface AuthError {
  detail: string;
  status_code?: number;
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
  signInProps,
  SignUpProps,
  UserFormProps
};
