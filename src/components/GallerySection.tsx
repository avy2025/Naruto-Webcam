import { useEffect, useState } from 'react';
import { Download, Expand, Trash2, X } from 'lucide-react';
import { CapturedMediaItem, JutsuType } from '../types/jutsu';

interface GallerySectionProps {
  items: CapturedMediaItem[];
  onDelete: (id: string) => void;
}

const JUTSU_NAMES: Record<JutsuType, string> = {
  none: 'Standard Frame',
  rasengan: 'Rasengan',
  chidori: 'Chidori',
  'shadow-clone': 'Multi Shadow Clone',
};

export function GallerySection({ items, onDelete }: GallerySectionProps) {
  const [selectedItem, setSelectedItem] = useState<CapturedMediaItem | null>(
    null
  );

  useEffect(() => {
    if (!selectedItem) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedItem(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedItem]);

  const handleDownload = (item: CapturedMediaItem) => {
    const ext = item.kind === 'photo' ? 'png' : 'webm';
    const link = document.createElement('a');
    link.href = item.url;
    link.download = `naruto-webcam-${item.jutsu}-${item.id}.${ext}`;
    link.click();
  };

  return (
    <section
      id="gallery"
      className="mx-auto max-w-[1440px] border-t border-zinc-800/80 px-6 py-14"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-zinc-100">
            Captured Media
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Snapshots and recorded jutsu clips saved locally in your session.
          </p>
        </div>
        <span className="font-mono text-xs tabular-nums text-zinc-400">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-800 bg-[#121216]/60 px-6 py-12 text-center">
          <p className="text-sm font-medium text-zinc-200">
            No snapshots or clips captured yet
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Use Take Photo or Record Clip below the studio viewport to export
            your jutsu frames.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#121216]"
            >
              <div className="relative aspect-video bg-black">
                {item.kind === 'photo' ? (
                  <img
                    src={item.url}
                    alt={`${JUTSU_NAMES[item.jutsu]} capture`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <video
                    src={item.url}
                    controls
                    playsInline
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-100 truncate">
                    {JUTSU_NAMES[item.jutsu]}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400">
                    <span>{item.kind === 'photo' ? 'Photo' : 'Video'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {item.createdAt}
                    </span>
                    {item.durationSec !== undefined && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {item.durationSec}s
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    aria-label="Preview capture"
                    className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                  >
                    <Expand className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(item)}
                    aria-label="Download capture"
                    className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    aria-label="Delete capture"
                    className="rounded-lg p-2 text-zinc-400 transition hover:bg-red-500/15 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Media preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-zinc-800 bg-[#121216]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
              <div className="text-sm font-medium text-zinc-100">
                {JUTSU_NAMES[selectedItem.jutsu]} ·{' '}
                <span className="text-zinc-400">
                  {selectedItem.width}×{selectedItem.height}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                aria-label="Close preview"
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="bg-black">
              {selectedItem.kind === 'photo' ? (
                <img
                  src={selectedItem.url}
                  alt={JUTSU_NAMES[selectedItem.jutsu]}
                  className="max-h-[76vh] w-full object-contain"
                />
              ) : (
                <video
                  src={selectedItem.url}
                  controls
                  autoPlay
                  className="max-h-[76vh] w-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
