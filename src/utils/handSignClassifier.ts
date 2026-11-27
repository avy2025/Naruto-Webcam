import { JutsuType, NormalizedPoint } from '../types/jutsu';

function dist(a: NormalizedPoint, b: NormalizedPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

interface FingerStates {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
}

function getFingerStates(lm: NormalizedPoint[]): FingerStates {
  const wrist = lm[0];

  const isExtended = (tipIdx: number, pipIdx: number, mcpIdx: number) => {
    const tipToWrist = dist(lm[tipIdx], wrist);
    const pipToWrist = dist(lm[pipIdx], wrist);
    const tipToMcp = dist(lm[tipIdx], lm[mcpIdx]);
    const pipToMcp = dist(lm[pipIdx], lm[mcpIdx]);
    return tipToWrist > pipToWrist * 1.12 && tipToMcp > pipToMcp * 1.05;
  };

  // Thumb extension relative to pinky MCP (landmark 17)
  const thumbExtended = dist(lm[4], lm[17]) > dist(lm[3], lm[17]) * 1.15;

  return {
    thumb: thumbExtended,
    index: isExtended(8, 6, 5),
    middle: isExtended(12, 10, 9),
    ring: isExtended(16, 14, 13),
    pinky: isExtended(20, 18, 17),
  };
}

export interface SignClassification {
  jutsu: JutsuType;
  signLabel: string;
  confidence: number;
  anchor: NormalizedPoint | null;
}

export function classifyHandSigns(
  hands: NormalizedPoint[][],
  mirrorFeed: boolean
): SignClassification {
  if (!hands || hands.length === 0) {
    return {
      jutsu: 'none',
      signLabel: 'No hand detected',
      confidence: 0,
      anchor: null,
    };
  }

  const mapX = (x: number) => (mirrorFeed ? 1 - x : x);

  // Check two-hand Shadow Clone cross seal first if 2 hands are visible
  if (hands.length >= 2) {
    const h1 = hands[0];
    const h2 = hands[1];
    const f1 = getFingerStates(h1);
    const f2 = getFingerStates(h2);
    const indexDist = dist(h1[8], h2[8]);
    if (
      f1.index &&
      f1.middle &&
      f2.index &&
      f2.middle &&
      indexDist < 0.28
    ) {
      return {
        jutsu: 'shadow-clone',
        signLabel: 'Cross Seal (Shadow Clone)',
        confidence: 0.96,
        anchor: {
          x: mapX((h1[9].x + h2[9].x) / 2),
          y: (h1[9].y + h2[9].y) / 2,
        },
      };
    }
  }

  // Classify primary hand
  const primary = hands[0];
  const f = getFingerStates(primary);
  const extendedCount = [f.index, f.middle, f.ring, f.pinky].filter(Boolean).length;

  // Palm center (midpoint between wrist and middle finger base)
  const palmCenter: NormalizedPoint = {
    x: mapX((primary[0].x + primary[9].x) * 0.5),
    y: (primary[0].y + primary[9].y) * 0.5,
  };

  // Shadow Clone: Two-finger seal (Index + Middle up, Ring + Pinky curled)
  if (f.index && f.middle && !f.ring && !f.pinky) {
    return {
      jutsu: 'shadow-clone',
      signLabel: 'Two-Finger Seal (Shadow Clone)',
      confidence: 0.91,
      anchor: palmCenter,
    };
  }

  // Rasengan: Open Palm (all 4 main fingers extended)
  if (extendedCount >= 4) {
    return {
      jutsu: 'rasengan',
      signLabel: 'Open Palm (Rasengan)',
      confidence: f.thumb ? 0.95 : 0.88,
      anchor: {
        x: mapX((primary[0].x * 0.35 + primary[9].x * 0.65)),
        y: primary[0].y * 0.35 + primary[9].y * 0.65 - 0.04,
      },
    };
  }

  // Chidori: Tense Claw / Fist / Index Strike (0-1 main fingers extended or 3-finger claw)
  if (extendedCount <= 1 || (f.index && !f.middle && !f.ring)) {
    return {
      jutsu: 'chidori',
      signLabel: 'Lightning Claw (Chidori)',
      confidence: 0.89,
      anchor: {
        x: mapX(primary[9].x),
        y: primary[9].y,
      },
    };
  }

  return {
    jutsu: 'chidori',
    signLabel: 'Hand Pose Ready',
    confidence: 0.72,
    anchor: palmCenter,
  };
}
