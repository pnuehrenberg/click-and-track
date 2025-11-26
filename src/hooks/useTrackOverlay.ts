import { useMemo } from 'react';
import { TrackPoint, UIElement, AppSettings } from '@/types';
import { getFrameIndex, generateColor } from '@/utils';

interface UseTrackOverlayProps {
    points: TrackPoint[];
    currentTime: number;
    videoFps: number;
    activeObjectId: number;
    settings: AppSettings;
    videoDimensions: { w: number, h: number };
    draggedPoint: TrackPoint | null;
    isSpaceHeld: boolean;
}

export function useTrackOverlay({
    points,
    currentTime,
    videoFps,
    activeObjectId,
    settings,
    videoDimensions,
    draggedPoint,
    isSpaceHeld
}: UseTrackOverlayProps) {

    // Frame tolerance for visual selection (matching points to current time)
    const currentFrameIndex = useMemo(() => getFrameIndex(currentTime, videoFps), [currentTime, videoFps]);

    const samplingIntervalMs = settings.samplingRateNum > 0 
    ? (settings.samplingRateDen * 1000) / settings.samplingRateNum 
    : 0;

    return useMemo((): UIElement[] => {
        if (!videoDimensions.w) return [];
        
        const elements: UIElement[] = [];
        const baseRadius = 8; 
        const windowDuration = settings.trailLength * samplingIntervalMs;
        
        const idsWithLabels = new Set<number>();
    
        // 1. Current Points
        const currentPoints = points.filter(p => 
            getFrameIndex(p.timestamp, videoFps) === currentFrameIndex
        );
        
        currentPoints.forEach(p => {
            // If this point is currently being dragged, use the transient coordinates
            let displayX = p.x;
            let displayY = p.y;
            
            if (draggedPoint && draggedPoint.id === p.id) {
                displayX = draggedPoint.x;
                displayY = draggedPoint.y;
            }
    
            elements.push({
                type: 'circle',
                pos: { x: displayX, y: displayY },
                objectId: p.objectId,
                radius: baseRadius,
                color: generateColor(p.objectId === activeObjectId),
                // Disable highlight if space is held (continuous playback)
                isCurrent: !isSpaceHeld,
                label: p.objectId.toString(),
                sortKey: 10,
                fontSize: 14
            });
            idsWithLabels.add(p.objectId);
        });
    
        // 2. Trail Points
        if (windowDuration > 0) {
            const minTrailTime = currentTime - windowDuration;
            
            // Filter: Strictly earlier frames AND within time window
            const trailPoints = points.filter(p => 
                getFrameIndex(p.timestamp, videoFps) < currentFrameIndex && 
                p.timestamp >= minTrailTime
            ).sort((a, b) => b.timestamp - a.timestamp);
            
            trailPoints.forEach(p => {
                const age = currentTime - p.timestamp;
                const relativeAge = Math.min(1.0, age / windowDuration);
                const scale = 1.0 - (0.6 * relativeAge);
                
                const el: UIElement = {
                    type: 'circle',
                    pos: { x: p.x, y: p.y },
                    objectId: p.objectId,
                    radius: baseRadius * scale,
                    color: generateColor(p.objectId === activeObjectId),
                    isCurrent: false,
                    sortKey: 5 - relativeAge 
                };
                
                if (!idsWithLabels.has(p.objectId)) {
                    el.label = p.objectId.toString();
                    el.fontSize = 14;
                    idsWithLabels.add(p.objectId);
                }
                elements.push(el);
            });
        }
    
        // 3. Last Known Position Markers (Squares)
        const allObjIds = new Set<number>(points.map(p => p.objectId));
        allObjIds.add(activeObjectId);
    
        allObjIds.forEach(id => {
            if (!idsWithLabels.has(id)) {
                // Find last point strictly before current frame
                const objPoints = points.filter(p => p.objectId === id && getFrameIndex(p.timestamp, videoFps) < currentFrameIndex);
                
                if (objPoints.length > 0) {
                    // Get the latest one
                    const last = objPoints.reduce((prev, curr) => (prev.timestamp > curr.timestamp) ? prev : curr);
                    
                    elements.push({
                        type: 'square',
                        pos: { x: last.x, y: last.y },
                        objectId: id,
                        radius: baseRadius * 0.8,
                        color: generateColor(id === activeObjectId),
                        isCurrent: false,
                        label: id.toString(),
                        fontSize: 14,
                        sortKey: 8 
                    });
                }
            }
        });
    
        return elements.sort((a, b) => a.sortKey - b.sortKey);
      }, [points, currentTime, currentFrameIndex, activeObjectId, settings.trailLength, samplingIntervalMs, videoDimensions.w, videoFps, draggedPoint, isSpaceHeld]);
}