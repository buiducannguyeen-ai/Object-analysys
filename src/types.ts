export interface DetectedObject {
  nameVi: string;
  nameEn: string;
  category: string;
  confidence: number;
  description?: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] scaled 0 to 1000
}

export interface DetectionResult {
  dominantObject: string;
  sceneSummary: string;
  objects: DetectedObject[];
  timestamp: number;
  latencyMs?: number;
  snapshotUrl?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  dominantObject: string;
  objectsCount: number;
  objects: DetectedObject[];
  thumbnail: string;
}

export type ScanSpeed = 'fast' | 'normal' | 'battery_saver';
