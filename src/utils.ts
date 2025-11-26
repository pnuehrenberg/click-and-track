import { TrackPoint } from '@/types';

export const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const milliseconds = Math.floor(ms % 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number, width = 2) => n.toString().padStart(width, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(milliseconds, 3)}`;
};

/**
 * Converts a timestamp in milliseconds to a 0-based frame index.
 */
export const getFrameIndex = (timeMs: number, fps: number): number => {
  if (fps <= 0) return 0;
  // Rounding handles sub-millisecond drift (e.g., 33.333... vs 33.334)
  return Math.round((timeMs * fps) / 1000);
};

/**
 * Converts a frame index back to a precise timestamp in milliseconds.
 */
export const getFrameTime = (frameIndex: number, fps: number): number => {
  if (fps <= 0) return 0;
  return (frameIndex * 1000) / fps;
};

/**
 * Determines if a given timestamp aligns with the configured sampling rate.
 * Uses frame indices to ensure robustness against floating point time drift.
 */
export const isTrackingFrame = (
  timestampMs: number, 
  fps: number,
  rateNum: number, // Sampling Rate Numerator (samples)
  rateDen: number  // Sampling Rate Denominator (seconds)
): boolean => {
  if (fps <= 0) return false;
  
  // Calculate the interval in frames. 
  // Interval (sec) = Den / Num. 
  // Interval (frames) = (Den / Num) * FPS.
  const intervalSec = rateDen / rateNum;
  const intervalFrames = Math.round(intervalSec * fps);
  
  if (intervalFrames <= 0) return true; // Every frame

  const currentFrame = getFrameIndex(timestampMs, fps);
  return currentFrame % intervalFrames === 0;
};

// Parse CSV to Points
export const parseCSV = (csvText: string): TrackPoint[] => {
  const lines = csvText.split('\n');
  const points: TrackPoint[] = [];
  // Skip header if present
  const startIndex = lines[0].includes('timestamp_ms') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const [ts, objId, x, y] = line.split(',').map(Number);
    if (!isNaN(ts) && !isNaN(objId) && !isNaN(x) && !isNaN(y)) {
      points.push({
        id: `${ts}-${objId}`,
        timestamp: ts,
        objectId: objId,
        x,
        y
      });
    }
  }
  return points;
};

// Export Points to CSV
export const pointsToCSV = (points: TrackPoint[]): string => {
  // Sort by timestamp then object ID
  const sorted = [...points].sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    return a.objectId - b.objectId;
  });

  let csv = "timestamp_ms,object_id,x,y\n";
  sorted.forEach(p => {
    csv += `${p.timestamp},${p.objectId},${p.x},${p.y}\n`;
  });
  return csv;
};

export const generateColor = (isActive: boolean) => {
  // Hex colors matching the Python spec
  return isActive ? '#EF8A62' : '#67A9CF';
};