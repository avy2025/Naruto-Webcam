import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, ArrowRight, BookOpen, Camera } from 'lucide-react';
import konohaEntranceImg from '../assets/images/konoha_entrance_1795781526430.jpg';
import konohaGateViewImg from '../assets/images/konoha_gate_view_1795781530394.jpg';
import konohaFriendsCloseImg from '../assets/images/konoha_friends_close_1795781528259.jpg';
import { KonohaAtmosphereCanvas } from './KonohaAtmosphereCanvas';
import { KonohaLeafSymbol } from './HandSignDiagram';

gsap.registerPlugin(ScrollTrigger);

interface KonohaJourneyProps {
  trainingOpen: boolean;
  explorerOpen: boolean;
  cameraActive: boolean;
  onOpenExplorer: () => void;
  onStartTraining: () => void;
}

interface StageMeta {
  id: string;
  label: string;
  caption: string;
}

const STAGES: StageMeta[] = [
  {
    id: 'entrance',
    label: 'Village Gates',
    caption: 'Outside the walls of Konohagakure',
  },
  {
    id: 'threshold',
    label: 'Gate Threshold',
    caption: 'Stepping onto the main village road',
  },
  {
    id: 'street',
    label: 'Village Street',
    caption: 'Walking toward the Hokage Monument',
  },
  {
    id: 'welcome',
    label: 'The Reunion',
    caption: 'Naruto and your squad are waiting',
  },
];

function clamp01(val: number): number {
  return Math.max(0, Math.min(1, val));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function KonohaJourney({
  trainingOpen,
  explorerOpen,
  cameraActive,
  onOpenExplorer,
  onStartTraining,
}: KonohaJourneyProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const entranceRef = useRef<HTMLDivElement | null>(null);
  const gateRef = useRef<HTMLDivElement | null>(null);
  const friendsRef = useRef<HTMLDivElement | null>(null);
  const sunWashRef = useRef<HTMLDivElement | null>(null);

  const frame1Ref = useRef<HTMLDivElement | null>(null);
  const frame1ScrollCueRef = useRef<HTMLDivElement | null>(null);
  const frame2Ref = useRef<HTMLDivElement | null>(null);
  const frame3Ref = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const scrollVelocityRef = useRef<number>(0);

  const [assetsReady, setAssetsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeStageIdx, setActiveStageIdx] = useState(0);
  const [isFinalWelcome, setIsFinalWelcome] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const overlayLockedRef = useRef(false);
  overlayLockedRef.current = trainingOpen || explorerOpen;

  // Detect prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Preload all 3 approved keyframe assets before starting the journey
  useEffect(() => {
    let cancelled = false;
    const sources = [konohaEntranceImg, konohaGateViewImg, konohaFriendsCloseImg];

    Promise.all(
      sources.map(
        (src) =>
          new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`Failed to load ${src}`));
            img.src = src;
          })
      )
    )
      .then(() => {
        if (!cancelled) setAssetsReady(true);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'Unable to load village artwork'
          );
          setAssetsReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ScrollTrigger scrubbed cinematic camera choreography (preserved intact)
  useEffect(() => {
    if (!assetsReady || !trackRef.current) return;

    const applyCameraProgress = (p: number) => {
      const nextStage =
        p < 0.24 ? 0 : p < 0.50 ? 1 : p < 0.78 ? 2 : 3;
      setActiveStageIdx((prev) => (prev === nextStage ? prev : nextStage));
      setIsFinalWelcome((prev) => {
        const next = p >= 0.85;
        return prev === next ? prev : next;
      });

      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${Math.max(0.02, p)})`;
      }

      // Stage A & B: Entrance Gate (0.00 -> 0.44)
      if (entranceRef.current) {
        const push = smoothstep(0.0, 0.44, p);
        const scale = reducedMotion ? 1 : 1.0 + push * 1.95;
        const ty = reducedMotion ? 0 : push * -4;
        const opacity = 1 - smoothstep(0.28, 0.43, p);
        entranceRef.current.style.transform = `translate3d(0, ${ty}%, 0) scale(${scale})`;
        entranceRef.current.style.opacity = String(opacity);
        entranceRef.current.style.visibility =
          opacity <= 0.01 ? 'hidden' : 'visible';
      }

      // Stage B -> C -> D: Gate Threshold & Village Street (0.18 -> 0.85)
      if (gateRef.current) {
        const enterT = smoothstep(0.18, 0.42, p);
        const walkT = smoothstep(0.42, 0.84, p);
        const fadeOut = 1 - smoothstep(0.70, 0.85, p);
        const opacity = enterT * fadeOut;

        const baseScale = 0.82 + enterT * 0.18;
        const streetPush = walkT * 1.38;
        const scale = reducedMotion ? 1 : baseScale + streetPush;
        const ty = reducedMotion ? 0 : walkT * -3.5;

        const insetY = (1 - enterT) * 14;
        const insetX = (1 - enterT) * 24;
        gateRef.current.style.clipPath =
          enterT >= 0.99
            ? 'none'
            : `inset(${insetY}% ${insetX}% ${insetY}% ${insetX}% round ${(1 - enterT) * 10}px)`;
        gateRef.current.style.transform = `translate3d(0, ${ty}%, 0) scale(${scale})`;
        gateRef.current.style.opacity = String(opacity);
        gateRef.current.style.visibility =
          opacity <= 0.01 ? 'hidden' : 'visible';
      }

      // Stage D -> E: Approaching Naruto & Friends -> Final Welcome (0.68 -> 1.00)
      if (friendsRef.current) {
        const appearT = smoothstep(0.68, 0.87, p);
        const holdBreath = smoothstep(0.87, 1.0, p);
        const scale = reducedMotion
          ? 1
          : 0.86 + appearT * 0.14 + holdBreath * 0.025;
        const ty = reducedMotion ? 0 : (1 - appearT) * 1.5;

        friendsRef.current.style.transform = `translate3d(0, ${ty}%, 0) scale(${scale})`;
        friendsRef.current.style.opacity = String(appearT);
        friendsRef.current.style.visibility =
          appearT <= 0.01 ? 'hidden' : 'visible';
      }

      // Warm sunlit atmospheric bridge during gate & approach transitions
      if (sunWashRef.current) {
        const gateBloom =
          Math.sin(smoothstep(0.22, 0.44, p) * Math.PI) * 0.34;
        const streetBloom =
          Math.sin(smoothstep(0.68, 0.88, p) * Math.PI) * 0.24;
        sunWashRef.current.style.opacity = String(
          reducedMotion ? 0 : Math.min(0.45, gateBloom + streetBloom)
        );
      }

      // FRAME 1 Storytelling Overlay (0.00 -> 0.22)
      if (frame1Ref.current) {
        const f1Opacity = 1 - smoothstep(0.05, 0.20, p);
        const f1Y = reducedMotion ? 0 : smoothstep(0.05, 0.20, p) * -22;
        frame1Ref.current.style.opacity = String(f1Opacity);
        frame1Ref.current.style.transform = `translate3d(0, ${f1Y}px, 0)`;
        frame1Ref.current.style.pointerEvents =
          f1Opacity > 0.25 ? 'auto' : 'none';
      }
      if (frame1ScrollCueRef.current) {
        const cueOpacity = 1 - smoothstep(0.02, 0.14, p);
        frame1ScrollCueRef.current.style.opacity = String(cueOpacity);
        frame1ScrollCueRef.current.style.pointerEvents =
          cueOpacity > 0.25 ? 'auto' : 'none';
      }

      // FRAME 2 Storytelling Overlay (0.34 -> 0.70)
      if (frame2Ref.current) {
        const f2In = smoothstep(0.32, 0.44, p);
        const f2Out = 1 - smoothstep(0.60, 0.72, p);
        const f2Opacity = f2In * f2Out;
        const f2Y = reducedMotion
          ? 0
          : (1 - f2In) * 20 - smoothstep(0.60, 0.72, p) * 18;
        frame2Ref.current.style.opacity = String(f2Opacity);
        frame2Ref.current.style.transform = `translate3d(0, ${f2Y}px, 0)`;
        frame2Ref.current.style.pointerEvents =
          f2Opacity > 0.25 ? 'auto' : 'none';
      }

      // FRAME 3 Storytelling Overlay (0.84 -> 1.00)
      if (frame3Ref.current) {
        const f3In = smoothstep(0.84, 0.94, p);
        const f3Y = reducedMotion ? 0 : (1 - f3In) * 18;
        frame3Ref.current.style.opacity = String(f3In);
        frame3Ref.current.style.transform = `translate3d(0, ${f3Y}px, 0)`;
        frame3Ref.current.style.pointerEvents =
          f3In > 0.35 && !overlayLockedRef.current ? 'auto' : 'none';
      }
    };

    applyCameraProgress(0);

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: trackRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: reducedMotion ? false : 0.65,
        onUpdate: (self) => {
          if (overlayLockedRef.current) return;
          scrollVelocityRef.current = self.getVelocity() * 0.015;
          applyCameraProgress(self.progress);
        },
      });
    }, trackRef);

    return () => {
      ctx.revert();
    };
  }, [assetsReady, reducedMotion]);

  const scrollToStage = (stageIndex: number) => {
    if (!trackRef.current) return;
    // Stage 0 = entrance (0.0), Stage 1/2 = Frame 2 village street (0.50), Stage 3 = Frame 3 welcome (0.96)
    const targets = [0, 0.36, 0.50, 0.96];
    const targetProgress = targets[stageIndex] ?? 0;
    const maxScroll = trackRef.current.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: Math.max(0, maxScroll * targetProgress),
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  };

  if (!assetsReady) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#09090B] px-6 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-[#F97316]" />
        <p className="mt-4 font-display text-lg font-medium tracking-wide text-[#F5E6C8]">
          APPROACHING KONOHAGAKURE...
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          Preparing the Hidden Leaf Village entrance
        </p>
      </div>
    );
  }

  return (
    <div className="relative bg-[#09090B] text-zinc-100">
      <section
        ref={trackRef}
        aria-label="Hidden Leaf Village Cinematic Walkthrough"
        className="relative h-[400vh] md:h-[460vh]"
      >
        <div className="sticky top-0 h-dvh w-full overflow-hidden bg-[#09090B]">
          {/* Layer 3 (deepest): Final Close Welcome — Naruto & Friends */}
          <div
            ref={friendsRef}
            className="absolute inset-0 will-change-transform"
            style={{ transformOrigin: '50% 50%', opacity: 0 }}
          >
            <img
              src={konohaFriendsCloseImg}
              alt="Naruto Uzumaki extending a welcoming hand alongside Sasuke, Sakura, Hinata, Shikamaru, and Choji on the Hidden Leaf Village street"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover object-[50%_40%] md:object-center"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/25" />
          </div>

          {/* Layer 2 (mid): Village Gate Threshold & Main Street */}
          <div
            ref={gateRef}
            className="absolute inset-0 will-change-transform"
            style={{ transformOrigin: '50% 60%', opacity: 0 }}
          >
            <img
              src={konohaGateViewImg}
              alt="View from the open Hidden Leaf Village gate threshold looking down the sandy street toward the Hokage Monument and waiting shinobi"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover object-center"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
          </div>

          {/* Layer 1 (foreground): Outside Hidden Leaf Entrance Gates */}
          <div
            ref={entranceRef}
            className="absolute inset-0 will-change-transform"
            style={{ transformOrigin: '52% 52%', opacity: 1 }}
          >
            <img
              src={konohaEntranceImg}
              alt="The iconic green entrance gates of Konohagakure, the Hidden Leaf Village"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover object-[52%_50%]"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/30" />
          </div>

          {/* Warm sunlit atmospheric transition veil */}
          <div
            ref={sunWashRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 opacity-0"
            style={{
              background:
                'radial-gradient(circle at 50% 48%, rgba(254, 243, 199, 0.85) 0%, rgba(253, 224, 71, 0.25) 45%, transparent 78%)',
            }}
          />

          {/* Ambient leaves and sunlit dust motes */}
          <KonohaAtmosphereCanvas
            active={assetsReady && !trainingOpen}
            reducedMotion={reducedMotion}
            scrollVelocityRef={scrollVelocityRef}
          />

          {/* Minimal unobtrusive top identity bar */}
          <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-4 px-5 py-4 md:px-10 md:py-5">
            <div className="inline-flex items-center gap-2.5 rounded-lg bg-black/45 px-3 py-1.5 backdrop-blur-sm border border-[#F5E6C8]/15">
              <KonohaLeafSymbol className="h-4 w-4 text-[#F97316]" />
              <span className="font-display text-sm font-semibold tracking-wider text-[#F5E6C8] whitespace-nowrap shrink-0">
                NARUTO WEBCAM
              </span>
              <span className="hidden text-xs text-zinc-300/80 sm:inline">
                · {STAGES[activeStageIdx].label}
              </span>
            </div>

            {cameraActive && !trainingOpen && (
              <button
                type="button"
                onClick={onStartTraining}
                className="pointer-events-auto inline-flex items-center gap-2 rounded-lg border border-[#F97316]/60 bg-black/65 px-3.5 py-2 text-xs font-semibold text-[#FDBA74] backdrop-blur-sm transition hover:bg-[#F97316] hover:text-zinc-950"
              >
                <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Resume Training</span>
              </button>
            )}
          </header>

          {/* ============================================================== */}
          {/* FRAME 1 — WELCOME TO THE HIDDEN LEAF (p: 0.00 -> 0.20)         */}
          {/* Positioned in lower-left negative space so gate lintel & doors remain clear */}
          {/* ============================================================== */}
          <div
            ref={frame1Ref}
            className="absolute inset-x-0 bottom-20 z-30 px-5 md:bottom-20 md:px-12"
          >
            <div className="mx-auto max-w-6xl">
              <div className="max-w-xl rounded-2xl border border-[#F5E6C8]/15 bg-gradient-to-tr from-black/80 via-black/60 to-black/30 p-5 backdrop-blur-[3px] sm:p-7">
                <div
                  className="animate-shinobi-enter inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-[#F5E6C8]"
                  style={{ animationDelay: '60ms' }}
                >
                  <KonohaLeafSymbol className="h-4 w-4 text-[#84CC16]" />
                  <span>木ノ葉隠れの里 • KONOHAGAKURE</span>
                </div>

                <h1
                  className="animate-shinobi-enter mt-2 font-display text-4xl font-bold tracking-tight text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)] sm:text-6xl"
                  style={{ animationDelay: '150ms' }}
                >
                  NARUTO{' '}
                  <span className="text-[#F97316]">WEBCAM</span>
                </h1>

                <div
                  className="animate-shinobi-enter mt-2 flex items-center gap-3"
                  style={{ animationDelay: '230ms' }}
                >
                  <span className="h-0.5 w-8 bg-[#F97316]" aria-hidden="true" />
                  <p className="font-display text-sm font-semibold tracking-[0.14em] text-[#F5E6C8] sm:text-base">
                    YOUR SHINOBI JOURNEY BEGINS HERE.
                  </p>
                </div>

                <p
                  className="animate-shinobi-enter mt-3 max-w-lg text-sm leading-relaxed text-zinc-200/95"
                  style={{ animationDelay: '310ms' }}
                >
                  Step into the Hidden Leaf Village, master the art of hand
                  signs, and unleash legendary Jutsu using nothing but your
                  hands and your webcam.
                </p>

                <div
                  className="animate-shinobi-enter mt-5 flex flex-wrap items-center gap-4"
                  style={{ animationDelay: '390ms' }}
                >
                  <button
                    type="button"
                    onClick={() => scrollToStage(2)}
                    className="group inline-flex items-center gap-2.5 rounded-lg border border-[#FDBA74]/50 bg-[#F97316] px-6 py-3 font-display text-sm font-bold tracking-[0.12em] text-zinc-950 shadow-[0_8px_28px_rgba(249,115,22,0.38)] transition-all duration-200 hover:scale-[1.02] hover:bg-[#FB923C] active:scale-[0.98]"
                  >
                    <span>ENTER THE VILLAGE</span>
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Frame 1 Secondary Bottom Scroll Indicator */}
          <div
            ref={frame1ScrollCueRef}
            className="absolute inset-x-0 bottom-10 z-30 flex justify-center px-4 md:bottom-11"
          >
            <button
              type="button"
              onClick={() => scrollToStage(2)}
              className="inline-flex items-center gap-2 rounded-full border border-[#F5E6C8]/20 bg-black/55 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-[#F5E6C8]/90 backdrop-blur-sm transition hover:border-[#F97316]/60 hover:text-white"
            >
              <KonohaLeafSymbol className="h-3.5 w-3.5 text-[#84CC16]" />
              <span>SCROLL TO BEGIN YOUR JOURNEY</span>
              <ArrowDown className="h-3.5 w-3.5 animate-bounce text-[#F97316]" aria-hidden="true" />
            </button>
          </div>

          {/* ============================================================== */}
          {/* FRAME 2 — CHOOSE YOUR JUTSU. MASTER YOUR SIGNS. (p: 0.34 -> 0.70) */}
          {/* Positioned in lower-left foreground so Hokage Monument & distant squad remain clear */}
          {/* ============================================================== */}
          <div
            ref={frame2Ref}
            style={{ opacity: 0, pointerEvents: 'none' }}
            className="absolute inset-x-0 bottom-14 z-30 px-5 md:bottom-16 md:px-12"
          >
            <div className="mx-auto max-w-6xl">
              <div className="max-w-xl rounded-2xl border border-[#F5E6C8]/20 bg-gradient-to-tr from-black/85 via-black/68 to-black/35 p-5 backdrop-blur-sm sm:p-7">
                <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-[#F5E6C8]/85">
                  <KonohaLeafSymbol className="h-4 w-4 text-[#F97316]" />
                  <span>SHINOBI ARCHIVE · MAIN STREET</span>
                </div>

                <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white drop-shadow sm:text-5xl text-balance">
                  READY TO BECOME A{' '}
                  <span className="text-[#F97316]">SHINOBI?</span>
                </h2>

                <div className="mt-2 flex items-center gap-3">
                  <span className="h-0.5 w-8 bg-[#84CC16]" aria-hidden="true" />
                  <p className="font-display text-sm font-semibold tracking-[0.14em] text-[#F5E6C8] sm:text-base">
                    EVERY JUTSU BEGINS WITH A HAND SIGN.
                  </p>
                </div>

                <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-zinc-200/95">
                  Learn the ancient hand signs, discover powerful Jutsu, and
                  prepare yourself for shinobi training.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={onOpenExplorer}
                    className="group inline-flex items-center gap-2.5 rounded-lg border border-[#FDBA74]/50 bg-[#F97316] px-5 py-2.5 font-display text-sm font-bold tracking-[0.12em] text-zinc-950 shadow-[0_8px_24px_rgba(249,115,22,0.35)] transition-all duration-200 hover:scale-[1.02] hover:bg-[#FB923C] active:scale-[0.98]"
                  >
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    <span>EXPLORE JUTSU</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToStage(3)}
                    className="inline-flex items-center gap-1.5 border-b border-[#F5E6C8]/40 pb-0.5 text-xs font-semibold tracking-[0.12em] text-[#F5E6C8] transition hover:border-[#F97316] hover:text-[#F97316]"
                  >
                    <span>READY? MEET YOUR TEAM</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* FRAME 3 — YOUR TRAINING BEGINS NOW (p: 0.84 -> 1.00)           */}
          {/* Anchored cleanly at bottom edge so all 6 faces & Naruto's extended hand stay clear */}
          {/* ============================================================== */}
          <div
            ref={frame3Ref}
            style={{ opacity: 0, pointerEvents: 'none' }}
            className={`absolute inset-x-0 bottom-12 z-30 px-4 transition-opacity duration-300 md:bottom-14 md:px-12 ${
              trainingOpen ? 'hidden' : ''
            }`}
          >
            <div className="mx-auto max-w-4xl">
              <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#F5E6C8]/20 bg-gradient-to-r from-black/88 via-black/78 to-black/68 px-5 py-4 backdrop-blur-md sm:flex-row sm:items-center sm:px-7 sm:py-5">
                <div className="max-w-xl">
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-[#FDBA74] uppercase">
                    THE HIDDEN LEAF WELCOMES YOU, SHINOBI.
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-4xl">
                    YOUR TEAM IS{' '}
                    <span className="text-[#F97316]">WAITING.</span>
                  </h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-200 sm:text-sm">
                    Your friends are ready. Your training starts here. Show us
                    what you&rsquo;ve got!
                  </p>
                </div>

                <div className="flex flex-col items-start gap-2 sm:items-end shrink-0">
                  <button
                    type="button"
                    onClick={onStartTraining}
                    className="group inline-flex items-center gap-2.5 rounded-lg border border-[#FDBA74]/50 bg-[#F97316] px-5 py-3 font-display text-sm font-bold tracking-[0.12em] text-zinc-950 shadow-[0_10px_30px_rgba(249,115,22,0.42)] transition-all duration-200 hover:scale-[1.02] hover:bg-[#FB923C] active:scale-[0.98] whitespace-nowrap"
                  >
                    <Camera className="h-4 w-4" aria-hidden="true" />
                    <span>START SHINOBI TRAINING</span>
                  </button>
                  <p className="font-mono text-[10px] tracking-[0.12em] text-[#F5E6C8]/75">
                    CAMERA REQUIRED • HAND SIGNS • JUTSU ACTIVATION
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Error banner only if image preloading failed */}
          {loadError && (
            <div
              role="status"
              className="absolute left-5 top-16 z-40 rounded-lg border border-amber-500/40 bg-black/80 px-3 py-2 text-xs text-amber-200"
            >
              {loadError}
            </div>
          )}

          {/* Subtle bottom journey navigation & progress hairline */}
          {!trainingOpen && (
            <div className="absolute inset-x-0 bottom-0 z-30 px-5 pb-3.5 md:px-10">
              <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                <p className="hidden text-xs text-zinc-300/85 drop-shadow sm:block">
                  {STAGES[activeStageIdx].caption}
                </p>

                <div className="ml-auto flex items-center gap-3">
                  {STAGES.map((stage, idx) => (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => scrollToStage(idx)}
                      aria-label={`Jump to ${stage.label}`}
                      className={`text-xs transition-colors whitespace-nowrap shrink-0 ${
                        activeStageIdx === idx
                          ? 'font-semibold text-[#F97316]'
                          : 'text-zinc-300/75 hover:text-white'
                      }`}
                    >
                      {stage.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mx-auto mt-2 h-0.5 max-w-6xl overflow-hidden rounded-full bg-white/15">
                <div
                  ref={progressBarRef}
                  className="h-full w-full origin-left bg-[#F97316] transition-transform duration-75"
                  style={{ transform: 'scaleX(0.02)' }}
                />
              </div>

              {isFinalWelcome && (
                <span className="sr-only">
                  Reached final welcome scene with Naruto and friends.
                </span>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
