import rasenganGuideImg from '../assets/images/jutsu_rasengan_guide_1795781420830.jpg';
import chidoriGuideImg from '../assets/images/jutsu_chidori_guide_1795781421952.jpg';
import shadowCloneGuideImg from '../assets/images/jutsu_shadow_clone_guide_1795781421426.jpg';
import { JutsuType } from '../types/jutsu';

export type HandSignDiagramKind =
  | 'hand-focus'
  | 'open-palm'
  | 'lightning-claw'
  | 'two-finger-seal'
  | 'cross-seal';

export interface JutsuSignStep {
  stepNumber: number;
  title: string;
  instruction: string;
  diagram: HandSignDiagramKind;
}

export interface JutsuManualEntry {
  id: Exclude<JutsuType, 'none'>;
  name: string;
  japaneseName: string;
  classification: string;
  tagline: string;
  description: string;
  effectSummary: string;
  shortcut: string;
  accentColor: string;
  image: string;
  steps: JutsuSignStep[];
}

export const JUTSU_CATALOG: JutsuManualEntry[] = [
  {
    id: 'rasengan',
    name: 'RASENGAN',
    japaneseName: '螺旋丸',
    classification: 'Wind-Shape Manipulation · Palm Tracked',
    tagline: 'Master the open-palm chakra seal to form Rasengan.',
    description:
      'Condense spiraling azure chakra into a high-density rotating sphere directly over your palm center.',
    effectSummary:
      'Generates a multi-layered spinning azure chakra sphere with orbiting wind sparks tracked live to your palm.',
    shortcut: 'Key 1',
    accentColor: '#38BDF8',
    image: rasenganGuideImg,
    steps: [
      {
        stepNumber: 1,
        title: 'Center Hand in Frame',
        instruction:
          'Raise your dominant hand into the webcam frame so the 21-point hand tracker locks onto your palm.',
        diagram: 'hand-focus',
      },
      {
        stepNumber: 2,
        title: 'Open Palm Seal (5 Fingers)',
        instruction:
          'Extend all four main fingers and your thumb open toward the camera to ignite the spinning Rasengan.',
        diagram: 'open-palm',
      },
    ],
  },
  {
    id: 'chidori',
    name: 'CHIDORI',
    japaneseName: '千鳥',
    classification: 'Lightning Release · Knuckle Tracked',
    tagline: 'Master the lightning claw seal to unleash Chidori.',
    description:
      'Channel high-voltage lightning chakra around your knuckles to trigger crackling plasma bolts and electric arcs.',
    effectSummary:
      'Projects branching white-blue electric lightning arcs and sparks anchored to your tense hand.',
    shortcut: 'Key 2',
    accentColor: '#60A5FA',
    image: chidoriGuideImg,
    steps: [
      {
        stepNumber: 1,
        title: 'Center Hand in Frame',
        instruction:
          'Hold your hand clearly in camera view so the landmark detector locks onto your wrist and knuckles.',
        diagram: 'hand-focus',
      },
      {
        stepNumber: 2,
        title: 'Lightning Claw or Fist',
        instruction:
          'Curl your middle, ring, and pinky fingers into a tense fist or single-index strike (0–1 fingers extended).',
        diagram: 'lightning-claw',
      },
    ],
  },
  {
    id: 'shadow-clone',
    name: 'MULTI SHADOW CLONE',
    japaneseName: '多重影分身の術',
    classification: 'Cloning Ninjutsu · Seal Tracked',
    tagline: 'Perform the shinobi cross seal to summon Shadow Clones.',
    description:
      'Form the signature two-finger seal—or cross both hands together—to erupt smoke puffs and duplicate yourself.',
    effectSummary:
      'Triggers a ninja smoke burst and spawns 2× or 4× synchronized mirrored clones beside you.',
    shortcut: 'Key 3',
    accentColor: '#F97316',
    image: shadowCloneGuideImg,
    steps: [
      {
        stepNumber: 1,
        title: 'Two-Finger Seal',
        instruction:
          'Raise your index and middle fingers upright while keeping your ring and pinky fingers curled.',
        diagram: 'two-finger-seal',
      },
      {
        stepNumber: 2,
        title: 'Cross Seal or Hold Steady',
        instruction:
          'Optionally bring both hands together into the classic Cross Seal (or hold the two-finger seal) to burst clones.',
        diagram: 'cross-seal',
      },
    ],
  },
];
