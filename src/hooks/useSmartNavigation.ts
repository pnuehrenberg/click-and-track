import { useState, useCallback } from 'react';
import { TrackPoint, AppSettings } from '@/types';

interface Props {
  visiblePoints: TrackPoint[];
  activeObjectId: number;
  currentTime: number;
  isPlaying: boolean;
  settings: AppSettings;
}

export function useSmartNavigation({
  visiblePoints,
  activeObjectId,
  currentTime,
  isPlaying,
  settings
}: Props) {
  const [seekRequest, setSeekRequest] = useState<{ time: number, ts: number } | null>(null);

  const triggerSeek = useCallback((time: number) => {
     setSeekRequest({ time, ts: Date.now() });
  }, []);

  const intervalMs = (settings.samplingRateDen * 1000) / settings.samplingRateNum;
  // Small tolerance to handle floating point drift when comparing timestamps
  const EPSILON = 5; 

  const jumpToPrevious = useCallback(() => {
    if (isPlaying) return;
    // Navigate only through visible points
    const relevant = visiblePoints.filter(p => p.objectId === activeObjectId && p.timestamp < currentTime - 20);
    if (relevant.length > 0) {
      // Go to nearest previous POINT
      const prev = relevant.reduce((a, b) => (a.timestamp > b.timestamp ? a : b));
      triggerSeek(prev.timestamp);
    } else {
        // Step back one INTERVAL (roughly)
        // Find the largest grid point strictly less than (current - epsilon)
        const target = Math.floor((currentTime - EPSILON) / intervalMs) * intervalMs;
        triggerSeek(Math.max(0, target));
    }
  }, [visiblePoints, activeObjectId, currentTime, isPlaying, intervalMs, triggerSeek]);

  const jumpToNext = useCallback(() => {
    if (isPlaying) return;
    // Navigate only through visible points
    const relevant = visiblePoints.filter(p => p.objectId === activeObjectId && p.timestamp > currentTime + 20);
    if (relevant.length > 0) {
      // Go to nearest future POINT
      const next = relevant.reduce((a, b) => (a.timestamp < b.timestamp ? a : b));
      triggerSeek(next.timestamp);
    } else {
       // Step forward one INTERVAL
       // Find the smallest grid point strictly greater than (current + epsilon)
       const target = Math.ceil((currentTime + EPSILON) / intervalMs) * intervalMs;
       triggerSeek(target);
    }
  }, [visiblePoints, activeObjectId, currentTime, isPlaying, intervalMs, triggerSeek]);

  const jumpToFirst = useCallback(() => {
    if (isPlaying) return;
    const relevant = visiblePoints.filter(p => p.objectId === activeObjectId);
    
    if (relevant.length > 0) {
      const first = relevant.reduce((a, b) => (a.timestamp < b.timestamp ? a : b));
      
      // If we are currently after the first record, jump to it.
      // If we are already at (or before) the first record, rewind to the beginning of the video (0).
      if (currentTime > first.timestamp + 20) {
          triggerSeek(first.timestamp);
      } else {
          triggerSeek(0);
      }
    } else {
      triggerSeek(0);
    }
  }, [visiblePoints, activeObjectId, currentTime, isPlaying, triggerSeek]);

  const jumpToFinal = useCallback(() => {
    if (isPlaying) return;
    const relevant = visiblePoints.filter(p => p.objectId === activeObjectId);
    if (relevant.length > 0) {
      // Go to the absolute LAST point (max timestamp), regardless of current time
      const last = relevant.reduce((a, b) => (a.timestamp > b.timestamp ? a : b)); 
      triggerSeek(last.timestamp);
    }
  }, [visiblePoints, activeObjectId, isPlaying, triggerSeek]);

  return {
    seekRequest,
    triggerSeek,
    jumpToPrevious,
    jumpToNext,
    jumpToFirst,
    jumpToFinal
  };
}