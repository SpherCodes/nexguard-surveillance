'use client'
import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import './VideoPlayer.css';
import { cn } from '@/lib/utils';
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react';

type VideoJsPlayer = ReturnType<typeof videojs>;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface VideoPlayerProps {
  id: string;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ id, className }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<VideoJsPlayer | null>(null);
  const [isElementReady, setIsElementReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const videoSrc = `${API_BASE_URL}/api/v1/detections/media/video/${id}`;

  const resetPlayer = () => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    if (playerRef.current) {
      playerRef.current.src(videoSrc);
      playerRef.current.load();
    }
  };

  // Effect to track when the video element is ready
  useEffect(() => {
    setIsElementReady(false);
    setIsLoading(true);
    setHasError(false);
    const checkElement = () => {
      if (videoRef.current && document.contains(videoRef.current)) {
        setIsElementReady(true);
      }
    };

    checkElement();
  }, [id]);

  // Effect to initialize VideoJS when element is ready
  useEffect(() => {
    if (!isElementReady || !videoRef.current) {
      return;
    }

    const handleLoadedData = () => {
      setIsLoading(false);
      setHasError(false);
    };

    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
      setErrorMessage('Failed to load video. The recording may be corrupted or unavailable.');
    };

    const initPlayer = () => {
      if (!videoRef.current || !document.contains(videoRef.current)) {
        console.warn('Video element lost from DOM');
        return;
      }

      // Clear any existing VideoJS data on the element
      if (videoRef.current) {
        videoRef.current.removeAttribute('data-vjs-player');
        const vjsElements = videoRef.current.querySelectorAll('.vjs-tech');
        vjsElements.forEach(el => el.remove());
      }

      try {
        // Create a new player with a unique ID
        const playerId = `video-player-${id}-${Date.now()}`;
        videoRef.current.id = playerId;
        
        const player = videojs(videoRef.current, {
          controls: true,
          preload: 'auto',
          fluid: false,
          responsive: true,
          fill: true,
          autoplay: false,
          playerId: playerId,
          playbackRates: [0.25, 0.5, 1, 1.25, 1.5, 2],
          sources: [
            {
              src: videoSrc,
              type: 'video/mp4',
            },
          ],
        });

        player.on('loadeddata', handleLoadedData);
        player.on('error', handleError);
        player.on('loadstart', () => setIsLoading(true));
        
        playerRef.current = player;
      } catch (error) {
        console.error('Failed to initialize VideoJS:', error);
        handleError();
      }
    };

    initPlayer();

    return () => {
      if (playerRef.current) {
        playerRef.current.off('loadeddata', handleLoadedData);
        playerRef.current.off('error', handleError);
        try {
          playerRef.current.dispose();
        } catch (error) {
          console.warn('Error disposing player in cleanup:', error);
        }
        playerRef.current = null;
      }
    };
  }, [isElementReady, id, videoSrc]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div
      data-vjs-player
      key={id}
      className={cn(
        'relative w-full h-full rounded-2xl border border-gray-200 bg-black/90 shadow-inner overflow-hidden',
        className
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-[1px] z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <p className="text-sm text-white/80">Loading video...</p>
          </div>
        </div>
      )}
      
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 backdrop-blur-[1px] z-10">
          <div className="flex flex-col items-center gap-4 text-center px-6">
            <AlertCircle className="h-12 w-12 text-red-400" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Video unavailable</h3>
              <p className="text-sm text-gray-300 max-w-sm">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={resetPlayer}
              className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      )}

      <video 
        ref={videoRef} 
        className="video-js vjs-big-play-centered h-full w-full"
        key={`video-${id}`}
      />
    </div>
  );
};
export default VideoPlayer;
