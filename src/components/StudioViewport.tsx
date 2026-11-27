import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Circle,
  Eye,
  MonitorPlay,
  Square,
  Video,
} from 'lucide-react';
import {
  CapturedMediaItem,
  HandDetectionState,
  JutsuType,
  NormalizedPoint,
  StudioSettings,
} from '../types/jutsu';
import { TrackerStatus, useHandTracker } from '../hooks/useHandTracker';
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

interface StudioViewportProps {
  activeJutsu: JutsuType;
  onDetectedJutsuChange: (jutsu: JutsuType) => void;
  onDetectionUpdate: (info: HandDetectionState) => void;
  onTrackerStatusChange: (status: TrackerStatus) => void;
  cameraActive: boolean;
  onCameraActiveChange: (active: boolean) => void;
  settings: StudioSettings;
  onToggleLandmarks: () => void;
  onCaptureMedia: (item: CapturedMediaItem) => void;
}

const CANVAS_W = 1280;
const CANVAS_H = 720;

export function StudioViewport({
  activeJutsu,
  onDetectedJutsuChange,
  onDetectionUpdate,
  onTrackerStatusChange,
  cameraActive,
  onCameraActiveChange,
  settings,
  onToggleLandmarks,
  onCaptureMedia,
}: StudioViewportProps) {
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

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [flashActive, setFlashActive] = useState(false);
  const [sourceMode, setSourceMode] = useState<'camera' | 'demo'>('demo');

  const { status: trackerStatus, detectFrame } = useHandTracker(
    cameraActive && settings.autoDetect,
    settings.mirrorFeed
  );

  useEffect(() => {
    onTrackerStatusChange(trackerStatus);
  }, [trackerStatus, onTrackerStatusChange]);

  // Manage real getUserMedia camera lifecycle cleanly without duplicate streams
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
      setSourceMode('demo');
      return;
    }

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Webcam API is unavailable in this browser.');
        onCameraActiveChange(false);
        return;
      }
      setCameraError(null);
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
        setSourceMode('camera');
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : 'Camera permission was denied or no webcam was found.';
          setCameraError(
            `${message} You can continue practicing in Interactive Demo mode.`
          );
          onCameraActiveChange(false);
          setSourceMode('demo');
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopExistingStream();
    };
  }, [cameraActive, onCameraActiveChange]);

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

  // Sync sound engine with active jutsu
  useEffect(() => {
    soundEngine.setActiveJutsu(activeJutsu, settings.soundEnabled);
    return () => {
      if (!settings.soundEnabled) soundEngine.stopLoop();
    };
  }, [activeJutsu, settings.soundEnabled]);

  useEffect(() => {
    return () => {
      soundEngine.stopLoop();
    };
  }, []);

  // Latest props ref to prevent restarting RAF loop on every prop tick
  const latestPropsRef = useRef({
    activeJutsu,
    settings,
    sourceMode,
    detectFrame,
    onDetectedJutsuChange,
    onDetectionUpdate,
  });
  latestPropsRef.current = {
    activeJutsu,
    settings,
    sourceMode,
    detectFrame,
    onDetectedJutsuChange,
    onDetectionUpdate,
  };

  // Main 60fps composite canvas loop
  useEffect(() => {
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
        sourceMode: mode,
        detectFrame: runDetect,
        onDetectedJutsuChange: notifyJutsu,
        onDetectionUpdate: notifyDetection,
      } = latestPropsRef.current;

      const video = videoRef.current;
      const rState = renderStateRef.current;
      const timeSec = now * 0.001;
      const hasLiveVideo =
        mode === 'camera' && video && video.readyState >= 2;

      let detection: HandDetectionState | null = null;
      if (hasLiveVideo && curSettings.autoDetect) {
        detection = runDetect(video, now);
        if (detection) {
          if (now - lastDetectionPush > 110) {
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

      // Determine anchor for Rasengan / Chidori
      const targetAnchor =
        detection?.anchor ??
        (hasLiveVideo ? { x: 0.5, y: 0.56 } : demoAnchorRef.current);

      rState.smoothAnchor.x += (targetAnchor.x - rState.smoothAnchor.x) * 0.32;
      rState.smoothAnchor.y += (targetAnchor.y - rState.smoothAnchor.y) * 0.32;

      // Trigger smoke burst when Shadow Clone activates
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

      // Prepare source frame
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      let cloneSource: HTMLVideoElement | HTMLCanvasElement;
      if (hasLiveVideo) {
        cloneSource = video;
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

      // 1. Shadow Clones behind main subject
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

      // 2. Main video / demo scene
      ctx.save();
      if (hasLiveVideo && curSettings.mirrorFeed) {
        ctx.translate(CANVAS_W, 0);
        ctx.scale(-1, 1);
      }
      if (currentJutsu === 'shadow-clone') {
        ctx.globalCompositeOperation = 'source-over';
        // Subtle cutout framing for central user over clones
        ctx.drawImage(cloneSource, 0, 0, CANVAS_W, CANVAS_H);
        // Re-overlay side clones softly with screen/lighter blend so clones remain vivid
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

      // 3. Hand Landmarks overlay
      if (curSettings.showLandmarks && detection?.hands?.length) {
        drawHandLandmarks(
          ctx,
          detection.hands,
          CANVAS_W,
          CANVAS_H,
          curSettings.mirrorFeed
        );
      }

      // 4. Jutsu Effects
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

      // 5. Particles & Smoke Puffs
      updateAndDrawParticles(ctx, rState);
      renderSmokePuffs(ctx, rState);

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Pointer dragging in Demo Mode so users can position Rasengan/Chidori interactively
  const updateDemoAnchorFromPointer = (
    e: React.PointerEvent<HTMLCanvasElement>
  ) => {
    if (sourceMode === 'camera') return;
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
      if (ev.data.size > 0) {
        recordedChunksRef.current.push(ev.data);
      }
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

  return (
    <div className="flex flex-col gap-3">
      {/* Main 16:9 Composite Studio Viewport */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
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
          className={`aspect-video w-full bg-[#09090B] object-cover ${
            sourceMode === 'demo' ? 'cursor-crosshair' : ''
          }`}
        />

        {/* Shutter Flash Overlay */}
        {flashActive && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-white/80 transition-opacity duration-150"
          />
        )}

        {/* Top Viewport Metadata Scrim */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/75 via-black/30 to-transparent px-5 py-4 text-xs text-zinc-200">
          <div className="flex items-center gap-2.5">
            <span className="font-medium text-white">
              {sourceMode === 'camera' ? 'Live Webcam' : 'Interactive Demo Stage'}
            </span>
            <span aria-hidden="true" className="text-zinc-500">
              ·
            </span>
            <span className="font-mono tabular-nums text-zinc-300">
              1280×720
            </span>
            {sourceMode === 'demo' && (
              <>
                <span aria-hidden="true" className="text-zinc-500">
                  ·
                </span>
                <span className="hidden text-zinc-300 sm:inline">
                  Drag stage to position jutsu
                </span>
              </>
            )}
          </div>

          {isRecording && (
            <div className="flex items-center gap-2 font-mono text-xs font-semibold tabular-nums text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span>REC {formatDuration(recordSeconds)}</span>
            </div>
          )}
        </div>

        {/* Bottom Scrim Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/80 bg-[#121216] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCapturePhoto}
              className="inline-flex items-center gap-2 rounded-lg bg-[#F97316] px-4 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-[#FB923C] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
            >
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Take Photo</span>
            </button>

            <button
              type="button"
              onClick={handleToggleRecording}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#F97316] ${
                isRecording
                  ? 'border-red-500/50 bg-red-500/15 text-red-300 hover:bg-red-500/25'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  <span>Stop Recording</span>
                </>
              ) : (
                <>
                  <Circle className="h-3.5 w-3.5 text-red-400 fill-red-400" aria-hidden="true" />
                  <span>Record Clip</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleLandmarks}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition whitespace-nowrap shrink-0 ${
                settings.showLandmarks
                  ? 'border-[#F97316]/60 bg-[#F97316]/15 text-[#FDBA74]'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white'
              }`}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Landmarks</span>
            </button>

            <button
              type="button"
              onClick={() => onCameraActiveChange(!cameraActive)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800 whitespace-nowrap shrink-0"
            >
              {cameraActive ? (
                <>
                  <MonitorPlay className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Switch to Demo</span>
                </>
              ) : (
                <>
                  <Video className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Enable Webcam</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {cameraError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200"
        >
          {cameraError}
        </div>
      )}
    </div>
  );
}
