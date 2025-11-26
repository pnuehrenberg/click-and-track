import { useState, useCallback } from "react";
import { TrackPoint } from "@/types";
import { getFrameIndex } from "@/utils";

export function useProjectState(videoFps: number) {
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [activeObjectId, setActiveObjectId] = useState(1);
  const [numObjects, setNumObjects] = useState(1);
  const [isDirty, setIsDirty] = useState(false);

  const addPoint = useCallback((p: TrackPoint) => {
    setPoints((prev) => {
      // Remove existing point at this time/id if exists (Update)
      const filtered = prev.filter(
        (pt) => !(pt.timestamp === p.timestamp && pt.objectId === p.objectId),
      );
      return [...filtered, p];
    });
    setIsDirty(true);
  }, []);

  const deletePoint = useCallback(
    (time: number, objId: number) => {
      // Delete by matching frame index (robust)
      const targetFrame = getFrameIndex(time, videoFps);
      setPoints((prev) =>
        prev.filter(
          (p) =>
            !(
              getFrameIndex(p.timestamp, videoFps) === targetFrame &&
              p.objectId === objId
            ),
        ),
      );
      setIsDirty(true);
    },
    [videoFps],
  );

  const resetProject = useCallback(() => {
    setPoints([]);
    setActiveObjectId(1);
    setNumObjects(1);
    setIsDirty(false);
  }, []);

  const markAsClean = useCallback(() => {
    setIsDirty(false);
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
  };
}
