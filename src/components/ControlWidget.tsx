import React, { useRef, useEffect } from "react";
import {
  Upload,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  FileVideo,
  ArrowLeftToLine,
  ArrowLeft,
  ArrowRight,
  ArrowRightToLine,
} from "lucide-react";
import { SpinBox } from "@/components/SpinBox";
import { AppSettings } from "@/types";
import { formatTime } from "@/utils";
import { useLongPress } from "@/hooks/useLongPress";
import { Tooltip } from "@/components/Tooltip";

interface ControlWidgetProps {
  currentTime: number;
  currentFrame: number;
  videoFps: number;
  isFrameAligned: boolean;
  isPlaying: boolean;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  activeObjectId: number;
  numObjects: number;
  setActiveObjectId: React.Dispatch<React.SetStateAction<number>>;
  setNumObjects: React.Dispatch<React.SetStateAction<number>>;
  onPrevObject: () => void;
  onNextObject: () => void;
  onLoadVideo: () => void;
  onImportCSV: () => void;
  onExportCSV: () => void;
  position: { x: number; y: number } | null;
  onPositionChange: (pos: { x: number; y: number }) => void;
  onDrag?: (x: number, y: number) => void;
  onSizeChange?: (w: number, h: number) => void;
  onJumpToFirst: () => void;
  onJumpToPrev: () => void;
  onJumpToNext: () => void;
  onJumpToFinal: () => void;
}

export const ControlWidget: React.FC<ControlWidgetProps> = ({
  currentTime,
  currentFrame,
  videoFps,
  isFrameAligned,
  isPlaying,
  settings,
  setSettings,
  activeObjectId,
  numObjects,
  setActiveObjectId,
  setNumObjects,
  onPrevObject,
  onNextObject,
  onLoadVideo,
  onImportCSV,
  onExportCSV,
  position,
  onPositionChange,
  onDrag,
  onSizeChange,
  onJumpToFirst,
  onJumpToPrev,
  onJumpToNext,
  onJumpToFinal,
}) => {
  const widgetRef = useRef<HTMLDivElement>(null);

  // Track drag state: start point, initial position, and current live position
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Monitor widget size changes
  useEffect(() => {
    if (!widgetRef.current || !onSizeChange) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        onSizeChange(entry.contentRect.width, entry.contentRect.height);
      }
    });

    observer.observe(widgetRef.current);
    return () => observer.disconnect();
  }, [onSizeChange]);

  // Native Pointer Events for Dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    // Prevent dragging if interacting with controls (buttons, inputs)
    if ((e.target as HTMLElement).closest('button, input, [role="button"]'))
      return;

    e.preventDefault();
    const element = widgetRef.current;
    if (!element) return;

    element.setPointerCapture(e.pointerId);

    const rect = element.getBoundingClientRect();

    // Determine current position (from props or computed style if initial)
    const currentX = position?.x ?? rect.left;
    const currentY = position?.y ?? rect.top;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentX,
      initialY: currentY,
      currentX: currentX,
      currentY: currentY,
    };

    // Prepare for manual positioning:
    // Ensure we are using top-left absolute positioning logic from now on
    element.style.left = "0px";
    element.style.top = "0px";
    element.style.bottom = "auto"; // Clear CSS bottom alignment
    element.style.right = "auto";
    element.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;

    // Disable transition during drag
    element.classList.remove(
      "transition-transform",
      "duration-300",
      "ease-out",
    );
    // Set cursor immediately
    element.classList.remove("cursor-grab");
    element.classList.add("cursor-grabbing");
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !widgetRef.current) return;

    e.preventDefault();
    const { startX, startY, initialX, initialY } = dragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newX = initialX + dx;
    let newY = initialY + dy;

    // Constrain to Window Edges (No Padding, using CSS p-2 for visual gutter)
    const rect = widgetRef.current.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;

    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));

    // Update Drag Ref with live coordinates
    dragRef.current.currentX = newX;
    dragRef.current.currentY = newY;

    // Direct DOM manipulation for zero-latency feedback (no React render)
    widgetRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;

    // Notify parent of live drag position (e.g. for collision detection)
    if (onDrag) {
      onDrag(newX, newY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current || !widgetRef.current) return;

    const { startX, startY, initialX, initialY } = dragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newX = initialX + dx;
    let newY = initialY + dy;

    // Apply same constraints
    const rect = widgetRef.current.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;

    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));

    // Commit new position to React state
    onPositionChange({ x: newX, y: newY });

    dragRef.current = null;
    widgetRef.current.releasePointerCapture(e.pointerId);

    // Restore styles manually in case no re-render happens
    widgetRef.current.classList.remove("cursor-grabbing");
    widgetRef.current.classList.add("cursor-grab");
    widgetRef.current.classList.add(
      "transition-transform",
      "duration-300",
      "ease-out",
    );
  };

  // Move UI-specific long press logic here
  const prevObjProps = useLongPress(onPrevObject);
  const nextObjProps = useLongPress(onNextObject);

  // Navigation Long Presses
  const prevFrameProps = useLongPress(onJumpToPrev, 400, 100);
  const nextFrameProps = useLongPress(onJumpToNext, 400, 100);

  const handleWidgetClick = (e: React.MouseEvent) => {
    // Only focus the widget container if we clicked on the background (the container itself)
    if (e.target === e.currentTarget) {
      (e.currentTarget as HTMLElement).focus();
    }
  };

  // Determine styling based on state
  const isDragging = dragRef.current !== null;
  const currentX = isDragging ? dragRef.current!.currentX : position?.x;
  const currentY = isDragging ? dragRef.current!.currentY : position?.y;

  const positioningClasses = position ? "top-0 left-0" : "bottom-6 left-6";

  const style: React.CSSProperties =
    currentX !== undefined && currentY !== undefined
      ? { transform: `translate3d(${currentX}px, ${currentY}px, 0)` }
      : {};

  const transitionClass = !isDragging
    ? "transition-transform duration-300 ease-out"
    : "";

  return (
    <div
      ref={widgetRef}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleWidgetClick}
      tabIndex={0}
      className={`fixed ${positioningClasses} flex flex-col w-[26rem] p-2 gap-2 font-sans outline-none touch-none select-none z-30 ${transitionClass} ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
    >
      {/* Floating Navigation Pill (Bg 900) */}
      <div className="flex items-center justify-between bg-gray-900/95 backdrop-blur border border-gray-750/50 rounded-xl shadow-xl px-2 py-2 w-full transition-colors">
        <Tooltip content="Rewind to first record" shortcut={["Shift", "R"]}>
          <button
            onClick={onJumpToFirst}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition outline-none border border-transparent focus-visible:border-active cursor-pointer"
          >
            <ArrowLeftToLine size={20} />
          </button>
        </Tooltip>

        <Tooltip content="Rewind to previous record" shortcut={["R"]}>
          <button
            {...prevFrameProps}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition outline-none border border-transparent focus-visible:border-active cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
        </Tooltip>

        <Tooltip content="Forward to next record" shortcut={["F"]}>
          <button
            {...nextFrameProps}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition outline-none border border-transparent focus-visible:border-active cursor-pointer"
          >
            <ArrowRight size={20} />
          </button>
        </Tooltip>

        <Tooltip content="Forward to final record" shortcut={["Shift", "F"]}>
          <button
            onClick={onJumpToFinal}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition outline-none border border-transparent focus-visible:border-active cursor-pointer"
          >
            <ArrowRightToLine size={20} />
          </button>
        </Tooltip>
      </div>

      {/* Main Stats & Settings Panel */}
      <div className="bg-gray-900/95 backdrop-blur border border-gray-750/50 rounded-xl shadow-2xl overflow-hidden transition-colors">
        {/* Row 1: Stats (Bg 950 - Darker Separator) */}
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 px-6 py-4 bg-gray-950/80 border-b border-gray-800">
          <div className="flex flex-col justify-start">
            <span className="text-base text-gray-500 font-medium mb-1">
              Time
            </span>
            <span
              className={`font-mono text-xl tracking-tight leading-none ${isFrameAligned ? "text-active" : "text-gray-200"}`}
            >
              {formatTime(currentTime)}
            </span>
          </div>

          <div className="flex flex-col justify-start">
            <span className="text-base text-gray-500 font-medium mb-1">
              Frame
            </span>
            <span className="font-mono text-xl text-gray-200 tracking-tight leading-none">
              {currentFrame}
            </span>
          </div>

          <div className="flex flex-col justify-start">
            <span className="text-base text-gray-500 font-medium mb-1">
              FPS
            </span>
            <span className="font-mono text-xl text-gray-200 tracking-tight leading-none">
              {videoFps.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Divider / State Indicator */}
        <div
          className={`h-1 w-full transition-colors duration-200 ${isPlaying ? "bg-gray-800" : isFrameAligned ? "bg-active shadow-[0_0_10px_rgba(239,138,98,0.5)]" : "bg-gray-800"}`}
        />

        {/* Settings Content (Bg 900 - Lighter) */}
        <div className="p-4 space-y-4 bg-gray-900/40">
          {/* Row 2: Settings (Spin Boxes) */}
          <div className="grid grid-cols-3 gap-12">
            <div className="col-span-2 flex flex-col">
              <span className="text-sm text-gray-400 font-medium mb-2">
                Sampling rate (1 / s)
              </span>
              <div className="flex items-center gap-2">
                <SpinBox
                  value={settings.samplingRateNum}
                  onChange={(v) =>
                    setSettings((s) => ({
                      ...s,
                      samplingRateNum: Math.max(1, v),
                    }))
                  }
                  min={1}
                  className="w-full"
                />
                <span className="text-gray-500 font-medium text-lg">/</span>
                <SpinBox
                  value={settings.samplingRateDen}
                  onChange={(v) =>
                    setSettings((s) => ({
                      ...s,
                      samplingRateDen: Math.max(1, v),
                    }))
                  }
                  min={1}
                  className="w-full"
                />
              </div>
            </div>
            <div className="col-span-1 flex flex-col">
              <span className="text-sm text-gray-400 font-medium mb-2">
                Trail length
              </span>
              <Tooltip content="Adjust trail" shortcut={["Ctrl", "+/-"]}>
                <SpinBox
                  value={settings.trailLength}
                  onChange={(v) =>
                    setSettings((s) => ({ ...s, trailLength: Math.max(0, v) }))
                  }
                  min={0}
                />
              </Tooltip>
            </div>
          </div>

          {/* Row 3: Object Controls */}
          <div className="flex items-center space-x-3">
            <div
              className="flex-1 flex items-stretch bg-gray-800/80 rounded-lg border border-gray-750 overflow-hidden shadow-sm outline-none focus-visible:border-active transition-colors"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  onPrevObject();
                } else if (e.key === "ArrowRight") {
                  e.preventDefault();
                  onNextObject();
                }
              }}
            >
              <Tooltip content="Previous object" shortcut={["Shift", "Tab"]}>
                <button
                  {...prevObjProps}
                  tabIndex={-1}
                  onClick={(e) => {
                    if (e.detail === 0) onPrevObject();
                  }} // Keyboard access via parent group
                  onPointerDown={(e) => e.stopPropagation()}
                  className="px-3 hover:bg-gray-700 border-r border-gray-700 text-gray-400 hover:text-white transition active:bg-gray-600 outline-none cursor-pointer"
                >
                  <ChevronLeft size={20} />
                </button>
              </Tooltip>

              <div className="flex-1 flex items-center justify-center font-mono text-base font-medium text-gray-200 py-1.5">
                Object&nbsp;
                <span className="text-active text-lg">{activeObjectId}</span>
                &nbsp;<span className="text-gray-500">/</span>&nbsp;{numObjects}
              </div>

              <Tooltip content="Next object" shortcut={["Tab"]}>
                <button
                  {...nextObjProps}
                  tabIndex={-1}
                  onClick={(e) => {
                    if (e.detail === 0) onNextObject();
                  }} // Keyboard access via parent group
                  onPointerDown={(e) => e.stopPropagation()}
                  className="px-3 hover:bg-gray-700 border-l border-gray-700 text-gray-400 hover:text-white transition active:bg-gray-600 outline-none cursor-pointer"
                >
                  <ChevronRight size={20} />
                </button>
              </Tooltip>
            </div>

            <Tooltip content="Add new object track" shortcut={["N"]}>
              <button
                onClick={() =>
                  setNumObjects((n) => {
                    setActiveObjectId(n + 1);
                    return n + 1;
                  })
                }
                onPointerDown={(e) => e.stopPropagation()}
                className="p-3 bg-gray-800 hover:bg-gray-700 border border-gray-750 rounded-lg text-gray-300 hover:text-white transition outline-none focus-visible:border-active group cursor-pointer"
              >
                <Plus
                  size={20}
                  className="text-gray-400 group-hover:text-active group-hover:scale-110 transition-all"
                />
              </button>
            </Tooltip>
          </div>

          {/* Row 4: I/O */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <button
              onClick={() => {
                onLoadVideo();
                widgetRef.current?.focus({ preventScroll: true });
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex flex-col items-center justify-center space-y-1 bg-gray-800 hover:bg-gray-700 border border-gray-750 text-gray-300 hover:text-white text-xs font-medium py-2 rounded-lg cursor-pointer transition group outline-none focus-visible:border-active"
            >
              <FileVideo
                size={18}
                className="text-gray-400 group-hover:text-active group-hover:scale-110 transition-all"
              />
              <span>Load Video</span>
            </button>

            <button
              onClick={() => {
                onImportCSV();
                widgetRef.current?.focus({ preventScroll: true });
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex flex-col items-center justify-center space-y-1 bg-gray-800 hover:bg-gray-700 border border-gray-750 text-gray-300 hover:text-white text-xs font-medium py-2 rounded-lg cursor-pointer transition group outline-none focus-visible:border-active"
            >
              <Upload
                size={18}
                className="text-gray-400 group-hover:text-active group-hover:scale-110 transition-all"
              />
              <span>Import CSV</span>
            </button>

            <button
              onClick={() => {
                onExportCSV();
                widgetRef.current?.focus({ preventScroll: true });
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex flex-col items-center justify-center space-y-1 bg-gray-800 hover:bg-gray-700 border border-gray-750 text-gray-300 hover:text-white text-xs font-medium py-2 rounded-lg cursor-pointer transition group outline-none focus-visible:border-active"
            >
              <Download
                size={18}
                className="text-gray-400 group-hover:text-active group-hover:scale-110 transition-all"
              />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
