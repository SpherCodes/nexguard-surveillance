import { cameraFormSchema } from "@/lib/utils";
import z from "zod";

/* eslint-disable @typescript-eslint/no-unused-vars */
declare interface Camera {
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
  thumbnail?: string;
}

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

export { type Camera, type CameraFormData, type CameraFormProps , type FeedProps, type DetectionEvent, type Zone };
