import { Wifi, MoreHorizontal } from 'lucide-react'
import { connectToWebRtcStream } from '@/lib/services/webrtc';
import { useEffect } from 'react';
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Camera } from '@/Types';

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

    if (!camera) {
      console.error('No camera object provided');
      return;
    }

    if (!camera.camera_id) {
      console.error('Camera ID is missing or empty:', camera);
      return;
    }

    // Only attempt to connect if camera is enabled and not offline
    if (camera.enabled) {
      let connectionAttempts = 0;
      const maxConnectionAttempts = 3;
      let connectionTimer: NodeJS.Timeout;
      
      const initWebRTC = async () => {
        try {
          
          // Clear any existing connection timer
          if (connectionTimer) clearTimeout(connectionTimer);
          
          // Set a connection timeout
          connectionTimer = setTimeout(() => {
            console.error(`Connection timeout for camera ${camera.camera_id}`);
          }, 15000); // 15 seconds timeout
          
          // Convert camera.camera_id to string if it's not already
          const cameraId = String(camera.camera_id);
          const mediaStream = await connectToWebRtcStream(cameraId);

          clearTimeout(connectionTimer);
          
          if (!mediaStream) {
            throw new Error('No media stream received');
          }
          
          // Check if the stream has tracks
          if (mediaStream.getTracks().length === 0) {
            console.warn('Media stream has no tracks');
            // Wait a bit to see if tracks arrive late
            await new Promise(resolve => setTimeout(resolve, 2000));
            if (mediaStream.getTracks().length === 0) {
              throw new Error('Media stream has no tracks after waiting');
            }
          }

          if (videoRef.current) {
            // Make sure to directly set the srcObject
            videoRef.current.srcObject = mediaStream;
            
            // Add event listeners to confirm video is playing
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play()
                .then(() => {
                  if (camera.status !== 'online') {
                  updateCameraStatusInCache(camera.camera_id, 'online');
                    console.log(`Camera is now online:`, JSON.stringify(camera, null, 2));
                }
                })
                .catch(() => {
                  if (camera.status !== 'offline') {
                    updateCameraStatusInCache(camera.camera_id, 'offline');
                  }
                });
            };
            
            videoRef.current.onerror = (err) => {
              if (camera.status !== 'offline') {
                  updateCameraStatusInCache(camera.camera_id, 'offline');
                }
              console.error("Video element error:", err);
            };
          } else {
            throw new Error('Video reference is not available');
          }
        } catch (error) {
          console.error('Error connecting to WebRTC stream:', error);
          clearTimeout(connectionTimer);
          
          // Try reconnecting if we haven't reached max attempts
          if (connectionAttempts < maxConnectionAttempts) {
            connectionAttempts++;
            console.log(`Retrying connection (${connectionAttempts}/${maxConnectionAttempts})`);
            setTimeout(initWebRTC, 3000); // Wait 3 seconds before retry
          }
        }
      };
      
      initWebRTC();
      
      // Cleanup function
      return () => {
        if (connectionTimer) clearTimeout(connectionTimer);
        
        if (videoElement && videoElement.srcObject) {
          const mediaStream = videoElement.srcObject as MediaStream;
          mediaStream.getTracks().forEach(track => {
            track.stop();
            console.log(`Stopped track: ${track.kind}`);
          });
          // Clear the srcObject
          videoElement.srcObject = null;
        }
      };
    }
    
  }, [camera?.camera_id, camera?.status, camera?.enabled])

  const updateCameraStatusInCache = (cameraId: string, status: 'online' | 'offline') => {
  queryClient.setQueryData<Camera[]>(['cameras'], (prev) =>
    prev?.map((cam) => {
      if (cam.camera_id === cameraId) {
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

// You might need to export Videocard if it's not the default export
export default Videocard;