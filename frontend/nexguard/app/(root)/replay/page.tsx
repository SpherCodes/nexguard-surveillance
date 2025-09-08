'use client'
import React, { useEffect, useRef, useState, useCallback } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Settings, Maximize2, ChevronLeft } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type VideoJsPlayer = ReturnType<typeof videojs>;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const VideoPlayer = ({ detectionId }: { detectionId: string | null }) => {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<VideoJsPlayer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState('00:00 / 00:00');
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);

    // Simulate loading progress
    useEffect(() => {
        if (isLoading && !hasError) {
            const interval = setInterval(() => {
                setLoadingProgress(prev => {
                    const newProgress = prev + (Math.random() * 5);
                    return newProgress > 90 ? 90 : newProgress;
                });
            }, 200);
            
            return () => clearInterval(interval);
        } else if (!isLoading) {
            setLoadingProgress(100);
        }
    }, [isLoading, hasError]);

    const videoSrc = `${API_BASE_URL}/api/v1/detections/media/video/${detectionId}`;
    
    // Format time helper function
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    const updateTimeDisplay = useCallback(() => {
        if (playerRef.current) {
            const current = formatTime(playerRef.current.currentTime()!);
            const duration = formatTime(playerRef.current.duration() || 0);
            setCurrentTime(`${current} / ${duration}`);
        }
    }, []);
    
    // Clean up previous player instance
    const cleanupPlayer = useCallback(() => {
        if (playerRef.current) {
            playerRef.current.dispose();
            playerRef.current = null;
        }
    }, []);
    
    // Initialize the video player
    useEffect(() => {
        if (!detectionId) {
            setHasError(true);
            setIsLoading(false);
            return () => cleanupPlayer();
        }

        // Reset states for new video
        setIsLoading(true);
        setHasError(false);
        setLoadingProgress(0);

        // Always clean up previous instance first
        cleanupPlayer();

        // Initialize player only if video element exists and we have a detection ID
        if (videoRef.current) {
            const player = videojs(videoRef.current, {
                controls: false,
                responsive: true,
                fluid: true,
                preload: 'auto',
                sources: [
                    {
                        src: videoSrc,
                        type: 'video/mp4',
                    },
                ],
            });

            playerRef.current = player;

            // Event listeners
            player.on('play', () => setIsPlaying(true));
            player.on('pause', () => setIsPlaying(false));
            
            player.on('loadedmetadata', () => {
                setIsLoading(false);
                updateTimeDisplay();
            });
            
            player.on('error', (e) => {
                setIsLoading(false);
                setHasError(true);
            });
            
            player.on('timeupdate', updateTimeDisplay);
        }

        // Cleanup function
        return () => cleanupPlayer();
    }, [detectionId, videoSrc, updateTimeDisplay, cleanupPlayer]);

    const togglePlayPause = () => {
        if (playerRef.current) {
            if (isPlaying) {
                playerRef.current.pause();
            } else {
                playerRef.current.play();
            }
        }
    };

    return (
        <div className="h-full w-full bg-white text-gray-900 flex flex-col overflow-hidden">
            {/* Back button */}
            <div className="px-4 py-3 flex items-center border-b border-gray-100">
                <Link href="/" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to alerts</span>
                </Link>
            </div>
            
            {/* Main Video Player */}
            <div className="flex-1 min-h-0 p-4 flex items-center justify-center bg-gray-50">
                <div className="relative w-full max-w-4xl max-h-[80vh] aspect-video rounded-xl overflow-hidden bg-white ring-1 ring-gray-200 shadow-md">
                    {/* Loading overlay */}
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/95 to-white/90 backdrop-blur-sm z-10">
                            <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-white/70 shadow-sm ring-1 ring-gray-100 w-full max-w-xs">
                                <div className="h-10 w-10 rounded-full border-3 border-t-transparent border-gray-900 animate-spin"></div>
                                <div className="text-sm font-medium text-gray-800">Loading video footage...</div>
                                
                                {/* Progress bar */}
                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gray-900 transition-all duration-300 ease-out"
                                        style={{ width: `${loadingProgress}%` }}
                                    ></div>
                                </div>
                                <div className="text-xs text-gray-500">{Math.round(loadingProgress)}% complete</div>
                            </div>
                        </div>
                    )}
                    
                    {/* Error state */}
                    {hasError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/95 backdrop-blur-sm z-10">
                            <div className="flex flex-col items-center gap-4 p-8 rounded-xl bg-white shadow-md ring-1 ring-gray-200 max-w-md mx-4">
                                <div className="h-14 w-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center shadow-sm">
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                                <div className="text-gray-900 font-medium text-lg">Video Unavailable</div>
                                <div className="text-sm text-gray-600 max-w-xs text-center">
                                    {!detectionId 
                                        ? "No detection ID was provided. Please select a detection from the alerts feed." 
                                        : "The video for this detection could not be loaded. It may have been deleted or is temporarily unavailable."}
                                </div>
                                <div className="flex gap-3 mt-2">
                                    <Link 
                                        href="/"
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                                    >
                                        Return to Alerts
                                    </Link>
                                    {detectionId && (
                                        <button 
                                            onClick={() => {
                                                // Refresh with a cache-busting parameter
                                                router.push(`/replay?id=${detectionId}&refresh=${Date.now()}`);
                                            }}
                                            className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
                                        >
                                            Try Again
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Video element */}
                    <div data-vjs-player className="relative h-full">
                        <video 
                            ref={videoRef} 
                            className="video-js w-full h-full object-cover" 
                            key={`video-${detectionId}`} 
                            playsInline
                        />
                    </div>

                    {/* Video playback status - active indicator */}
                    {!hasError && !isLoading && isPlaying && (
                        <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-xs">
                            <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            <span>REC</span>
                        </div>
                    )}

                    {/* Camera Info Overlay */}
                    {!hasError && detectionId && (
                        <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 ring-1 ring-gray-200 shadow-sm">
                            <div className="text-gray-900 text-xs font-medium flex items-center gap-1.5">
                                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Detection #{detectionId}
                            </div>
                            <div className="text-gray-700 text-xs">Playing recorded footage</div>
                        </div>
                    )}

                    {/* Video Controls Overlay - Only show if video is loaded */}
                    {!hasError && !isLoading && (
                        <>
                            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-5 bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 ring-1 ring-gray-200 shadow-md transition-all hover:opacity-100 opacity-95 hover:shadow-lg">
                                <button 
                                    className="text-gray-700 hover:text-gray-900 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 rounded-full p-1"
                                    title="Skip backward"
                                >
                                    <SkipBack className="w-5 h-5" />
                                </button>
                                <button 
                                    className="text-gray-700 hover:text-gray-900 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 rounded-full p-1"
                                    title="Restart"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={togglePlayPause}
                                    className="bg-gray-900 text-white rounded-full p-3 hover:bg-black transition-all hover:scale-110 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
                                    title={isPlaying ? "Pause" : "Play"}
                                >
                                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                                </button>
                                <button 
                                    className="text-gray-700 hover:text-gray-900 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 rounded-full p-1"
                                    title="Skip forward"
                                >
                                    <SkipForward className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Time Display */}
                            <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 ring-1 ring-gray-200 shadow-sm font-mono">
                                <span className="text-gray-900 text-xs font-medium">{currentTime}</span>
                            </div>

                            {/* Right Controls */}
                            <div className="absolute bottom-6 right-6 flex items-center gap-3">
                                <button 
                                    className="bg-white/90 backdrop-blur-sm rounded-full p-2 text-gray-700 hover:text-gray-900 transition-all ring-1 ring-gray-200 shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                                    title="Settings"
                                >
                                    <Settings className="w-4 h-4" />
                                </button>
                                <button 
                                    className="bg-white/90 backdrop-blur-sm rounded-full p-2 text-gray-700 hover:text-gray-900 transition-all ring-1 ring-gray-200 shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                                    title="Fullscreen"
                                    onClick={() => {
                                        if (playerRef.current) {
                                            if (playerRef.current.isFullscreen()) {
                                                playerRef.current.exitFullscreen();
                                            } else {
                                                playerRef.current.requestFullscreen();
                                            }
                                        }
                                    }}
                                >
                                    <Maximize2 className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

function VideoReplayPage() {
    const searchParams = useSearchParams();
    const detectionId = searchParams.get('id');
    const refresh = searchParams.get('refresh');
    return <VideoPlayer key={`${detectionId}-${refresh || ''}`} detectionId={detectionId} />;
}

export default VideoReplayPage;
