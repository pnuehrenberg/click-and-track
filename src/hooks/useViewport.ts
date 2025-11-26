import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ViewTransform } from '@/types';

const MIN_SCALE = 1;
const MAX_SCALE = 10;

interface UseViewportProps {
  videoDimensions: { w: number; h: number };
  videoSrc: string; // Used to reset view on source change
}

export function useViewport({ videoDimensions, videoSrc }: UseViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const [hasInitialFit, setHasInitialFit] = useState(false);
  const [resizeTick, setResizeTick] = useState(0);

  // Reset view on new video
  useEffect(() => {
    setHasInitialFit(false);
    setTransform({ x: 0, y: 0, scale: 1 });
  }, [videoSrc]);

  // Resize Observer to handle window resizing
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
        setResizeTick(t => t + 1);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate fit transform
  const fitToScreen = useCallback(() => {
      if (!containerRef.current || !videoDimensions.w) return;
      
      const { clientWidth: cw, clientHeight: ch } = containerRef.current;
      if (cw > 0 && ch > 0) {
         const vw = videoDimensions.w;
         const vh = videoDimensions.h;
         // Calculate scale to fit exactly within the viewport
         const scale = Math.min(cw / vw, ch / vh);
         const x = (cw - vw * scale) / 2;
         const y = (ch - vh * scale) / 2;
         
         setTransform({ x, y, scale });
      }
  }, [videoDimensions]);

  // Initial Auto-Fit
  useEffect(() => {
      if (!hasInitialFit && videoDimensions.w > 0) {
          fitToScreen();
          setHasInitialFit(true);
      }
  }, [videoDimensions, hasInitialFit, fitToScreen]);

  // Re-fit on Resize (Always maintain fit when window size changes)
  useEffect(() => {
      if (hasInitialFit) {
          fitToScreen();
      }
  }, [resizeTick, hasInitialFit, fitToScreen]);

  // Helper: Constrain Transform within bounds
  const getConstrainedTransform = useCallback((proposed: ViewTransform) => {
      if (!containerRef.current || !videoDimensions.w) return proposed;

      const { clientWidth: cw, clientHeight: ch } = containerRef.current;
      const { w: vw, h: vh } = videoDimensions;

      const fitScale = Math.min(cw / vw, ch / vh);
      const minAllowedScale = Math.min(fitScale, MIN_SCALE);
      const newScale = Math.max(minAllowedScale, Math.min(proposed.scale, MAX_SCALE));
      
      const scaledW = vw * newScale;
      const scaledH = vh * newScale;
      
      let newX = proposed.x;
      let newY = proposed.y;

      if (scaledW <= cw) {
          newX = (cw - scaledW) / 2;
      } else {
          const minX = cw - scaledW;
          const maxX = 0;
          newX = Math.max(minX, Math.min(newX, maxX));
      }

      if (scaledH <= ch) {
          newY = (ch - scaledH) / 2;
      } else {
          const minY = ch - scaledH;
          const maxY = 0;
          newY = Math.max(minY, Math.min(newY, maxY));
      }

      return { x: newX, y: newY, scale: newScale };
  }, [videoDimensions]);

  // Zoom Handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault(); 
    if (!containerRef.current || !videoDimensions.w) return;

    const ZOOM_SPEED = 0.1;
    const direction = e.deltaY > 0 ? -1 : 1;
    
    const rect = containerRef.current.getBoundingClientRect();
    const { clientWidth: cw, clientHeight: ch } = containerRef.current;
    const { w: vw, h: vh } = videoDimensions;

    const fitScale = Math.min(cw / vw, ch / vh);
    const minAllowedScale = Math.min(fitScale, MIN_SCALE);

    let nextScale = transform.scale + (direction * ZOOM_SPEED * transform.scale);
    nextScale = Math.max(minAllowedScale, Math.min(nextScale, MAX_SCALE));
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = mouseX - (mouseX - transform.x) * (nextScale / transform.scale);
    const newY = mouseY - (mouseY - transform.y) * (nextScale / transform.scale);

    const finalTransform = getConstrainedTransform({ 
        x: newX, 
        y: newY, 
        scale: nextScale 
    });

    setTransform(finalTransform);
  }, [transform, videoDimensions, getConstrainedTransform]);

  // Panning Check
  const canPan = useMemo(() => {
      if (!containerRef.current || !videoDimensions.w) return false;
      const { clientWidth: cw, clientHeight: ch } = containerRef.current;
      const { w: vw, h: vh } = videoDimensions;
      
      const scaledW = vw * transform.scale;
      const scaledH = vh * transform.scale;
      
      // Allow panning if slightly larger than container
      return scaledW > cw + 0.5 || scaledH > ch + 0.5;
  }, [transform.scale, videoDimensions, resizeTick]);

  return {
    containerRef,
    transform,
    setTransform,
    handleWheel,
    canPan,
    getConstrainedTransform
  };
}