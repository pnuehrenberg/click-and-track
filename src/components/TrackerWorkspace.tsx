import React, { useRef, useState, useEffect } from "react";
import {
  MousePointer2,
  Hand,
  Move,
  ZoomIn,
  HelpCircle,
  Crosshair,
} from "lucide-react";
import { PiMouseLeftClickFill, PiMouseScroll } from "react-icons/pi";
import { TrackPoint, AppSettings } from "@/types";
import { useVideoSynchronization } from "@/hooks/useVideoSynchronization";
import { useViewport } from "@/hooks/useViewport";
import { useTrackOverlay } from "@/hooks/useTrackOverlay";
import { useCanvasInteraction } from "@/hooks/useCanvasInteraction";
import { useCanvasRendering } from "@/hooks/useCanvasRendering";
import { Key } from "@/components/Key";
import { Tooltip } from "@/components/Tooltip";

interface Props {
  videoSrc: string;
  points: TrackPoint[];
  activeObjectId: number;
  settings: AppSettings;
  onAddPoint: (p: TrackPoint) => void;
  onDeletePoint: (timestamp: number, objectId: number) => void;
  onSelectObject: (id: number) => void;
  onTimeUpdate: (time: number) => void;
  isPlaying: boolean;
  setIsPlaying: (p: boolean) => void;
  playbackTrigger: number;
  seekRequest: { time: number; ts: number } | null;
  videoFps: number;
  isSpaceHeld: boolean;
  widgetPosition: { x: number; y: number } | null;
  onToggleHelp: () => void;
  isObstructed: boolean;
  onStatusDimensionsChange: (dims: { width: number; height: number }) => void;
}

export const TrackerWorkspace: React.FC<Props> = ({
  videoSrc,
  points,
  activeObjectId,
  settings,
  onAddPoint,
  onDeletePoint,
  onSelectObject,
  onTimeUpdate,
  isPlaying,
  setIsPlaying,
  seekRequest,
  videoFps,
  isSpaceHeld,
  widgetPosition,
  onToggleHelp,
  isObstructed,
  onStatusDimensionsChange,
}) => {
  // --- Video Synchronization ---
  const { videoRef, currentTime, videoDimensions, onLoadedMetadata } =
    useVideoSynchronization({
      videoSrc,
      videoFps,
      isPlaying,
      setIsPlaying,
      seekRequest,
      settings,
      onTimeUpdate,
      isSpaceHeld,
    });

  // --- Viewport & Transforms ---
  const {
    containerRef,
    transform,
    setTransform,
    handleWheel,
    canPan,
    getConstrainedTransform,
  } = useViewport({ videoDimensions, videoSrc });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusContainerRef = useRef<HTMLDivElement>(null);

  // --- Drag State ---
  // Managed here to avoid circular dependencies between Overlay generation and Interaction hooks
  const [draggedPoint, setDraggedPoint] = useState<TrackPoint | null>(null);

  // --- Overlay Element Generation ---
  const uiElements = useTrackOverlay({
    points,
    currentTime,
    videoFps,
    activeObjectId,
    settings,
    videoDimensions,
    draggedPoint,
    isSpaceHeld,
  });

  // --- Interaction Logic (Pointer, Hit Test, Cursors) ---
  const {
    debugState,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleLostPointerCapture,
    handlePointerLeave,
  } = useCanvasInteraction({
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
  });

  // --- Rendering Logic ---
  useCanvasRendering({
    canvasRef,
    containerRef,
    uiElements,
    transform,
    videoDimensions,
  });

  const getInteractionPills = (state: typeof debugState) => {
    const pills = [];

    // 1. Active Modes (Exclusive)
    if (state.mode === "DRAGGING") {
      return [
        {
          id: "drag",
          actionIcon: <Move size={18} />,
          description: <span className="text-gray-200">Dragging location</span>,
        },
      ];
    }
    if (state.mode === "PANNING") {
      return [
        {
          id: "pan",
          actionIcon: <Hand size={18} />,
          description: <span className="text-gray-200">Panning video</span>,
        },
      ];
    }

    // 2. Modifier Held (Exclusive override)
    if (state.isCtrl) {
      return [
        {
          id: "log-active",
          actionIcon: <Crosshair size={18} />,
          description: (
            <div className="flex items-center gap-2 text-gray-200">
              <PiMouseLeftClickFill size={16} className="text-gray-300" />
              <span>to log location</span>
            </div>
          ),
        },
      ];
    }

    // 3. Idle Hints (Composed)

    // Hint: Ctrl to Log (High priority - First in list)
    pills.push({
      id: "hint-ctrl",
      actionIcon: <Crosshair size={18} />,
      description: (
        <div className="flex items-center gap-1.5 text-gray-200">
          <Key>Ctrl</Key>
          <PiMouseLeftClickFill size={16} className="text-gray-300" />
          <span className="ml-1">to log location</span>
        </div>
      ),
    });

    // Object vs Background Interactions
    if (state.hoverType !== "NONE") {
      // Distinguish between Current Point (Draggable) and Past/History Point (Selectable only)
      if (state.hoverIsCurrent) {
        pills.push({
          id: "hint-obj-move",
          actionIcon: <Move size={18} />,
          description: (
            <div className="flex items-center gap-2 text-gray-200">
              <PiMouseLeftClickFill size={16} className="text-gray-300" />
              <span>Drag to move</span>
            </div>
          ),
        });
        pills.push({
          id: "hint-obj-select",
          actionIcon: <MousePointer2 size={18} />,
          description: (
            <div className="flex items-center gap-2 text-gray-200">
              <PiMouseLeftClickFill size={16} className="text-gray-300" />
              <span>Click to select</span>
            </div>
          ),
        });
      } else {
        pills.push({
          id: "hint-obj-select-only",
          actionIcon: <MousePointer2 size={18} />,
          description: (
            <div className="flex items-center gap-2 text-gray-200">
              <PiMouseLeftClickFill size={16} className="text-gray-300" />
              <span>Click to select</span>
            </div>
          ),
        });
      }
    } else {
      if (state.canPan) {
        pills.push({
          id: "hint-pan",
          actionIcon: <Hand size={18} />,
          description: (
            <div className="flex items-center gap-2 text-gray-200">
              <PiMouseLeftClickFill size={16} className="text-gray-300" />
              <span>Drag to pan</span>
            </div>
          ),
        });
      }
      pills.push({
        id: "hint-zoom",
        actionIcon: <ZoomIn size={18} />,
        description: (
          <div className="flex items-center gap-2 text-gray-200">
            <PiMouseScroll size={16} className="text-gray-300" />
            <span>Scroll to zoom</span>
          </div>
        ),
      });
    }

    return pills;
  };

  const pills = getInteractionPills(debugState);

  // --- Obstruction Reporting ---
  useEffect(() => {
    if (statusContainerRef.current) {
      onStatusDimensionsChange({
        width: statusContainerRef.current.offsetWidth,
        height: statusContainerRef.current.offsetHeight,
      });
    }
  }, [pills.map((p) => p.id).join(","), onStatusDimensionsChange]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`tracker-workspace relative w-full h-full bg-gray-950 overflow-hidden outline-none focus:outline-none select-none cursor-${debugState.predictedCursor}`}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
      onPointerLeave={handlePointerLeave}
      onDragStart={(e) => e.preventDefault()}
    >
      <div
        className="absolute origin-top-left will-change-transform"
        style={{
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
          width: videoDimensions.w || "auto",
          height: videoDimensions.h || "auto",
        }}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          className="block w-full h-full object-fill pointer-events-none"
          onLoadedMetadata={onLoadedMetadata}
          muted
          playsInline
        />
      </div>

      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 pointer-events-none"
      />

      {/*
            Interaction Status & Help Container
            Positioning toggles between Left and Right if obstructed by settings widget
            Uses transform translation for smooth 60fps animation
        */}
      <div
        ref={statusContainerRef}
        className={`absolute top-4 left-4 z-40 flex items-center gap-2 transition-transform duration-500 ease-in-out will-change-transform ${isObstructed ? "translate-x-[calc(100vw-100%-2rem)]" : "translate-x-0"}`}
      >
        {/* Help Button */}
        <Tooltip content="Keyboard shortcuts" shortcut={["Esc"]} side="bottom">
          <button
            onClick={onToggleHelp}
            className="flex items-center justify-center h-11 w-11 bg-gray-900/80 backdrop-blur border border-gray-700/50 rounded-full shadow-xl transition-all duration-200 hover:bg-gray-800 outline-none focus-visible:border-active pointer-events-auto group"
          >
            {/* Icon is permanently orange (active) and scales on hover */}
            <HelpCircle
              size={20}
              className="text-active transition-transform group-hover:scale-110"
            />
          </button>
        </Tooltip>

        {/* Status Pills */}
        {pills.map((pill) => (
          <div
            key={pill.id}
            className="flex items-stretch h-11 bg-gray-900/80 backdrop-blur border border-gray-700/50 rounded-full shadow-xl transition-all duration-200 pointer-events-none whitespace-nowrap overflow-hidden"
          >
            {/* Action Icon Section */}
            <div className="flex items-center justify-center px-4 text-active bg-gray-800/40">
              {pill.actionIcon}
            </div>

            {/* Full Height Separator */}
            <div className="w-px bg-gray-700/80"></div>

            {/* Content Section */}
            <div className="flex items-center px-4">
              <span className="text-sm font-medium tracking-wide flex items-center">
                {pill.description}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
