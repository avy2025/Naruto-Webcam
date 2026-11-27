import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  Circle,
  Download,
  Eye,
  RefreshCw,
  Square,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  CapturedMediaItem,
  HandDetectionState,
  JutsuType,
  NormalizedPoint,
  StudioSettings,
} from '../types/jutsu';
import { TrackerStatus, useHandTracker } from '../hooks/useHandTracker';
import { JUTSU_CATALOG } from '../data/jutsuCatalog';
import { KonohaLeafSymbol } from './HandSignDiagram';
import {
  createInitialRenderState,
  drawDemoScene,
  drawHandLandmarks,
  renderChidori,
  renderRasengan,
  renderShadowCloneLayer,
  renderSmokePuffs,
  spawnShadowCloneSmoke,
  updateAndDrawParticles,
} from '../utils/jutsuRenderer';
import { soundEngine } from '../utils/soundEffects';

interface ShinobiTrainingOverlayProps {
  visible: boolean;
  cameraActive: boolean;
  onCameraActiveChange: (active: boolean) => void;
  activeJutsu: JutsuType;
  onSelectJutsu: (jutsu: JutsuType) => void;
  detectionInfo: HandDetectionState;
  onDetectionUpdate: (info: HandDetectionState) => void;
  trackerStatus: TrackerStatus;
  onTrackerStatusChange: (status: TrackerStatus) => void;
  settings: StudioSettings;
  onUpdateSettings: (patch: Partial<StudioSettings>) => void;
  gallery: CapturedMediaItem[];
  onCaptureMedia: (item: CapturedMediaItem) => void;
  onDeleteMedia: (id: string) => void;
  onReturnToVillage: () => void;
}

const CANVAS_W = 1280;
const CANVAS_H = 720;

export function ShinobiTrainingOverlay({
  visible,
  cameraActive,
  onCameraActiveChange,
  activeJutsu,
  onSelectJutsu,
  detectionInfo,
  onDetectionUpdate,
  trackerStatus,
  onTrackerStatusChange,
  settings,
  onUpdateSettings,
  gallery,
  onCaptureMedia,
  onDeleteMedia,
  onReturnToVillage,
}: ShinobiTrainingOverlayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const demoBufferRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const renderStateRef = useRef(createInitialRenderState());
  const demoAnchorRef = useRef<NormalizedPoint>({ x: 0.64, y: 0.56 });
  const isDraggingRef = useRef(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number>(0);

  const [permissionState, setPermissionState] = useState<
    'idle' | 'requesting' | 'granted' | 'denied'
  >('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [useDemoPractice, setUseDemoPractice] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [flashActive, setFlashActive] = useState(false);
  const [showGalleryDrawer, setShowGalleryDrawer] = useState(false);

  const { status: currentTrackerStatus, detectFrame } = useHandTracker(
    cameraActive && settings.autoDetect,
    settings.mirrorFeed
  );

  useEffect(() => {
    onTrackerStatusChange(currentTrackerStatus);
  }, [currentTrackerStatus, onTrackerStatusChange]);

  // Lock background scroll while training overlay is visible
  useEffect(() => {
    if (!visible) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [visible]);

  // Single webcam stream lifecycle — never spawns a second stream if one already exists
  useEffect(() => {
    let cancelled = false;

    const stopExistingStream = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    if (!cameraActive) {
      stopExistingStream();
      setPermissionState((prev) => (prev === 'denied' ? 'denied' : 'idle'));
      return;
    }

    // Reuse existing active stream without reinitializing
    if (streamRef.current && streamRef.current.active) {
      setPermissionState('granted');
      setUseDemoPractice(false);
      return;
    }

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPermissionState('denied');
        setCameraError('Webcam API is unavailable in this browser.');
        onCameraActiveChange(false);
        return;
      }
      setPermissionState('requesting');
      setCameraError(null);
      setUseDemoPractice(false);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setPermissionState('granted');
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : 'Camera permission was denied or no webcam was found.';
          setPermissionState('denied');
          setCameraError(message);
          onCameraActiveChange(false);
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
    };
  }, [cameraActive, onCameraActiveChange]);

  // Cleanup camera stream only on full unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      soundEngine.stopLoop();
    };
  }, []);

  // Recording duration timer
  useEffect(() => {
    if (!isRecording) {
      setRecordSeconds(0);
      return;
    }
    const interval = window.setInterval(() => {
      setRecordSeconds(Math.floor((Date.now() - recordStartRef.current) / 1000));
    }, 250);
    return () => window.clearInterval(interval);
  }, [isRecording]);

  // Sync audio only while training is visible
  useEffect(() => {
    soundEngine.setActiveJutsu(
      visible ? activeJutsu : 'none',
      visible && settings.soundEnabled
    );
  }, [visible, activeJutsu, settings.soundEnabled]);

  const latestPropsRef = useRef({
    visible,
    activeJutsu,
    settings,
    cameraActive,
    useDemoPractice,
    detectFrame,
    onSelectJutsu,
    onDetectionUpdate,
  });
  latestPropsRef.current = {
    visible,
    activeJutsu,
    settings,
    cameraActive,
    useDemoPractice,
    detectFrame,
    onSelectJutsu,
    onDetectionUpdate,
  };

  // Composite Canvas loop (pauses cleanly when returned to village view to save CPU/GPU)
  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!demoBufferRef.current) {
      const offscreen = document.createElement('canvas');
      offscreen.width = CANVAS_W;
      offscreen.height = CANVAS_H;
      demoBufferRef.current = offscreen;
    }

    let rafId = 0;
    let lastDetectionPush = 0;

    const renderFrame = (now: number) => {
      const {
        activeJutsu: currentJutsu,
        settings: curSettings,
        cameraActive: camOn,
        useDemoPractice: demoOn,
        detectFrame: runDetect,
        onSelectJutsu: notifyJutsu,
        onDetectionUpdate: notifyDetection,
      } = latestPropsRef.current;

      const video = videoRef.current;
      const rState = renderStateRef.current;
      const timeSec = now * 0.001;
      const hasLiveVideo = Boolean(
        camOn && video && video.readyState >= 2
      );

      if (!hasLiveVideo && !demoOn) {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        rafId = requestAnimationFrame(renderFrame);
        return;
      }

      let detection: HandDetectionState | null = null;
      if (hasLiveVideo && curSettings.autoDetect) {
        detection = runDetect(video!, now);
        if (detection) {
          if (now - lastDetectionPush > 100) {
            lastDetectionPush = now;
            notifyDetection(detection);
          }
          if (
            detection.detectedJutsu !== 'none' &&
            detection.detectedJutsu !== currentJutsu
          ) {
            notifyJutsu(detection.detectedJutsu);
          }
        }
      }

      const targetAnchor =
        detection?.anchor ??
        (hasLiveVideo ? { x: 0.5, y: 0.56 } : demoAnchorRef.current);

      rState.smoothAnchor.x += (targetAnchor.x - rState.smoothAnchor.x) * 0.32;
      rState.smoothAnchor.y += (targetAnchor.y - rState.smoothAnchor.y) * 0.32;

      if (currentJutsu !== rState.lastJutsu) {
        rState.lastJutsu = currentJutsu;
        rState.activationTime = now;
        if (currentJutsu === 'shadow-clone') {
          spawnShadowCloneSmoke(
            rState,
            CANVAS_W,
            CANVAS_H,
            curSettings.cloneCount
          );
        }
      }

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      let cloneSource: HTMLVideoElement | HTMLCanvasElement;
      if (hasLiveVideo) {
        cloneSource = video!;
      } else {
        const demoCanvas = demoBufferRef.current!;
        const demoCtx = demoCanvas.getContext('2d')!;
        drawDemoScene(
          demoCtx,
          CANVAS_W,
          CANVAS_H,
          timeSec,
          rState.smoothAnchor
        );
        cloneSource = demoCanvas;
      }

      if (currentJutsu === 'shadow-clone') {
        renderShadowCloneLayer(
          ctx,
          cloneSource,
          CANVAS_W,
          CANVAS_H,
          hasLiveVideo ? curSettings.mirrorFeed : false,
          curSettings.cloneCount,
          curSettings.intensity,
          timeSec,
          rState
        );
      }

      ctx.save();
      if (hasLiveVideo && curSettings.mirrorFeed) {
        ctx.translate(CANVAS_W, 0);
        ctx.scale(-1, 1);
      }
      if (currentJutsu === 'shadow-clone') {
        ctx.drawImage(cloneSource, 0, 0, CANVAS_W, CANVAS_H);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = 0.72;
        renderShadowCloneLayer(
          ctx,
          cloneSource,
          CANVAS_W,
          CANVAS_H,
          hasLiveVideo ? curSettings.mirrorFeed : false,
          curSettings.cloneCount,
          curSettings.intensity,
          timeSec,
          rState
        );
        ctx.restore();
      } else {
        ctx.drawImage(cloneSource, 0, 0, CANVAS_W, CANVAS_H);
        ctx.restore();
      }

      if (curSettings.showLandmarks && detection?.hands?.length) {
        drawHandLandmarks(
          ctx,
          detection.hands,
          CANVAS_W,
          CANVAS_H,
          curSettings.mirrorFeed
        );
      }

      const ax = rState.smoothAnchor.x * CANVAS_W;
      const ay = rState.smoothAnchor.y * CANVAS_H;

      if (currentJutsu === 'rasengan') {
        renderRasengan(
          ctx,
          ax,
          ay,
          56 * curSettings.intensity,
          curSettings.intensity,
          timeSec,
          rState
        );
      } else if (currentJutsu === 'chidori') {
        renderChidori(
          ctx,
          ax,
          ay,
          62 * curSettings.intensity,
          curSettings.intensity,
          rState
        );
      }

      updateAndDrawParticles(ctx, rState);
      renderSmokePuffs(ctx, rState);

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [visible]);

  const updateDemoAnchorFromPointer = (
    e: React.PointerEvent<HTMLCanvasElement>
  ) => {
    if (cameraActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = Math.max(0.1, Math.min(0.9, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0.12, Math.min(0.88, (e.clientY - rect.top) / rect.height));
    demoAnchorRef.current = { x: nx, y: ny };
  };

  const handleCapturePhoto = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    soundEngine.playShutter(settings.soundEnabled);
    setFlashActive(true);
    window.setTimeout(() => setFlashActive(false), 160);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        onCaptureMedia({
          id: `photo-${Date.now()}`,
          kind: 'photo',
          url,
          blob,
          jutsu: activeJutsu,
          createdAt: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          width: CANVAS_W,
          height: CANVAS_H,
        });
      },
      'image/png',
      0.95
    );
  }, [activeJutsu, onCaptureMedia, settings.soundEnabled]);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || typeof MediaRecorder === 'undefined') return;

    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, { mimeType });
    recordedChunksRef.current = [];
    recordStartRef.current = Date.now();

    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const durationSec = Math.max(
        1,
        Math.round((Date.now() - recordStartRef.current) / 1000)
      );
      onCaptureMedia({
        id: `video-${Date.now()}`,
        kind: 'video',
        url,
        blob,
        jutsu: activeJutsu,
        createdAt: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        width: CANVAS_W,
        height: CANVAS_H,
        durationSec,
      });
    };

    recorder.start(200);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  }, [activeJutsu, isRecording, onCaptureMedia]);

  const formatDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, '0');
    const secs = (totalSec % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Real sequence progress derived strictly from actual detection state
  const targetCatalog =
    JUTSU_CATALOG.find((j) => j.id === activeJutsu) ?? JUTSU_CATALOG[0];
  const handDetected = detectionInfo.hands.length > 0;
  const sealMatched =
    cameraActive &&
    detectionInfo.detectedJutsu !== 'none' &&
    (activeJutsu === 'none' || detectionInfo.detectedJutsu === activeJutsu);

  const trainingFeedback = !cameraActive && !useDemoPractice
    ? permissionState === 'requesting'
      ? 'Waiting for browser webcam permission...'
      : permissionState === 'denied'
      ? 'Camera permission is needed for live hand-sign detection.'
      : 'Enable your camera to begin live hand-sign recognition.'
    : !cameraActive && useDemoPractice
    ? 'Demo Practice Active — Drag on the canvas to test Jutsu effects.'
    : trackerStatus === 'loading'
    ? 'Loading MediaPipe HandLandmarker model...'
    : !handDetected
    ? `Show your hand to the camera. Target: ${targetCatalog.steps[1].title}.`
    : sealMatched
    ? `${targetCatalog.name} activated via ${detectionInfo.signLabel}!`
    : `Hand detected (${detectionInfo.signLabel}). Adjust pose for ${targetCatalog.name}.`;

  return (
    <div
      aria-hidden={!visible}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      className={`fixed inset-0 z-40 flex flex-col justify-end overflow-y-auto px-3 py-3 transition-all duration-300 sm:px-6 sm:py-5 ${
        visible
          ? 'pointer-events-auto opacity-100'
          : 'pointer-events-none opacity-0'
      }`}
      style={{
        background:
          'linear-gradient(to top, rgba(9, 9, 11, 0.78) 0%, rgba(9, 9, 11, 0.36) 52%, rgba(9, 9, 11, 0.16) 100%)',
      }}
    >
      {/* Keep top area clear so Hokage Monument & friends' faces remain visible on Frame 3! */}
      <div className="mx-auto mt-auto w-full max-w-6xl">
        {/* Top bar of Training Station */}
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2.5 rounded-xl border border-[#F5E6C8]/20 bg-[#12100E]/90 px-3.5 py-2 backdrop-blur-md">
            <KonohaLeafSymbol className="h-4 w-4 text-[#F97316]" />
            <span className="font-display text-sm font-bold tracking-wider text-[#F5E6C8]">
              SHINOBI TRAINING STATION
            </span>
            <span className="hidden text-xs text-zinc-400 sm:inline">
              · Konoha Main Street
            </span>
          </div>

          <div className="flex items-center gap-2">
            {gallery.length > 0 && (
              <button
                type="button"
                onClick={() => setShowGalleryDrawer((prev) => !prev)}
                className="rounded-lg border border-[#F5E6C8]/20 bg-[#12100E]/90 px-3 py-2 text-xs font-semibold text-[#F5E6C8] backdrop-blur-md transition hover:border-[#F97316]"
              >
                {showGalleryDrawer
                  ? 'Hide Captures'
                  : `Captures (${gallery.length})`}
              </button>
            )}

            <button
              type="button"
              onClick={onReturnToVillage}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#F5E6C8]/25 bg-[#12100E]/90 px-3.5 py-2 text-xs font-semibold text-[#F5E6C8] backdrop-blur-md transition hover:border-[#F97316] hover:bg-[#F97316] hover:text-zinc-950"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>RETURN</span>
            </button>
          </div>
        </div>

        {/* Main Training Station Panel (Leaves upper village & faces visible!) */}
        <div className="scroll-parchment-panel overflow-hidden rounded-2xl border border-[#F5E6C8]/20 backdrop-blur-md">
          <div className="grid grid-cols-1 gap-0 lg:grid-cols-12">
            {/* Left: Webcam Preview & Effect Viewport */}
            <div className="relative border-b border-[#F5E6C8]/10 bg-black lg:col-span-7 lg:border-b-0 lg:border-r">
              <video
                ref={videoRef}
                playsInline
                muted
                className="hidden"
                aria-hidden="true"
              />

              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                onPointerDown={(e) => {
                  isDraggingRef.current = true;
                  updateDemoAnchorFromPointer(e);
                }}
                onPointerMove={(e) => {
                  if (isDraggingRef.current) updateDemoAnchorFromPointer(e);
                }}
                onPointerUp={() => {
                  isDraggingRef.current = false;
                }}
                onPointerLeave={() => {
                  isDraggingRef.current = false;
                }}
                className={`aspect-video w-full bg-[#0D0C0B] object-cover ${
                  !cameraActive && useDemoPractice ? 'cursor-crosshair' : ''
                }`}
              />

              {/* Pre-Permission / Denied Camera Overlay */}
              {!cameraActive && !useDemoPractice && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0D0C0B]/92 px-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#F97316]/40 bg-[#F97316]/15 text-[#F97316]">
                    <Camera className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-3 font-display text-xl font-bold tracking-wide text-[#F5E6C8]">
                    {permissionState === 'requesting'
                      ? 'REQUESTING WEBCAM ACCESS...'
                      : permissionState === 'denied'
                      ? 'CAMERA PERMISSION REQUIRED'
                      : 'ACTIVATE SHINOBI CAMERA'}
                  </h3>
                  <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-300">
                    {permissionState === 'denied'
                      ? cameraError ||
                        'Camera access was blocked. Allow camera permissions in your browser and try again.'
                      : 'Grant webcam access so MediaPipe can track your hand signs in real time and channel Jutsu.'}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => onCameraActiveChange(true)}
                      disabled={permissionState === 'requesting'}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#F97316] px-4 py-2 text-xs font-bold tracking-wider text-zinc-950 uppercase transition hover:bg-[#FB923C] disabled:opacity-60"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {permissionState === 'denied'
                          ? 'Try Again'
                          : 'Enable Camera'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUseDemoPractice(true)}
                      className="rounded-lg border border-[#F5E6C8]/25 px-3.5 py-2 text-xs font-medium text-[#F5E6C8] transition hover:bg-white/5"
                    >
                      Practice Without Camera
                    </button>
                  </div>
                </div>
              )}

              {/* Shutter Flash */}
              {flashActive && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-white/80"
                />
              )}

              {/* Recording Indicator */}
              {isRecording && (
                <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-md bg-black/75 px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-red-400">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span>REC {formatDuration(recordSeconds)}</span>
                </div>
              )}

              {/* Viewport Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F5E6C8]/10 bg-[#141210] px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    disabled={!cameraActive && !useDemoPractice}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#F97316] px-3 py-1.5 text-xs font-bold text-zinc-950 transition hover:bg-[#FB923C] disabled:opacity-40"
                  >
                    <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Snap</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleRecording}
                    disabled={!cameraActive && !useDemoPractice}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
                      isRecording
                        ? 'border-red-500/60 bg-red-500/20 text-red-200'
                        : 'border-[#F5E6C8]/20 bg-zinc-900 text-[#F5E6C8] hover:border-[#F5E6C8]/40'
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Circle className="h-3 w-3 fill-red-400 text-red-400" aria-hidden="true" />
                        <span>Record</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({ showLandmarks: !settings.showLandmarks })
                    }
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                      settings.showLandmarks
                        ? 'border-[#F97316]/60 bg-[#F97316]/15 text-[#FDBA74]'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Landmarks</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({ soundEnabled: !settings.soundEnabled })
                    }
                    aria-label={settings.soundEnabled ? 'Mute sound' : 'Enable sound'}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-300 transition hover:text-white"
                  >
                    {settings.soundEnabled ? (
                      <Volume2 className="h-3.5 w-3.5 text-[#F97316]" />
                    ) : (
                      <VolumeX className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {cameraActive ? (
                    <button
                      type="button"
                      onClick={() => onCameraActiveChange(false)}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800"
                    >
                      <CameraOff className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Stop Cam</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onCameraActiveChange(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#F97316]/50 bg-[#F97316]/15 px-2.5 py-1.5 text-xs font-medium text-[#FDBA74] transition hover:bg-[#F97316]/25"
                    >
                      <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Use Cam</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Shinobi Training Telemetry, Sequence Progress & Jutsu Controls */}
            <div className="flex flex-col justify-between gap-3.5 p-4 lg:col-span-5 sm:p-5">
              {/* 1. Current Hand-Sign Recognition Indicator */}
              <div className="rounded-xl border border-[#F5E6C8]/12 bg-black/35 p-3">
                <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-[#F5E6C8]/65 uppercase">
                  <span>Recognised Hand Sign</span>
                  <span className="font-mono text-[#F97316] tabular-nums">
                    {cameraActive && detectionInfo.confidence > 0
                      ? `${Math.round(detectionInfo.confidence * 100)}%`
                      : trackerStatus === 'loading'
                      ? 'Loading...'
                      : cameraActive
                      ? 'Tracking'
                      : 'Standby'}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-white">
                  {cameraActive
                    ? detectionInfo.signLabel
                    : useDemoPractice
                    ? 'Manual Effect Mode'
                    : 'Awaiting Webcam'}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">{trainingFeedback}</p>
              </div>

              {/* 2. Hand-Sign Sequence Progress Indicator */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-[#F5E6C8]/70 uppercase">
                  <span>Hand-Sign Sequence Progress</span>
                  <span className="text-zinc-400">{targetCatalog.name}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs ${
                      handDetected
                        ? 'border-[#65A30D]/60 bg-[#65A30D]/15 text-[#D9F99D]'
                        : 'border-zinc-800 bg-zinc-900/70 text-zinc-400'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">1. Hand in Frame</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs ${
                      sealMatched
                        ? 'border-[#F97316]/70 bg-[#F97316]/20 text-[#FDBA74]'
                        : 'border-zinc-800 bg-zinc-900/70 text-zinc-400'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">2. {targetCatalog.steps[1].title}</span>
                  </div>
                </div>
              </div>

              {/* 3. Selected Jutsu & Manual Technique Controls */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-[#F5E6C8]/70 uppercase">
                  <span>Selected Jutsu</span>
                  <span className="font-mono text-zinc-400">Keys 0–3</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    { id: 'rasengan' as JutsuType, label: 'Rasengan', keyHint: '1' },
                    { id: 'chidori' as JutsuType, label: 'Chidori', keyHint: '2' },
                    { id: 'shadow-clone' as JutsuType, label: 'Shadow Clone', keyHint: '3' },
                    { id: 'none' as JutsuType, label: 'Clear Effect', keyHint: '0' },
                  ].map((item) => {
                    const active = activeJutsu === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectJutsu(item.id)}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                          active
                            ? 'border-[#F97316] bg-[#F97316] text-zinc-950'
                            : 'border-[#F5E6C8]/15 bg-[#1B1815] text-[#F5E6C8]/85 hover:border-[#F5E6C8]/40'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        <span className="font-mono text-[10px] opacity-70">
                          {item.keyHint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Chakra Intensity */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#F5E6C8]/85">
                    Chakra Intensity
                  </span>
                  <span className="font-mono tabular-nums text-zinc-400">
                    {Math.round(settings.intensity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={1.5}
                  step={0.05}
                  value={settings.intensity}
                  onChange={(e) =>
                    onUpdateSettings({ intensity: parseFloat(e.target.value) })
                  }
                  className="studio-slider mt-1.5 w-full"
                />
              </div>
            </div>
          </div>

          {/* Collapsible Captures Strip */}
          {showGalleryDrawer && gallery.length > 0 && (
            <div className="border-t border-[#F5E6C8]/15 bg-[#110F0E] px-4 py-3">
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {gallery.map((item) => (
                  <div
                    key={item.id}
                    className="flex w-44 shrink-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
                  >
                    {item.kind === 'photo' ? (
                      <img
                        src={item.url}
                        alt={item.jutsu}
                        className="aspect-video w-full object-cover"
                      />
                    ) : (
                      <video
                        src={item.url}
                        controls
                        className="aspect-video w-full object-cover"
                      />
                    )}
                    <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] text-zinc-300">
                      <span className="truncate capitalize">{item.jutsu}</span>
                      <div className="flex items-center gap-1">
                        <a
                          href={item.url}
                          download={`naruto-webcam-${item.jutsu}.${
                            item.kind === 'photo' ? 'png' : 'webm'
                          }`}
                          aria-label="Download capture"
                          className="p-1 text-zinc-400 hover:text-white"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => onDeleteMedia(item.id)}
                          aria-label="Delete capture"
                          className="p-1 text-zinc-400 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
