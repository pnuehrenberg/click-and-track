import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { Upload, Monitor } from "lucide-react";
import { PiMouseLeftClickFill } from "react-icons/pi";

import { AppSettings } from "@/types";
import { TrackerWorkspace } from "@/components/TrackerWorkspace";
import { HelpDialog } from "@/components/HelpDialog";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { ControlWidget } from "@/components/ControlWidget";
import { Key } from "@/components/Key";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { useProjectState } from "@/hooks/useProjectState";
import { useSmartNavigation } from "@/hooks/useSmartNavigation";
import { parseCSV, pointsToCSV, isTrackingFrame, getFrameIndex } from "@/utils";
import { getExactFrameRate } from "@/services/mediaAnalysis";

const DEFAULT_SETTINGS: AppSettings = {
  samplingRateNum: 1,
  samplingRateDen: 1,
  trailLength: 5,
};

const App: React.FC = () => {
  // -- State --
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFps, setVideoFps] = useState<number>(30); // Default safe 30fps

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isUnsavedDialogOpen, setIsUnsavedDialogOpen] = useState(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [playbackTrigger, _setPlaybackTrigger] = useState(0);

  // Widget Position State (Absolute Coordinates)
  const [widgetPosition, setWidgetPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const widgetSizeRef = useRef({ w: 0, h: 0 }); // Track size to clamp correctly on resize

  // Collision / Obstruction State
  const [isObstructed, setIsObstructed] = useState(false);
  const statusDimensionsRef = useRef({ width: 0, height: 0 });

  // Track what action triggered the unsaved check
  const [pendingAction, setPendingAction] = useState<"VIDEO" | "CSV" | null>(
    null,
  );

  // -- Hooks for Logic Extraction --
  const {
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
  } = useProjectState(videoFps);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // -- Global Browser Interaction Handling --
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+F (Find) and Ctrl+S (Save)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "f" || e.key === "F" || e.key === "s" || e.key === "S") {
          e.preventDefault();
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleWheel = (e: WheelEvent) => {
      // Prevent browser zoom via Pinch (Ctrl+Wheel) globally
      // The canvas handles its own zoom logic via the event handler on the div.
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // -- Derived Values --
  const visiblePoints = useMemo(() => {
    return points.filter((p) =>
      isTrackingFrame(
        p.timestamp,
        videoFps,
        settings.samplingRateNum,
        settings.samplingRateDen,
      ),
    );
  }, [points, videoFps, settings]);

  const { seekRequest, jumpToPrevious, jumpToNext, jumpToFirst, jumpToFinal } =
    useSmartNavigation({
      visiblePoints,
      activeObjectId,
      currentTime,
      isPlaying,
      settings,
    });

  const currentFrame = useMemo(
    () => getFrameIndex(currentTime, videoFps),
    [currentTime, videoFps],
  );
  const isFrameAligned =
    !isPlaying &&
    isTrackingFrame(
      currentTime,
      videoFps,
      settings.samplingRateNum,
      settings.samplingRateDen,
    );

  // -- Handlers --

  // Reusable obstruction check
  const checkObstruction = useCallback((x: number, y: number) => {
    const { width, height } = statusDimensionsRef.current;

    // Define Safe Zone (Top Left where the status pill lives)
    // Add some margin (32px) around the element to trigger the switch comfortably
    const safetyW = (width || 300) + 32;
    const safetyH = (height || 40) + 32;

    // Check if the widget (top-left aligned) is inside this box
    const isOverlapping = x < safetyW && y < safetyH;
    return isOverlapping;
  }, []);

  // Callback from TrackerWorkspace reporting the size of the top-left status container
  const handleStatusDimensionsChange = useCallback(
    (dims: { width: number; height: number }) => {
      statusDimensionsRef.current = dims;
    },
    [],
  );

  // Callback from ControlWidget reporting its own size
  const handleWidgetDimensionsChange = useCallback((w: number, h: number) => {
    widgetSizeRef.current = { w, h };
  }, []);

  // Live callback from ControlWidget while dragging
  const handleWidgetDrag = useCallback(
    (x: number, y: number) => {
      const isOverlapping = checkObstruction(x, y);

      setIsObstructed((prev) => {
        // Only update state if it changes to avoid unnecessary re-renders
        if (prev !== isOverlapping) return isOverlapping;
        return prev;
      });
    },
    [checkObstruction],
  );

  // Handle Window Resize (Clamp Widget)
  useEffect(() => {
    const handleResize = () => {
      setWidgetPosition((prev) => {
        if (!prev) return null; // Keep default positioning behavior if never moved

        const w = widgetSizeRef.current.w || 416; // Default approx width
        const h = widgetSizeRef.current.h || 500; // Default approx height

        const maxX = window.innerWidth - w;
        const maxY = window.innerHeight - h;

        const newX = Math.max(0, Math.min(prev.x, maxX));
        const newY = Math.max(0, Math.min(prev.y, maxY));

        if (newX !== prev.x || newY !== prev.y) {
          return { x: newX, y: newY };
        }
        return prev;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Re-check obstruction when widget position settles (e.g. after resize or drag end)
  useEffect(() => {
    if (widgetPosition) {
      const isOverlapping = checkObstruction(
        widgetPosition.x,
        widgetPosition.y,
      );
      setIsObstructed(isOverlapping);
    }
  }, [widgetPosition, checkObstruction]);

  const handleExport = useCallback(async () => {
    const csv = pointsToCSV(points);
    const videoName = videoFile ? videoFile.name.split(".")[0] : "video";
    const fileName = `${videoName}-click_tracks.csv`;

    try {
      // @ts-ignore - File System Access API
      if (window.showSaveFilePicker) {
        try {
          // @ts-ignore
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: "CSV File",
                accept: { "text/csv": [".csv"] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(csv);
          await writable.close();
          markAsClean();
          return true; // Success
        } catch (err: any) {
          if (err.name === "AbortError") {
            return false; // User cancelled
          }
          // Handle context restrictions (e.g. iframes) gracefully
          if (
            err.name === "SecurityError" ||
            (err.message && err.message.includes("Cross origin"))
          ) {
            console.warn(
              "File System Access API restricted. Falling back to download.",
            );
          } else {
            console.error("File Save Error:", err);
          }
          // Fallback to simple download if API fails unexpectedly or is restricted
        }
      }

      // Fallback
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      markAsClean();
      return true;
    } catch (e) {
      console.error("Export failed", e);
      return false;
    }
  }, [points, videoFile, markAsClean]);

  const openVideoPicker = useCallback(() => {
    // Use setTimeout to ensure the click happens in a fresh tick, avoiding issues where
    // synchronous state updates or previous dialog closures might interfere.
    setTimeout(() => {
      if (videoInputRef.current) {
        videoInputRef.current.value = ""; // Reset to allow re-selecting same file
        videoInputRef.current.click();
      }
    }, 50);
  }, []);

  const openCSVPicker = useCallback(() => {
    setTimeout(() => {
      if (csvInputRef.current) {
        csvInputRef.current.value = "";
        csvInputRef.current.click();
      }
    }, 50);
  }, []);

  const handleLoadVideoClick = useCallback(() => {
    if (points.length > 0 && isDirty) {
      setPendingAction("VIDEO");
      setIsUnsavedDialogOpen(true);
    } else {
      openVideoPicker();
    }
  }, [points.length, isDirty, openVideoPicker]);

  const handleImportCSVClick = useCallback(() => {
    if (points.length > 0 && isDirty) {
      setPendingAction("CSV");
      setIsUnsavedDialogOpen(true);
    } else {
      openCSVPicker();
    }
  }, [points.length, isDirty, openCSVPicker]);

  const handleDiscardAndProceed = useCallback(() => {
    setIsUnsavedDialogOpen(false);
    if (pendingAction === "VIDEO") openVideoPicker();
    else if (pendingAction === "CSV") openCSVPicker();
    setPendingAction(null);
  }, [pendingAction, openVideoPicker, openCSVPicker]);

  const handleExportAndProceed = useCallback(async () => {
    const success = await handleExport();
    if (success) {
      setIsUnsavedDialogOpen(false);
      if (pendingAction === "VIDEO") openVideoPicker();
      else if (pendingAction === "CSV") openCSVPicker();
      setPendingAction(null);
    }
  }, [handleExport, pendingAction, openVideoPicker, openCSVPicker]);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Reset workspace for new video
      resetProject();

      const url = URL.createObjectURL(file);
      setVideoFile(file);
      setVideoUrl(url);

      // Detect FPS
      try {
        const fpsStr = await getExactFrameRate(file);
        const parsedFps = parseFloat(fpsStr);
        if (!isNaN(parsedFps) && parsedFps > 0) {
          console.log(`Detected Frame Rate: ${parsedFps} fps`);
          setVideoFps(parsedFps);
        } else {
          console.warn(
            `Could not parse FPS from "${fpsStr}", defaulting to 30.`,
          );
          setVideoFps(30);
        }
      } catch (err) {
        console.error("Failed to detect FPS:", err);
        setVideoFps(30);
      }
    }
    // Reset value so the same file can be selected again if needed
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        const newPoints = parseCSV(text);
        setPoints(newPoints);
        const maxId = newPoints.reduce(
          (acc, p) => Math.max(acc, p.objectId),
          1,
        );
        setNumObjects(maxId);
        setActiveObjectId(1);
        markAsClean();
      };
      reader.readAsText(file);
    }
    if (csvInputRef.current) csvInputRef.current.value = "";
  };

  const deleteCurrent = useCallback(() => {
    if (isPlaying) return;

    // Check if current frame is a tracking frame
    if (
      isTrackingFrame(
        currentTime,
        videoFps,
        settings.samplingRateNum,
        settings.samplingRateDen,
      )
    ) {
      deletePoint(currentTime, activeObjectId);
    }
  }, [currentTime, activeObjectId, deletePoint, isPlaying, videoFps, settings]);

  // -- Object Navigation Handlers --
  const handlePrevObject = useCallback(() => {
    setActiveObjectId((prev) => (prev === 1 ? numObjects : prev - 1));
  }, [numObjects, setActiveObjectId]);

  const handleNextObject = useCallback(() => {
    setActiveObjectId((prev) => (prev % numObjects) + 1);
  }, [numObjects, setActiveObjectId]);

  // -- Global Keyboard Shortcuts --
  useGlobalShortcuts({
    numObjects,
    activeObjectId,
    setActiveObjectId,
    setNumObjects,
    setSettings,
    isPlaying,
    setIsPlaying,
    setIsSpaceHeld,
    setIsHelpOpen,
    deleteCurrent,
    jumpToPrevious,
    jumpToNext,
    jumpToFirst,
    jumpToFinal,
    disableShortcuts: isUnsavedDialogOpen, // Disable when modal is open
  });

  // -- Render --

  if (!videoUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          {/* Left Column: Hero & Upload */}
          <div className="flex flex-col space-y-8">
            {/* Logo & Header */}
            <div className="flex flex-row items-center gap-6">
              {/* Logo Construction */}
              <div className="relative flex-shrink-0 inline-flex items-center justify-center">
                <Monitor
                  size={80}
                  className="text-white drop-shadow-lg"
                  strokeWidth={1.5}
                />
                <div className="absolute inset-0 overflow-hidden">
                  {/* Active Point (Orange Circle) */}
                  <div className="absolute top-[35%] left-[60%] w-2 h-2 rounded-full bg-active"></div>
                  {/* Inactive Point (Blue Circle) */}
                  <div className="absolute top-[25%] left-[30%] w-1.5 h-1.5 rounded-full bg-inactive"></div>
                  {/* Inactive Last Known (Blue Rounded Square) */}
                  <div className="absolute top-[55%] left-[25%] w-1.5 h-1.5 rounded-sm bg-inactive"></div>
                </div>
              </div>

              <div className="space-y-1">
                <h1 className="text-5xl font-bold tracking-tight text-white">
                  click<span className="text-active">&</span>track
                </h1>
                <p className="text-lg text-gray-400 font-light leading-snug">
                  Load a video to record the locations of multiple objects at a
                  specified rate.
                </p>
              </div>
            </div>

            <label className="block w-full max-w-sm ml-2">
              <div
                className="flex items-center justify-center w-full h-14 bg-gray-800 hover:bg-gray-750 border border-gray-750 text-gray-200 hover:text-white transition-all cursor-pointer rounded-xl font-medium shadow-lg hover:shadow-active/10 group outline-none focus-visible:border-active"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    videoInputRef.current?.click();
                  }
                }}
              >
                <Upload
                  className="mr-3 text-gray-400 group-hover:text-active group-hover:scale-110 transition-all"
                  size={22}
                />
                <span className="text-lg">Open Video File</span>
              </div>
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
                ref={videoInputRef}
              />
            </label>
          </div>

          {/* Right Column: Visual Guide (Bg 900) */}
          <div className="bg-gray-900 border border-gray-750 rounded-3xl shadow-2xl overflow-hidden">
            {/* How to Log Action (Top - Bg 850) */}
            <div className="p-8 border-b border-gray-750 bg-gray-850">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Key>Ctrl</Key>
                  <span className="text-gray-500 font-light text-2xl">+</span>
                  <PiMouseLeftClickFill className="text-gray-300" size={28} />
                </div>
                <div className="text-right">
                  <span className="text-gray-200 text-lg font-bold block">
                    Log Location
                  </span>
                  <span className="text-base text-gray-500">
                    Record the active object at the current time
                  </span>
                </div>
              </div>
            </div>

            {/* Guide Grid (Bg 900) */}
            <div className="p-8 space-y-8 bg-gray-900">
              {/* Active Object Row */}
              <div className="grid grid-cols-[1fr_2fr] gap-6 items-center">
                <div className="flex items-center justify-end gap-3">
                  {/* Trail (Solid) */}
                  <div className="w-2 h-2 rounded-full bg-active"></div>
                  <div className="w-3 h-3 rounded-full bg-active"></div>
                  {/* Current (White border) */}
                  <div className="w-5 h-5 rounded-full bg-active border-2 border-white shadow-[0_0_10px_rgba(239,138,98,0.5)]"></div>
                </div>
                <div>
                  <span className="text-active text-base font-bold block">
                    Active Object
                  </span>
                  <span className="text-gray-500 text-base block mt-1">
                    Current location and trail
                  </span>
                </div>
              </div>

              {/* Last Known Row */}
              <div className="grid grid-cols-[1fr_2fr] gap-6 items-center">
                <div className="flex items-center justify-end">
                  <div className="w-4 h-4 bg-active rounded-sm"></div>
                </div>
                <div>
                  <span className="text-gray-300 text-base font-medium block">
                    Last Known Location
                  </span>
                  <span className="text-gray-500 text-base block mt-1">
                    When object was not tracked within trail duration
                  </span>
                </div>
              </div>

              {/* Inactive Object Row */}
              <div className="grid grid-cols-[1fr_2fr] gap-6 items-center">
                <div className="flex items-center justify-end gap-3">
                  <div className="w-5 h-5 bg-inactive rounded-full"></div>
                  <div className="w-4 h-4 bg-inactive rounded-sm"></div>
                </div>
                <div>
                  <span className="text-inactive text-base font-medium block">
                    Other Objects
                  </span>
                  <span className="text-gray-500 text-base block mt-1">
                    Click to select as active object
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-200">
      {/* Main Workspace */}
      <main className="flex-1 relative overflow-hidden">
        <TrackerWorkspace
          videoSrc={videoUrl}
          points={visiblePoints}
          activeObjectId={activeObjectId}
          settings={settings}
          onAddPoint={addPoint}
          onSelectObject={setActiveObjectId}
          onTimeUpdate={setCurrentTime}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          playbackTrigger={playbackTrigger}
          seekRequest={seekRequest}
          videoFps={videoFps}
          isSpaceHeld={isSpaceHeld}
          onToggleHelp={() => setIsHelpOpen(true)}
          isObstructed={isObstructed}
          onStatusDimensionsChange={handleStatusDimensionsChange}
        />

        <ControlWidget
          currentTime={currentTime}
          currentFrame={currentFrame}
          videoFps={videoFps}
          isFrameAligned={isFrameAligned}
          isPlaying={isPlaying}
          settings={settings}
          setSettings={setSettings}
          activeObjectId={activeObjectId}
          numObjects={numObjects}
          setActiveObjectId={setActiveObjectId}
          setNumObjects={setNumObjects}
          onPrevObject={handlePrevObject}
          onNextObject={handleNextObject}
          onLoadVideo={handleLoadVideoClick}
          onImportCSV={handleImportCSVClick}
          onExportCSV={handleExport}
          position={widgetPosition}
          onPositionChange={setWidgetPosition}
          onDrag={handleWidgetDrag}
          onSizeChange={handleWidgetDimensionsChange}
          onJumpToFirst={jumpToFirst}
          onJumpToPrev={jumpToPrevious}
          onJumpToNext={jumpToNext}
          onJumpToFinal={jumpToFinal}
        />

        {/* Hidden Inputs for I/O */}
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={handleVideoUpload}
          className="hidden"
        />
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv"
          onChange={handleCSVImport}
          className="hidden"
        />
      </main>

      <HelpDialog isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      <UnsavedChangesDialog
        isOpen={isUnsavedDialogOpen}
        onClose={() => setIsUnsavedDialogOpen(false)}
        onDiscard={handleDiscardAndProceed}
        onExport={handleExportAndProceed}
        actionDescription={
          pendingAction === "CSV" ? "importing a CSV" : "loading a new video"
        }
      />
    </div>
  );
};

export default App;
