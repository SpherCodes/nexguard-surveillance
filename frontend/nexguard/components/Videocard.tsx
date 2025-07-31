import { Wifi, MoreHorizontal } from 'lucide-react'
import { connectToWebRtcStream } from '@/lib/services/webrtc_service';
import { useEffect } from 'react';
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Camera } from '@/Types';
import { webRTCManager } from '@/lib/services/webrtc_manager';

//TODO:Bug: The video stream drops when the first time when trying to connect to the backend.
//TODO: Figure how to handle video streams better,
//TODO: Change camera_id -> CameraId in the Camera interface
//the video should not drop when the user switches to a new view


const Videocard = ({ camera }: { camera: Camera }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const queryClient = useQueryClient();
  const timestamp = new Date().toLocaleString('en-US', { 
    month: '2-digit', 
    day: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  }).replace(',', '');

useEffect(() => {
    const videoElement = videoRef.current;
    let isCancelled = false;

    const init = async () => {
      console.log(`Initializing video stream for camera ${camera.cameraId}`);
      if(!camera.enabled || !camera.cameraId) return;
      try{
        const stream = await webRTCManager.getStream(camera.cameraId);
        if(!stream || isCancelled) return;

        if(videoElement){
          videoElement.srcObject = stream;
          videoElement.onloadedmetadata = () => {
            videoElement.play()
              .then(() => updateCameraStatusInCache(camera.cameraId, 'online'))
              .catch(() => {
                if (camera.status !== 'offline') {
                  updateCameraStatusInCache(camera.cameraId, 'offline');
                }
              });
          }
        }
      }
      catch(err){
        console.error('WebRTC connection error:', err);
      }
    }
    init();

    return () => {
      isCancelled = true;
      if(videoElement){
        videoElement.srcObject = null;
      }
    }
  }, [camera.cameraId, camera.enabled, camera.status]);

  const updateCameraStatusInCache = (cameraId: number, status: 'online' | 'offline') => {
  queryClient.setQueryData<Camera[]>(['cameras'], (prev) =>
    prev?.map((cam) => {
      if (cam.cameraId === cameraId) {
        console.log(`Updated camera ${cameraId} status to ${status}`);
        return { ...cam, status };
      }
      return cam;
    }) || []
  );
};

  return (
    <div className="group relative aspect-video w-full overflow-hidden rounded-xl shadow-lg">
      {/* Video/Image Background */}
      {/* {camera.thumbnail_url ? (
        <Image
          src={camera.thumbnail_url}
          alt={`View of ${camera.name}`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : ( */}
        <div className="flex h-full w-full items-center justify-center bg-gray-800">
          <video
            width="500"
            height="250"
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted={true}
            playsInline
          />
        </div>
      {/* )} */}

      {/* Gradient Overlay for Text Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      
      {/* Top Icons */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-full bg-black/30 p-1.5 backdrop-blur-sm">
          <Wifi className="h-3 w-3 text-white" />
        </div>
        <div className="flex items-center gap-1 rounded-full bg-black/30 px-2 py-1.5 backdrop-blur-sm">
          <span className="text-xs font-semibold text-white">HD</span>
        </div>
      </div>
      
      {/* Options Menu Icon */}
      <button className="absolute right-3 top-3 rounded-full bg-black/30 p-1.5 backdrop-blur-sm transition-colors hover:bg-black/50">
        <MoreHorizontal className="h-4 w-4 text-white" />
      </button>

      {/* Bottom Information */}
      <div className="absolute bottom-3 left-3 rounded-lg bg-black/30 px-2 py-1 backdrop-blur-sm">
        <p className="text-sm font-semibold text-white">{camera.name}</p>
        <p className="text-xs text-gray-300">{timestamp}</p>
      </div>
    </div>
  )
}

// --- Skeleton Component for Loading State ---
export const CameraGridSkeleton = () => {
  return (
    <>
      <div className="mb-4 h-8 w-1/4 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-video w-full animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
    </>
  )
}
export default Videocard;