'use client'
import React, { useEffect, useRef } from 'react';
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

  const videoSrc = `${API_BASE_URL}/api/v1/detections/media/video/${id}`;

  useEffect(() => {
    console.log(`VideoPlayer: Attempting to load video for detection ID: ${id}`);
    console.log(`VideoPlayer: Video source URL: ${videoSrc}`);
    
    if (videoRef.current && !playerRef.current) {
      playerRef.current = videojs(videoRef.current, {
        controls: true,
        preload: 'auto',
        fluid: true,
        autoplay: false,
        sources: [
          {
            src: videoSrc,
            type: 'video/mp4',
          },
        ],
      });

      // Add error handling
      playerRef.current.on('error', () => {
        const error = playerRef.current?.error();
        console.error('VideoJS Error:', error);
        console.error(`Error code: ${error?.code}, Message: ${error?.message}`);
        console.error(`Failed to load video from: ${videoSrc}`);
      });

      playerRef.current.on('loadstart', () => {
        console.log('VideoJS: Started loading video');
      });

      playerRef.current.on('loadeddata', () => {
        console.log('VideoJS: Video data loaded successfully');
      });

    } else if (playerRef.current) {
      console.log(`VideoPlayer: Updating existing player with new source: ${videoSrc}`);
      playerRef.current.src({ src: videoSrc, type: 'video/mp4' });
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [id, videoSrc]);

  return (
    <div data-vjs-player>
      <video ref={videoRef} className="video-js vjs-big-play-centered" />
    </div>
  );
};

export default VideoPlayer;
