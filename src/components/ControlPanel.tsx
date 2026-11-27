import { Volume2, VolumeX } from 'lucide-react';
import {
  HandDetectionState,
  JutsuType,
  StudioSettings,
} from '../types/jutsu';
import { TrackerStatus } from '../hooks/useHandTracker';

interface ControlPanelProps {
  activeJutsu: JutsuType;
  onSelectJutsu: (jutsu: JutsuType) => void;
  detectionInfo: HandDetectionState;
  trackerStatus: TrackerStatus;
  cameraActive: boolean;
  settings: StudioSettings;
  onUpdateSettings: (patch: Partial<StudioSettings>) => void;
}

const JUTSU_OPTIONS: {
  id: JutsuType;
  name: string;
  trigger: string;
  shortcut: string;
}[] = [
  { id: 'none', name: 'Clear Jutsu', trigger: 'Neutral stance', shortcut: '0' },
  {
    id: 'rasengan',
    name: 'Rasengan',
    trigger: 'Open Palm (5 fingers)',
    shortcut: '1',
  },
  {
    id: 'chidori',
    name: 'Chidori',
    trigger: 'Lightning Claw / Fist',
    shortcut: '2',
  },
  {
    id: 'shadow-clone',
    name: 'Multi Shadow Clone',
    trigger: 'Two-Finger Cross Seal',
    shortcut: '3',
  },
];

export function ControlPanel({
  activeJutsu,
  onSelectJutsu,
  detectionInfo,
  trackerStatus,
  cameraActive,
  settings,
  onUpdateSettings,
}: ControlPanelProps) {
  const trackerLabel = !cameraActive
    ? 'Demo Mode (Manual / Drag)'
    : trackerStatus === 'loading'
    ? 'Loading Hand Model...'
    : trackerStatus === 'ready'
    ? 'MediaPipe Active'
    : trackerStatus === 'unavailable'
    ? 'Model Offline (Manual Mode)'
    : 'Standby';

  return (
    <aside className="flex flex-col gap-6 rounded-2xl border border-zinc-800 bg-[#121216] p-5">
      {/* Jutsu Selector */}
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-base font-semibold text-zinc-100">
            Active Jutsu
          </h2>
          <span className="text-xs text-zinc-400">Keys 0–3</span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2">
          {JUTSU_OPTIONS.map((item) => {
            const isActive = activeJutsu === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectJutsu(item.id)}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${
                  isActive
                    ? 'border-[#F97316] bg-[#F97316]/12 text-white'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:text-white'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{item.name}</div>
                  <div className="text-xs text-zinc-400 truncate">
                    {item.trigger}
                  </div>
                </div>
                <span className="font-mono text-xs text-zinc-500 shrink-0">
                  {item.shortcut}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hand Sign Detection Status */}
      <div className="border-t border-zinc-800/80 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Auto Hand-Sign Detection
            </h3>
            <p className="mt-0.5 text-xs text-zinc-400">{trackerLabel}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.autoDetect}
            onClick={() =>
              onUpdateSettings({ autoDetect: !settings.autoDetect })
            }
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors ${
              settings.autoDetect
                ? 'border-[#F97316] bg-[#F97316]'
                : 'border-zinc-700 bg-zinc-800'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white transition ${
                settings.autoDetect ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
          <span className="truncate">
            {cameraActive ? detectionInfo.signLabel : 'Enable webcam for hand signs'}
          </span>
          <span className="font-mono tabular-nums text-zinc-300 shrink-0">
            {cameraActive && detectionInfo.confidence > 0
              ? `${Math.round(detectionInfo.confidence * 100)}%`
              : '--'}
          </span>
        </div>
      </div>

      {/* Effect Tuning */}
      <div className="border-t border-zinc-800/80 pt-5 space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="intensity-range" className="font-medium text-zinc-200">
              Chakra Intensity
            </label>
            <span className="font-mono tabular-nums text-zinc-400">
              {Math.round(settings.intensity * 100)}%
            </span>
          </div>
          <input
            id="intensity-range"
            type="range"
            min={0.6}
            max={1.5}
            step={0.05}
            value={settings.intensity}
            onChange={(e) =>
              onUpdateSettings({ intensity: parseFloat(e.target.value) })
            }
            className="studio-slider mt-2 w-full"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-zinc-200">
            Shadow Clones
          </span>
          <div className="flex items-center gap-1 rounded-lg bg-zinc-900 p-1">
            {[2, 4].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => onUpdateSettings({ cloneCount: count })}
                className={`rounded-md px-3 py-1 font-mono text-xs font-medium transition ${
                  settings.cloneCount === count
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {count}×
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-zinc-200">
            Mirror Camera
          </span>
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ mirrorFeed: !settings.mirrorFeed })
            }
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              settings.mirrorFeed
                ? 'border-zinc-600 bg-zinc-800 text-white'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400'
            }`}
          >
            {settings.mirrorFeed ? 'Mirrored' : 'Standard'}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-zinc-200">
            Sound Effects
          </span>
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ soundEnabled: !settings.soundEnabled })
            }
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              settings.soundEnabled
                ? 'border-[#F97316]/60 bg-[#F97316]/15 text-[#FDBA74]'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {settings.soundEnabled ? (
              <>
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>On</span>
              </>
            ) : (
              <>
                <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Muted</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
