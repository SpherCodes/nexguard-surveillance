'use client'
import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

type VideoJsPlayer = ReturnType<typeof videojs>;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface VideoPlayerProps {
  id: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ id }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<VideoJsPlayer | null>(null);
  const [isElementReady, setIsElementReady] = useState(false);

  const videoSrc = `${API_BASE_URL}/api/v1/detections/media/video/${id}`;

  // Effect to track when the video element is ready
  useEffect(() => {
    setIsElementReady(false);
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
        
        playerRef.current = videojs(videoRef.current, {
          controls: true,
          preload: 'auto',
          fluid: true,
          autoplay: false,
          playerId: playerId,
          sources: [
            {
              src: videoSrc,
              type: 'video/mp4',
            },
          ],
        });
      } catch (error) {
        console.error('Failed to initialize VideoJS:', error);
      }
    };

    initPlayer();

    return () => {
      if (playerRef.current) {
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
    <div data-vjs-player key={id}>
      <video 
        ref={videoRef} 
        className="video-js vjs-big-play-centered"
        key={`video-${id}`}
      />
    </div>
  );
};
export default VideoPlayer;
