import React, { useEffect } from 'react';
import { AppSettings } from '@/types';

interface GlobalShortcutsProps {
  numObjects: number;
  activeObjectId: number;
  setActiveObjectId: React.Dispatch<React.SetStateAction<number>>;
  setNumObjects: React.Dispatch<React.SetStateAction<number>>;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSpaceHeld: React.Dispatch<React.SetStateAction<boolean>>;
  setIsHelpOpen: React.Dispatch<React.SetStateAction<boolean>>;
  deleteCurrent: () => void;
  jumpToPrevious: () => void;
  jumpToNext: () => void;
  jumpToFirst: () => void;
  jumpToFinal: () => void;
  disableShortcuts: boolean;
}

export function useGlobalShortcuts({
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
  disableShortcuts
}: GlobalShortcutsProps) {

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block shortcuts if explicitly disabled (e.g. modal open)
      if (disableShortcuts) return;

      const target = e.target as HTMLElement;
      
      // Determine context: "Input Mode" vs "Workspace Mode"
      const isInput = target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'TEXTAREA';
      // We consider it "Workspace Mode" if the focus is explicitly on the workspace OR fallback to body
      const isWorkspace = target.classList.contains('tracker-workspace') || target === document.body;

      // Handle Tab Key specifically for object cycling (Only when workspace is focused)
      if (e.key === 'Tab') {
          if (isWorkspace && !isInput) {
              e.preventDefault();
              if (e.shiftKey) {
                  setActiveObjectId(prev => prev === 1 ? numObjects : prev - 1);
              } else {
                  setActiveObjectId(prev => (prev % numObjects) + 1);
              }
              return;
          }
          // Otherwise, let default Tab behavior happen (moving focus)
          return;
      }

      // If we are typing in an input, ignore other shortcuts
      if (isInput) return;

      switch(e.key) {
        case ' ':
          e.preventDefault();
          if (!e.repeat) {
             setIsSpaceHeld(true);
             // Only start playback. Do NOT pause on space.
             if (!isPlaying) {
                setIsPlaying(true);
             }
          }
          break;
        case 'Escape':
          setIsHelpOpen(prev => !prev);
          break;
        case 'x':
        case 'X':
          deleteCurrent();
          break;
        case 'r':
        case 'R':
          if (e.shiftKey) {
            jumpToFirst();
          } else {
            jumpToPrevious();
          }
          break;
        case 'f':
        case 'F':
          if (e.shiftKey) {
            jumpToFinal();
          } else {
            jumpToNext();
          }
          break;
        case 'n':
        case 'N':
             setNumObjects(prev => {
               const next = prev + 1;
               setActiveObjectId(next);
               return next;
             });
          break;
        case '+':
          if (e.ctrlKey) {
             e.preventDefault(); // Prevent browser zoom
             setSettings(s => ({ ...s, trailLength: s.trailLength + 1 }));
          }
          break;
        case '-':
          if (e.ctrlKey) {
            e.preventDefault(); // Prevent browser zoom
            setSettings(s => ({ ...s, trailLength: Math.max(0, s.trailLength - 1) }));
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (disableShortcuts) return;
      if (e.key === ' ') {
        setIsSpaceHeld(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
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
    disableShortcuts
  ]);
}