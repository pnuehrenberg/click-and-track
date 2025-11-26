import React, { useCallback, useRef, useEffect } from 'react';

export function useLongPress(callback: () => void, ms = 400, interval = 50) {
  const timeoutRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const start = useCallback(() => {
    // Fire immediately on press
    callbackRef.current();
    
    // Schedule repeating action
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        callbackRef.current();
      }, interval);
    }, ms);
  }, [ms, interval]);

  const stop = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  return {
    onMouseDown: (e: React.MouseEvent) => {
        if (e.button === 0) start();
    },
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
}