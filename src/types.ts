export interface TrackPoint {
  id: string; // Unique ID for the point record
  timestamp: number; // ms
  objectId: number;
  x: number; // Video coordinate space
  y: number; // Video coordinate space
}

export interface AppSettings {
  samplingRateNum: number;
  samplingRateDen: number;
  trailLength: number;
}

export interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

export interface UIElement {
  type: 'circle' | 'square';
  pos: { x: number; y: number };
  objectId: number;
  radius: number;
  color: string;
  isCurrent: boolean;
  label?: string;
  fontSize?: number;
  sortKey: number;
}
