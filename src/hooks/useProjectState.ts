import { useState, useEffect, useCallback } from 'react';
import { TrackPoint } from '@/types';
import { dbService } from '@/services/db';
import { getFrameIndex } from '@/utils';

export function useProjectState(videoFps: number) {
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [activeObjectId, setActiveObjectId] = useState(1);
  const [numObjects, setNumObjects] = useState(1);
  const [isDirty, setIsDirty] = useState(false);

  // Init DB
  useEffect(() => {
    dbService.connect().catch(e => console.error("DB connection failed", e));
  }, []);

  // Autosave
  useEffect(() => {
    // Save points to DB whenever they change.
    // Passing an empty array correctly clears the object store in dbService.savePoints.
    dbService.savePoints(points);
  }, [points]);

  const addPoint = useCallback((p: TrackPoint) => {
    setPoints(prev => {
      // Remove existing point at this time/id if exists (Update)
      const filtered = prev.filter(pt => !(pt.timestamp === p.timestamp && pt.objectId === p.objectId));
      return [...filtered, p];
    });
    setIsDirty(true);
  }, []);

  const deletePoint = useCallback((time: number, objId: number) => {
    // Delete by matching frame index (robust)
    const targetFrame = getFrameIndex(time, videoFps);
    setPoints(prev => prev.filter(p => !(getFrameIndex(p.timestamp, videoFps) === targetFrame && p.objectId === objId)));
    setIsDirty(true);
  }, [videoFps]);

  const resetProject = useCallback(() => {
    setPoints([]);
    setActiveObjectId(1);
    setNumObjects(1);
    setIsDirty(false);
  }, []);

  const markAsClean = useCallback(() => {
    setIsDirty(false);
  }, []);

  const restoreSession = useCallback(async () => {
    try {
      const saved = await dbService.loadPoints();
      if (saved.length > 0) {
        if (confirm("Found unsaved tracking data from previous session. Restore it?")) {
          setPoints(saved);
          const maxId = saved.reduce((acc, p) => Math.max(acc, p.objectId), 1);
          setNumObjects(maxId);
          setIsDirty(true);
        }
      }
    } catch (e) {
      console.error("Failed to restore session", e);
    }
  }, []);

  return {
    points,
    setPoints,
    activeObjectId,
    setActiveObjectId,
    numObjects,
    setNumObjects,
    isDirty,
    addPoint,
    deletePoint,
    resetProject,
    markAsClean,
    restoreSession
  };
}