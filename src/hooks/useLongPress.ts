import React, { useCallback, useRef, useEffect } from 'react';

export function useLongPress(callback: () => void, ms = 400, interval = 50) {
  const timeoutRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Use a ref to track if the long press has already started,
  // to prevent re-triggering on keydown if mouse is still down.
  const isPressingRef = useRef(false);

  const start = useCallback((event: React.MouseEvent | React.KeyboardEvent | React.TouchEvent) => {
    // Only proceed if it's a mouse click (button 0) or keyboard event (Space/Enter)
    if (event.type === 'mousedown' && (event as React.MouseEvent).button !== 0) return;
    if (event.type === 'keydown' && (event as React.KeyboardEvent).key !== ' ' && (event as React.KeyboardEvent).key !== 'Enter') return;
    
    // If a press is already active, do nothing to prevent re-triggering
    if (isPressingRef.current) return;
    isPressingRef.current = true;

    // Prevent default browser action for keyboard presses (Space/Enter)
    if (event.type === 'keydown') {
      event.preventDefault();
    }

    // Fire immediately on press
    callbackRef.current();

    // Schedule repeating action
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        callbackRef.current();
      }, interval);
    }, ms);
  }, [ms, interval]);

  const stop = useCallback((event?: React.MouseEvent | React.KeyboardEvent | React.TouchEvent) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    isPressingRef.current = false; // Reset press state

    // Safely blur the current target if an event object is provided and it's a DOM element
    if (event && event.currentTarget instanceof HTMLElement) {
      event.currentTarget.blur();
    }
  }, []);

  return {
    onMouseDown: (e: React.MouseEvent) => {
        start(e);
    },
    onMouseUp: stop,
    onMouseLeave: stop, // Stop if mouse leaves the element while holding
    onTouchStart: start,
    onTouchEnd: stop,
    // Add keyboard handlers
    onKeyDown: (e: React.KeyboardEvent) => {
      // Trigger only on Space or Enter key, and if not already pressing
      if (!isPressingRef.current && (e.key === ' ' || e.key === 'Enter')) {
        start(e);
      }
    },
    onKeyUp: (e: React.KeyboardEvent) => {
      // Stop only if the released key was Space or Enter
      if (e.key === ' ' || e.key === 'Enter') {
        stop(e);
      }
    },
  };
}