import { useRef, useState, useEffect } from 'react';
import { AppSettings } from '@/types';
import { getFrameIndex, getFrameTime } from '@/utils';

interface UseVideoSyncProps {
  videoSrc: string;
  videoFps: number;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  seekRequest: { time: number; ts: number } | null;
  settings: AppSettings;
  onTimeUpdate: (time: number) => void;
  isSpaceHeld: boolean;
}

export function useVideoSynchronization({
  videoSrc,
  videoFps,
  isPlaying,
  setIsPlaying,
  seekRequest,
  settings,
  onTimeUpdate,
  isSpaceHeld
}: UseVideoSyncProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDimensions, setVideoDimensions] = useState({ w: 0, h: 0 });

  const loopHandleRef = useRef<number | null>(null);
  const isRvfcRef = useRef<boolean>(false);
  const nextPauseTimeRef = useRef<number | null>(null);
  const isSpaceHeldRef = useRef(isSpaceHeld);

  useEffect(() => {
    isSpaceHeldRef.current = isSpaceHeld;
  }, [isSpaceHeld]);

  // Handle Seek
  useEffect(() => {
    if (seekRequest && videoRef.current) {
      videoRef.current.currentTime = seekRequest.time / 1000;
      setCurrentTime(seekRequest.time);
      nextPauseTimeRef.current = null;
    }
  }, [seekRequest]);

  // Sync Video Events to State (Handle End of Video)
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const handleEnded = () => {
      setIsPlaying(false);
    };

    vid.addEventListener('ended', handleEnded);
    return () => vid.removeEventListener('ended', handleEnded);
  }, [setIsPlaying]);

  // Handle Play/Pause State
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (isPlaying) {
      const playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          if (error.name === 'AbortError' || error.message.includes('interrupted')) return;
          console.error("Play failed", error);
        });
      }
    } else {
      vid.pause();
      nextPauseTimeRef.current = null;
    }
  }, [isPlaying]);

  // Reset on src change
  useEffect(() => {
      setVideoDimensions({ w: 0, h: 0 });
  }, [videoSrc]);

  // Metadata handler
  const onLoadedMetadata = () => {
    if (videoRef.current) {
        setVideoDimensions({
            w: videoRef.current.videoWidth,
            h: videoRef.current.videoHeight
        });
    }
  };

  // Animation Loop
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    type VideoFrameCallback = (now: number, metadata: any) => void;
    
    const requestVideoFrame = (cb: VideoFrameCallback) => {
        if ('requestVideoFrameCallback' in vid) {
            isRvfcRef.current = true;
            // @ts-ignore
            return vid.requestVideoFrameCallback(cb);
        } else {
            isRvfcRef.current = false;
            return requestAnimationFrame((now) => cb(now, null));
        }
    };

    const cancelVideoFrame = (id: number) => {
        if (isRvfcRef.current && 'cancelVideoFrameCallback' in vid) {
            // @ts-ignore
            vid.cancelVideoFrameCallback(id);
        } else {
            cancelAnimationFrame(id);
        }
    };

    const loop = (_now: number, metadata: any) => {
        if (!vid) return;
        
        const nowMs = metadata ? metadata.mediaTime * 1000 : vid.currentTime * 1000;
        setCurrentTime(nowMs);
        onTimeUpdate(nowMs);

        // Frame-Based Auto-Pause Logic
        if (isPlaying && settings.samplingRateNum > 0 && !isSpaceHeldRef.current) {
            
            const intervalSec = settings.samplingRateDen / settings.samplingRateNum;
            const intervalFrames = Math.max(1, Math.round(intervalSec * videoFps));
            const currentFrame = getFrameIndex(nowMs, videoFps);

            if (nextPauseTimeRef.current === null) {
                let nextTargetFrame = Math.ceil((currentFrame + 0.1) / intervalFrames) * intervalFrames;
                if (nextTargetFrame <= currentFrame) {
                    nextTargetFrame += intervalFrames;
                }
                nextPauseTimeRef.current = getFrameTime(nextTargetFrame, videoFps);
            }

            const targetTime = nextPauseTimeRef.current;
            const remaining = targetTime - nowMs;
            const frameDurationMs = 1000 / videoFps;
            const threshold = frameDurationMs * 0.85;

            if (remaining <= threshold) {
                setIsPlaying(false);
                vid.currentTime = targetTime / 1000;
                setCurrentTime(targetTime);
                nextPauseTimeRef.current = null;
                return; 
            }
        } 
        
        if (isPlaying && 'requestVideoFrameCallback' in vid) {
            // @ts-ignore
            loopHandleRef.current = vid.requestVideoFrameCallback(loop);
            isRvfcRef.current = true;
        } else {
            loopHandleRef.current = requestAnimationFrame(() => loop(performance.now(), null));
            isRvfcRef.current = false;
        }
    };

    loopHandleRef.current = requestVideoFrame(loop);

    return () => {
        if (loopHandleRef.current !== null) {
            cancelVideoFrame(loopHandleRef.current);
        }
    };
  }, [isPlaying, settings, onTimeUpdate, setIsPlaying, videoFps]);

  return {
    videoRef,
    currentTime,
    videoDimensions,
    onLoadedMetadata
  };
}