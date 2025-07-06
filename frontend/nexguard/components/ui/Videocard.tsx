'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Settings,
  Wifi,
  WifiOff,
  Circle
} from 'lucide-react'
import { connectToWebRtcStream } from '@/lib/services/webrtc'

const Videocard = ({ camera }: { camera: Camera }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [showControls, setShowControls] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'recording': return 'bg-red-500 animate-pulse'
      case 'offline': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <Wifi className="h-4 w-4 text-green-500" />
      case 'recording': return <Circle className="h-4 w-4 text-red-500 fill-current animate-pulse" />
      case 'offline': return <WifiOff className="h-4 w-4 text-gray-400" />
      default: return <WifiOff className="h-4 w-4 text-gray-400" />
    }
  }

  useEffect(() => {
    // Only attempt to connect if camera is not offline
    if (camera.status !== 'offline') {
      const initWebRTC = async () => {
        try {
          setConnectionStatus('connecting');
          const mediaStream = await connectToWebRtcStream(camera.id);

          if (mediaStream && videoRef.current) {
            // Make sure to directly set the srcObject
            videoRef.current.srcObject = mediaStream;
            
            // Add event listeners to confirm video is playing
            videoRef.current.onloadedmetadata = () => {
              console.log("Video metadata loaded, playing...");
              videoRef.current?.play()
                .then(() => {
                  console.log("Video playback started successfully");
                  setIsPlaying(true);
                  setConnectionStatus('connected');
                })
                .catch(err => {
                  console.error("Error playing video:", err);
                  setConnectionStatus('disconnected');
                });
            };
            
            // Add error handler for video element
            videoRef.current.onerror = (err) => {
              console.error("Video element error:", err);
              setConnectionStatus('disconnected');
            };
          } else {
            console.error('Failed to connect: No media stream available');
            setConnectionStatus('disconnected');
          }
        } catch (error) {
          console.error('Error connecting to WebRTC stream:', error);
          setConnectionStatus('disconnected');
        }
      };
      
      initWebRTC();
      
      // Cleanup function
      return () => {
        if (videoRef.current && videoRef.current.srcObject) {
          const mediaStream = videoRef.current.srcObject as MediaStream;
          mediaStream.getTracks().forEach(track => track.stop());
          // Clear the srcObject
          videoRef.current.srcObject = null;
        }
      };
    }
  }, [camera.id, camera.status])

  return (
    <div 
      className="relative bg-black rounded-lg overflow-hidden aspect-video group cursor-pointer shadow-md"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video Element */}
      <video
        width="500"
        height="250"
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        muted={isMuted}
        playsInline
      />

      {/* Placeholder Background (shown while video loads or if offline) */}
      {(connectionStatus !== 'connected' || camera.status === 'offline') && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">📹</div>
            <div className="text-lg font-semibold">{camera.name}</div>
            <div className="text-sm opacity-75">{camera.location}</div>
            {connectionStatus === 'connecting' && camera.status !== 'offline' && (
              <div className="mt-4 flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                <span>Connecting...</span>
              </div>
            )}
            {connectionStatus === 'disconnected' && (
              <div className="mt-4 text-red-400">Connection failed</div>
            )}
            {camera.status === 'offline' && (
              <div className="mt-4 text-gray-400">Camera offline</div>
            )}
          </div>
        </div>
      )}

      {/* Camera Info Overlay - Top */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex items-start justify-between">
          <div className="text-white">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold">{camera.name}</h3>
              {getStatusIcon(camera.status)}
            </div>
            <p className="text-sm opacity-90">{camera.location}</p>
            <p className="text-xs opacity-75">{camera.lastSeen}</p>
          </div>
          <div className="flex items-center space-x-1">
            <span className={`h-2 w-2 rounded-full ${getStatusColor(camera.status)}`}></span>
            <span className="text-xs text-white/90 uppercase font-medium">
              {camera.status}
            </span>
          </div>
        </div>
      </div>

      {/* Video Controls - Bottom (only shown when connected) */}
      {camera.status !== 'offline' && connectionStatus === 'connected' && (
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={togglePlay}
                className="text-white hover:text-blue-400 transition-colors p-1 rounded-full hover:bg-white/10"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <button
                onClick={toggleMute}
                className="text-white hover:text-blue-400 transition-colors p-1 rounded-full hover:bg-white/10"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <span className="text-xs text-white/75">
                {camera.resolution} • {camera.fps}fps
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button className="text-white hover:text-blue-400 transition-colors p-1 rounded-full hover:bg-white/10">
                <Settings className="h-4 w-4" />
              </button>
              <button className="text-white hover:text-blue-400 transition-colors p-1 rounded-full hover:bg-white/10">
                <Maximize className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recording Indicator */}
      {camera.status === 'recording' && (
        <div className="absolute top-4 right-4">
          <div className="flex items-center space-x-1 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium">
            <Circle className="h-2 w-2 fill-current animate-pulse" />
            <span>REC</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default Videocard
