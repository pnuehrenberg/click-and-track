import { useState, useCallback } from "react";
import { TrackPoint, AppSettings } from "@/types";
import { getFrameTime, getFrameIndex } from "@/utils";

interface Props {
  visiblePoints: TrackPoint[];
  activeObjectId: number;
  currentTime: number;
  isPlaying: boolean;
  settings: AppSettings;
  fps: number;
}

export function useSmartNavigation({
  visiblePoints,
  activeObjectId,
  currentTime,
  isPlaying,
  settings,
  fps,
}: Props) {
  const [seekRequest, setSeekRequest] = useState<{
    time: number;
    ts: number;
  } | null>(null);

  const triggerSeek = useCallback((time: number) => {
    setSeekRequest({ time, ts: Date.now() });
  }, []);

  // Frame-perfect interval calculation
  const samplingIntervalSec =
    settings.samplingRateDen / settings.samplingRateNum;
  const intervalFrames = Math.round(samplingIntervalSec * fps);

  const jumpToPrevious = useCallback(() => {
    if (isPlaying) return;
    // Navigate only through visible points of the active object that are truly before the current time
    const relevant = visiblePoints.filter(
      (p) =>
        p.objectId === activeObjectId &&
        getFrameIndex(p.timestamp, fps) < getFrameIndex(currentTime, fps),
    );
    if (relevant.length > 0) {
      // Go to nearest previous POINT
      const prev = relevant.reduce((a, b) =>
        a.timestamp > b.timestamp ? a : b,
      );
      triggerSeek(prev.timestamp);
    } else {
      // Step back one INTERVAL (precisely)
      const target = getFrameTime(
        getFrameIndex(currentTime, fps) - intervalFrames,
        fps,
      );
      triggerSeek(Math.max(0, target));
    }
  }, [
    visiblePoints,
    activeObjectId,
    currentTime,
    isPlaying,
    intervalFrames,
    fps,
    triggerSeek,
  ]);

  const jumpToNext = useCallback(() => {
    if (isPlaying) return;
    // Navigate only through visible points of the active object that are truly after the current time
    const relevant = visiblePoints.filter(
      (p) =>
        p.objectId === activeObjectId &&
        getFrameIndex(p.timestamp, fps) > getFrameIndex(currentTime, fps),
    );
    if (relevant.length > 0) {
      // Go to nearest future POINT
      const next = relevant.reduce((a, b) =>
        a.timestamp < b.timestamp ? a : b,
      );
      triggerSeek(next.timestamp);
    } else {
      // Step forward one INTERVAL (precisely)
      const target = getFrameTime(
        getFrameIndex(currentTime, fps) + intervalFrames,
        fps,
      );
      triggerSeek(target);
    }
  }, [
    visiblePoints,
    activeObjectId,
    currentTime,
    isPlaying,
    intervalFrames,
    fps,
    triggerSeek,
  ]);

  const jumpToFirst = useCallback(() => {
    if (isPlaying) return;
    const relevant = visiblePoints.filter((p) => p.objectId === activeObjectId);

    if (relevant.length > 0) {
      const first = relevant.reduce((a, b) =>
        a.timestamp < b.timestamp ? a : b,
      );

      // If we are currently after the first record, jump to it.
      // If we are already at (or before) the first record, rewind to the beginning of the video (0).
      if (
        getFrameIndex(currentTime, fps) > getFrameIndex(first.timestamp, fps)
      ) {
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
    const relevant = visiblePoints.filter((p) => p.objectId === activeObjectId);
    if (relevant.length > 0) {
      // Go to the absolute LAST point (max timestamp), regardless of current time
      const last = relevant.reduce((a, b) =>
        a.timestamp > b.timestamp ? a : b,
      );
      triggerSeek(last.timestamp);
    }
  }, [visiblePoints, activeObjectId, isPlaying, triggerSeek]);

  return {
    seekRequest,
    triggerSeek,
    jumpToPrevious,
    jumpToNext,
    jumpToFirst,
    jumpToFinal,
  };
}
