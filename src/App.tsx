import { useCallback, useEffect, useState } from 'react';
import {
  CapturedMediaItem,
  HandDetectionState,
  JutsuType,
  StudioSettings,
} from './types/jutsu';
import { TrackerStatus } from './hooks/useHandTracker';
import { JutsuManualEntry } from './data/jutsuCatalog';
import { KonohaJourney } from './components/KonohaJourney';
import { JutsuExplorerModal } from './components/JutsuExplorerModal';
import { ShinobiTrainingOverlay } from './components/ShinobiTrainingOverlay';

export function App() {
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [explorerSelectedId, setExplorerSelectedId] =
    useState<JutsuManualEntry['id']>('rasengan');

  const [hasInitializedTraining, setHasInitializedTraining] = useState(false);
  const [trainingOpen, setTrainingOpen] = useState(false);

  const [activeJutsu, setActiveJutsu] = useState<JutsuType>('rasengan');
  const [cameraActive, setCameraActive] = useState(false);
  const [trackerStatus, setTrackerStatus] = useState<TrackerStatus>('idle');
  const [detectionInfo, setDetectionInfo] = useState<HandDetectionState>({
    hands: [],
    detectedJutsu: 'none',
    signLabel: 'No hand detected',
    confidence: 0,
    anchor: null,
  });
  const [settings, setSettings] = useState<StudioSettings>({
    autoDetect: true,
    showLandmarks: true,
    intensity: 1,
    soundEnabled: false,
    mirrorFeed: true,
    cloneCount: 2,
  });
  const [gallery, setGallery] = useState<CapturedMediaItem[]>([]);

  const handleOpenExplorer = useCallback(() => {
    setExplorerOpen(true);
  }, []);

  const handleCloseExplorer = useCallback(() => {
    setExplorerOpen(false);
  }, []);

  const handleMeetTeamFromExplorer = useCallback(() => {
    setExplorerOpen(false);
    // Advance smoothly to Frame 3 welcome scene on the same page
    window.requestAnimationFrame(() => {
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({
        top: Math.max(0, maxScroll * 0.96),
        behavior: 'smooth',
      });
    });
  }, []);

  const handleStartTraining = useCallback(() => {
    const firstTime = !hasInitializedTraining;
    setHasInitializedTraining(true);
    setTrainingOpen(true);
    // Request camera permission cleanly on first click; avoid reinitializing if already active
    if (firstTime && !cameraActive) {
      setCameraActive(true);
    }
  }, [hasInitializedTraining, cameraActive]);

  const handleReturnToVillage = useCallback(() => {
    // Return to Frame 3 village scene without tearing down or reinitializing an active camera stream
    setTrainingOpen(false);
  }, []);

  const handleUpdateSettings = useCallback(
    (patch: Partial<StudioSettings>) => {
      setSettings((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const handleCaptureMedia = useCallback((item: CapturedMediaItem) => {
    setGallery((prev) => [item, ...prev]);
  }, []);

  const handleDeleteMedia = useCallback((id: string) => {
    setGallery((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  // Keyboard shortcuts 0-3 inside same-page training station
  useEffect(() => {
    if (!trainingOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === '0') setActiveJutsu('none');
      if (e.key === '1') setActiveJutsu('rasengan');
      if (e.key === '2') setActiveJutsu('chidori');
      if (e.key === '3') setActiveJutsu('shadow-clone');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [trainingOpen]);

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100">
      <KonohaJourney
        trainingOpen={trainingOpen}
        explorerOpen={explorerOpen}
        cameraActive={cameraActive}
        onOpenExplorer={handleOpenExplorer}
        onStartTraining={handleStartTraining}
      />

      <JutsuExplorerModal
        open={explorerOpen}
        selectedId={explorerSelectedId}
        onSelectId={(id) => {
          setExplorerSelectedId(id);
          setActiveJutsu(id);
        }}
        onClose={handleCloseExplorer}
        onMeetTeam={handleMeetTeamFromExplorer}
      />

      {hasInitializedTraining && (
        <ShinobiTrainingOverlay
          visible={trainingOpen}
          cameraActive={cameraActive}
          onCameraActiveChange={setCameraActive}
          activeJutsu={activeJutsu}
          onSelectJutsu={setActiveJutsu}
          detectionInfo={detectionInfo}
          onDetectionUpdate={setDetectionInfo}
          trackerStatus={trackerStatus}
          onTrackerStatusChange={setTrackerStatus}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          gallery={gallery}
          onCaptureMedia={handleCaptureMedia}
          onDeleteMedia={handleDeleteMedia}
          onReturnToVillage={handleReturnToVillage}
        />
      )}
    </div>
  );
}

export default App;
