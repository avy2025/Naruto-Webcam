import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { HandDetectionState, JutsuType, NormalizedPoint } from '../types/jutsu';
import { classifyHandSigns } from '../utils/handSignClassifier';

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export type TrackerStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

export function useHandTracker(
  enabled: boolean,
  mirrorFeed: boolean
) {
  const [status, setStatus] = useState<TrackerStatus>('idle');
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const signHistoryRef = useRef<JutsuType[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function init() {
      if (landmarkerRef.current) {
        setStatus('ready');
        return;
      }
      setStatus('loading');
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });
        if (!cancelled) {
          landmarkerRef.current = handLandmarker;
          setStatus('ready');
        } else {
          handLandmarker.close();
        }
      } catch (err) {
        console.warn('HandLandmarker unavailable, falling back to manual mode:', err);
        if (!cancelled) {
          setStatus('unavailable');
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    return () => {
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  const detectFrame = (
    video: HTMLVideoElement,
    timestampMs: number
  ): HandDetectionState | null => {
    const landmarker = landmarkerRef.current;
    if (!landmarker || video.readyState < 2) return null;
    if (video.currentTime === lastVideoTimeRef.current) return null;
    lastVideoTimeRef.current = video.currentTime;

    try {
      const result = landmarker.detectForVideo(video, timestampMs);
      const hands: NormalizedPoint[][] = result.landmarks || [];
      const classified = classifyHandSigns(hands, mirrorFeed);

      // Smooth sign transitions over 4 frames to prevent flicker
      signHistoryRef.current.push(classified.jutsu);
      if (signHistoryRef.current.length > 5) {
        signHistoryRef.current.shift();
      }
      const counts = new Map<JutsuType, number>();
      for (const s of signHistoryRef.current) {
        counts.set(s, (counts.get(s) || 0) + 1);
      }
      let stableJutsu = classified.jutsu;
      let maxCount = 0;
      counts.forEach((count, key) => {
        if (count > maxCount) {
          maxCount = count;
          stableJutsu = key;
        }
      });

      return {
        hands,
        detectedJutsu: stableJutsu,
        signLabel: classified.signLabel,
        confidence: classified.confidence,
        anchor: classified.anchor,
      };
    } catch {
      return null;
    }
  };

  return { status, detectFrame };
}
