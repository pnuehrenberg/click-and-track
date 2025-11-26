import React, { useRef, useCallback, useState, useEffect } from "react";
import { TrackPoint, ViewTransform, UIElement, AppSettings } from "@/types";
import { isTrackingFrame, getFrameIndex, getFrameTime } from "@/utils";

interface UseCanvasInteractionProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  videoDimensions: { w: number; h: number };
  transform: ViewTransform;
  setTransform: (t: ViewTransform) => void;
  getConstrainedTransform: (t: ViewTransform) => ViewTransform;

  uiElements: UIElement[];
  points: TrackPoint[];
  draggedPoint: TrackPoint | null;
  setDraggedPoint: React.Dispatch<React.SetStateAction<TrackPoint | null>>;

  activeObjectId: number;
  settings: AppSettings;
  currentTime: number;
  videoFps: number;
  isPlaying: boolean;
  isSpaceHeld: boolean;
  canPan: boolean;

  onAddPoint: (p: TrackPoint) => void;
  onSelectObject: (id: number) => void;
}

type InteractionState =
  | { type: "IDLE" }
  | {
      type: "PRE_DRAG";
      startX: number;
      startY: number;
      candidateObj?: { objectId: number; point?: TrackPoint };
    }
  | { type: "DRAGGING"; originalPoint: TrackPoint }
  | { type: "PANNING"; lastX: number; lastY: number };

export interface InteractionDebugState {
  mode: string;
  isCtrl: boolean;
  hoverType: string;
  hoverIsCurrent: boolean;
  predictedCursor: string;
  canPan: boolean;
}

export function useCanvasInteraction({
  containerRef,
  videoDimensions,
  transform,
  setTransform,
  getConstrainedTransform,
  uiElements,
  points,
  draggedPoint,
  setDraggedPoint,
  activeObjectId,
  settings,
  currentTime,
  videoFps,
  isPlaying,
  isSpaceHeld,
  canPan,
  onAddPoint,
  onSelectObject,
}: UseCanvasInteractionProps) {
  // Logic is driven by this Ref (Robust)
  const stateRef = useRef<InteractionState>({ type: "IDLE" });

  // Visualization is driven by this State (Reactive)
  const [debugState, setDebugState] = useState<InteractionDebugState>({
    mode: "IDLE",
    isCtrl: false,
    hoverType: "NONE",
    hoverIsCurrent: false,
    predictedCursor: "default",
    canPan: canPan,
  });

  const cursorPosRef = useRef<{ x: number; y: number } | null>(null);

  // --- Helpers ---

  const findElementAtScreenPos = useCallback(
    (screenX: number, screenY: number): UIElement | null => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const relX = screenX - rect.left;
      const relY = screenY - rect.top;

      for (let i = uiElements.length - 1; i >= 0; i--) {
        const el = uiElements[i];
        const elScreenX = el.pos.x * transform.scale + transform.x;
        const elScreenY = el.pos.y * transform.scale + transform.y;
        const dist = Math.sqrt(
          Math.pow(relX - elScreenX, 2) + Math.pow(relY - elScreenY, 2),
        );
        if (dist < el.radius + 6) return el;
      }
      return null;
    },
    [uiElements, transform, containerRef],
  );

  // Helper to update debug state only if changed (prevents render thrashing)
  const updateDebugState = useCallback(
    (overrides: Partial<InteractionDebugState>) => {
      setDebugState((prev) => {
        // Always keep canPan in sync with the latest prop
        const next = { ...prev, ...overrides, canPan };

        // Re-calculate predicted cursor based on latest state
        let cursor = "default";

        if (next.mode === "DRAGGING" || next.mode === "PANNING") {
          cursor = "grabbing";
        } else if (next.mode === "PRE_DRAG") {
          // Holding down.
          // If we were hovering a circle (object), we are effectively holding it (pointer).
          // Otherwise if we can pan, we are grabbing the background (grabbing).
          if (next.hoverType === "circle") cursor = "pointer";
          else if (next.canPan) cursor = "grabbing";
        } else if (next.mode === "IDLE") {
          if (next.isCtrl) cursor = "crosshair";
          else if (next.hoverType !== "NONE") cursor = "pointer";
          else if (next.canPan) cursor = "grab";
        }
        next.predictedCursor = cursor;

        if (
          prev.mode === next.mode &&
          prev.isCtrl === next.isCtrl &&
          prev.hoverType === next.hoverType &&
          prev.hoverIsCurrent === next.hoverIsCurrent &&
          prev.predictedCursor === next.predictedCursor &&
          prev.canPan === next.canPan
        ) {
          return prev;
        }
        return next;
      });
    },
    [canPan],
  );

  const handleLogPoint = (e: React.MouseEvent | React.PointerEvent) => {
    if (!containerRef.current || !videoDimensions.w) return;
    const isValidFrame = isTrackingFrame(
      currentTime,
      videoFps,
      settings.samplingRateNum,
      settings.samplingRateDen,
    );
    if (isPlaying || !isValidFrame) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const videoX = (clickX - transform.x) / transform.scale;
    const videoY = (clickY - transform.y) / transform.scale;

    if (
      videoX < 0 ||
      videoX > videoDimensions.w ||
      videoY < 0 ||
      videoY > videoDimensions.h
    )
      return;

    const frameIndex = getFrameIndex(currentTime, videoFps);
    const logTime = getFrameTime(frameIndex, videoFps);

    onAddPoint({
      id: `${logTime}-${activeObjectId}`,
      timestamp: logTime,
      objectId: activeObjectId,
      x: videoX,
      y: videoY,
    });
  };

  const resetState = () => {
    stateRef.current = { type: "IDLE" };
    setDraggedPoint(null);
    updateDebugState({ mode: "IDLE" });
  };

  // --- Effects (Debug Only) ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Control") {
        updateDebugState({ isCtrl: e.type === "keydown" });
      }
    };
    const handleBlur = () => updateDebugState({ isCtrl: false });
    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKey);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKey);
      window.removeEventListener("blur", handleBlur);
    };
  }, [updateDebugState]);

  // Sync canPan changes immediately (e.g. Zooming)
  useEffect(() => {
    updateDebugState({});
  }, [canPan, updateDebugState]);

  // Reactive Hover Check (Fixes "NONE" hover after Drop/Create)
  useEffect(() => {
    if (stateRef.current.type === "IDLE" && cursorPosRef.current) {
      const hitElement = findElementAtScreenPos(
        cursorPosRef.current.x,
        cursorPosRef.current.y,
      );
      updateDebugState({
        hoverType: hitElement ? hitElement.type : "NONE",
        hoverIsCurrent: hitElement ? hitElement.isCurrent : false,
      });
    }
  }, [uiElements, transform, updateDebugState, findElementAtScreenPos]);

  // --- Handlers ---

  const handlePointerLeave = () => {
    cursorPosRef.current = null;
    if (stateRef.current.type === "IDLE") {
      updateDebugState({ hoverType: "NONE", hoverIsCurrent: false });
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isSpaceHeld) return;
    if (e.button !== 0) return;

    // Prevent intercepting clicks on interactive UI elements (e.g. Help button)
    if ((e.target as HTMLElement).closest("button, input, a")) return;

    e.currentTarget.focus({ preventScroll: true });
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const isCtrl = e.ctrlKey || e.metaKey;
    updateDebugState({ isCtrl });

    // 1. Action: Ctrl Click -> Log Point
    if (isCtrl) {
      handleLogPoint(e);
      return;
    }

    // 2. Prepare for Potential Interaction
    const hitElement = findElementAtScreenPos(e.clientX, e.clientY);

    let candidateObj: { objectId: number; point?: TrackPoint } | undefined;

    if (hitElement) {
      e.stopPropagation();

      const isCurrentCircle =
        hitElement.isCurrent && hitElement.type === "circle";
      let pointData: TrackPoint | undefined;
      const currentFrameIndex = getFrameIndex(currentTime, videoFps);

      if (isCurrentCircle) {
        pointData = points.find(
          (p) =>
            p.objectId === hitElement.objectId &&
            getFrameIndex(p.timestamp, videoFps) === currentFrameIndex,
        );
      }
      candidateObj = { objectId: hitElement.objectId, point: pointData };
    }

    stateRef.current = {
      type: "PRE_DRAG",
      startX: e.clientX,
      startY: e.clientY,
      candidateObj,
    };
    updateDebugState({ mode: "PRE_DRAG" });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = stateRef.current;

    // Always update cursor pos for the reactive effect
    cursorPosRef.current = { x: e.clientX, y: e.clientY };

    // Check Ctrl state on move
    const isCtrl = e.ctrlKey || e.metaKey;

    // --- IDLE State (Debug Hover Logic) ---
    if (state.type === "IDLE") {
      const hitElement = findElementAtScreenPos(e.clientX, e.clientY);
      updateDebugState({
        mode: "IDLE",
        isCtrl,
        hoverType: hitElement ? hitElement.type : "NONE",
        hoverIsCurrent: hitElement ? hitElement.isCurrent : false,
      });
      return;
    }

    // --- Interaction States ---
    updateDebugState({ isCtrl });

    if ((e.buttons & 1) === 0) {
      resetState();
      return;
    }

    // 1. Check Threshold to start Drag or Pan
    if (state.type === "PRE_DRAG") {
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const DRAG_THRESHOLD = 5;

      if (dist > DRAG_THRESHOLD) {
        // Threshold met. Decide whether to Drag Object or Pan View.
        if (state.candidateObj?.point) {
          stateRef.current = {
            type: "DRAGGING",
            originalPoint: state.candidateObj.point,
          };
          updateDebugState({ mode: "DRAGGING" });
        } else if (canPan) {
          stateRef.current = {
            type: "PANNING",
            lastX: e.clientX,
            lastY: e.clientY,
          };
          updateDebugState({ mode: "PANNING" });
        } else {
          // Dragged something inert -> Cancel
          resetState();
        }
      }
    }

    // 2. Handle Active Drag
    if (stateRef.current.type === "DRAGGING" && containerRef.current) {
      const draggingState = stateRef.current; // TS narrowing
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const videoX = (mouseX - transform.x) / transform.scale;
      const videoY = (mouseY - transform.y) / transform.scale;
      const clampedX = Math.max(0, Math.min(videoX, videoDimensions.w));
      const clampedY = Math.max(0, Math.min(videoY, videoDimensions.h));

      // Update Visuals
      setDraggedPoint({
        ...draggingState.originalPoint,
        x: clampedX,
        y: clampedY,
      });
    }

    // 3. Handle Active Pan
    if (stateRef.current.type === "PANNING") {
      const panningState = stateRef.current; // TS narrowing
      const dx = e.clientX - panningState.lastX;
      const dy = e.clientY - panningState.lastY;

      const proposed = {
        ...transform,
        x: transform.x + dx,
        y: transform.y + dy,
      };
      const constrained = getConstrainedTransform(proposed);

      setTransform(constrained);

      // Update Ref for next delta
      stateRef.current = {
        ...panningState,
        lastX: e.clientX,
        lastY: e.clientY,
      };
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    cursorPosRef.current = { x: e.clientX, y: e.clientY };

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    const state = stateRef.current;

    if (state.type === "PRE_DRAG") {
      // Clicked without moving -> Selection
      if (state.candidateObj) {
        onSelectObject(state.candidateObj.objectId);
      }
    } else if (state.type === "DRAGGING") {
      // Drag finished -> Commit
      if (draggedPoint) {
        onAddPoint(draggedPoint);
      }
    }

    resetState();
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    resetState();
  };

  const handleLostPointerCapture = () => {
    if (stateRef.current.type !== "IDLE") {
      resetState();
    }
  };

  return {
    debugState, // Expose for UI
    handlePointerEnter: () => {}, // unused
    handlePointerLeave,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleLostPointerCapture,
  };
}
