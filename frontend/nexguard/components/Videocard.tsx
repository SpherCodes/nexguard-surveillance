import { Wifi, MoreHorizontal, AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react';
import React from 'react';
import { Camera } from '@/Types';
import { webRTCManager } from '@/lib/services/webrtc_manager';

//TODO: Figure how to handle video streams better,
//the video should not drop when the user switches to a new view


const Videocard = ({ camera, compact = false, autoPause = true }: { camera: Camera, compact?: boolean, autoPause?: boolean }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
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
      if(!camera.enabled || !camera.cameraId) return;
      try{
        const stream = await webRTCManager.getStream(camera.cameraId);
        if(!stream || isCancelled) return;

        if(videoElement){
          videoElement.srcObject = stream;
          videoElement.onloadedmetadata = () => {
            videoElement.play();
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

  // Auto pause/play when offscreen to reduce CPU usage
  useEffect(() => {
    if (!autoPause) return;
    const node = containerRef.current;
    const video = videoRef.current;
    if (!node || !video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const visible = entry.isIntersecting && entry.intersectionRatio > 0;
        setIsVisible(visible);
        if (visible) {
          video.play().catch(() => {/* ignore */});
        } else {
          try { video.pause(); } catch { /* ignore */ }
        }
      },
      { threshold: [0, 0.01, 0.25] }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [autoPause]);

  return (
    <div ref={containerRef} className={`group relative aspect-video w-full overflow-hidden ${compact ? 'rounded-lg shadow-md' : 'rounded-xl shadow-lg'} hover:shadow-xl transition-shadow duration-300`}>
      {/* Video/Image Background */}
        <div className="flex h-full w-full items-center justify-center bg-gray-900">
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

      {/* Enhanced Gradient Overlay for Better Text Readability */}
      <div className={`absolute inset-0 ${compact ? 'bg-gradient-to-t from-black/70 via-black/10 to-black/5' : 'bg-gradient-to-t from-black/80 via-black/20 to-black/10'}`} />
      
      {/* Top Status Indicators */}
      <div className={`absolute top-2 sm:top-3 left-2 sm:left-3 flex items-center gap-2 ${compact ? 'scale-95' : ''}`}>
        <div className={`flex items-center gap-1 rounded-full ${camera.enabled ? 'bg-green-500/90' : 'bg-red-500/90'} p-1 sm:p-1.5 backdrop-blur-sm`}>
          {camera.enabled ? (
            <Wifi className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
          ) : (
            <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
          )}
        </div>
        <div className="flex items-center gap-1 rounded-full bg-blue-500/90 px-2 py-1 sm:py-1.5 backdrop-blur-sm">
          <span className="text-[10px] sm:text-xs font-bold text-white">{compact ? 'SD' : 'HD'}</span>
        </div>
      </div>
      
      {/* Enhanced Options Menu Button */}
      {!compact && (
        <button className="absolute right-2 sm:right-3 top-2 sm:top-3 rounded-full bg-black/40 p-1.5 sm:p-2 backdrop-blur-sm transition-all duration-200 hover:bg-black/60 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50">
          <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
        </button>
      )}

      {/* Enhanced Bottom Information Panel */}
      <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 right-2 sm:right-3">
        <div className={`rounded-lg bg-black/50 backdrop-blur-sm ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2 sm:px-4 sm:py-3'} border border-white/10`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-bold text-white truncate pr-2 ${compact ? 'text-[11px] sm:text-sm' : 'text-sm sm:text-base'}`}>{camera.name}</p>
              {!compact && (
                <p className="text-xs sm:text-sm text-gray-200 opacity-90">{timestamp}</p>
              )}
            </div>
            <div className="flex-shrink-0">
              <div className={`rounded-full ${camera.enabled ? 'bg-green-400' : 'bg-red-400'} ${compact ? 'h-1.5 w-1.5 sm:h-2 sm:w-2' : 'h-2 w-2 sm:h-2.5 sm:w-2.5'} ${isVisible ? 'animate-pulse' : ''}`}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Touch-friendly overlay for mobile interactions */}
      <div className="absolute inset-0 sm:hidden" />

      {/* Offline/Disabled Banner */}
      {!camera.enabled && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center  rounded-xl">
          <span className="text-xs sm:text-sm font-semibold text-white">Camera disabled</span>
        </div>
      )}
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