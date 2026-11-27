export type JutsuType = 'none' | 'rasengan' | 'chidori' | 'shadow-clone';

export interface NormalizedPoint {
  x: number;
  y: number;
  z?: number;
}

export interface HandDetectionState {
  hands: NormalizedPoint[][];
  detectedJutsu: JutsuType;
  signLabel: string;
  confidence: number;
  anchor: NormalizedPoint | null;
}

export interface CapturedMediaItem {
  id: string;
  kind: 'photo' | 'video';
  url: string;
  blob: Blob;
  jutsu: JutsuType;
  createdAt: string;
  width: number;
  height: number;
  durationSec?: number;
}

export interface StudioSettings {
  autoDetect: boolean;
  showLandmarks: boolean;
  intensity: number; // 0.5 to 1.5
  soundEnabled: boolean;
  mirrorFeed: boolean;
  cloneCount: number; // 2 or 4
}
