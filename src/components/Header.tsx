import { Camera, CameraOff } from 'lucide-react';

interface HeaderProps {
  cameraActive: boolean;
  onToggleCamera: () => void;
  onReturnToVillage: () => void;
  galleryCount: number;
}

export function Header({
  cameraActive,
  onToggleCamera,
  onReturnToVillage,
  galleryCount,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/90 bg-[#09090B]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Single text wordmark */}
        <button
          type="button"
          onClick={onReturnToVillage}
          className="font-display text-lg font-bold tracking-tight text-zinc-100 transition-colors hover:text-[#F97316] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#F97316]"
        >
          Naruto WebCam
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Training Studio Navigation"
          className="hidden items-center gap-7 text-sm font-medium text-zinc-400 md:flex"
        >
          <button
            type="button"
            onClick={onReturnToVillage}
            className="transition-colors hover:text-zinc-100 whitespace-nowrap shrink-0"
          >
            Village Journey
          </button>
          <a
            href="#studio"
            className="transition-colors hover:text-zinc-100 whitespace-nowrap shrink-0"
          >
            Training Studio
          </a>
          <a
            href="#jutsu-guide"
            className="transition-colors hover:text-zinc-100 whitespace-nowrap shrink-0"
          >
            Jutsu Guide
          </a>
          <a
            href="#gallery"
            className="transition-colors hover:text-zinc-100 whitespace-nowrap shrink-0"
          >
            Captures ({galleryCount})
          </a>
        </nav>

        {/* Zone 3: Single primary CTA */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onToggleCamera}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316] ${
              cameraActive
                ? 'border border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
                : 'bg-[#F97316] text-zinc-950 hover:bg-[#FB923C]'
            }`}
          >
            {cameraActive ? (
              <>
                <CameraOff className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Stop Camera</span>
              </>
            ) : (
              <>
                <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Start Camera</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
