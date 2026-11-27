import { useEffect, useState } from 'react';
import { ArrowRight, ChevronRight, X } from 'lucide-react';
import { JUTSU_CATALOG, JutsuManualEntry } from '../data/jutsuCatalog';
import { HandSignDiagram, KonohaLeafSymbol } from './HandSignDiagram';

interface JutsuExplorerModalProps {
  open: boolean;
  selectedId: JutsuManualEntry['id'];
  onSelectId: (id: JutsuManualEntry['id']) => void;
  onClose: () => void;
  onMeetTeam: () => void;
}

export function JutsuExplorerModal({
  open,
  selectedId,
  onSelectId,
  onClose,
  onMeetTeam,
}: JutsuExplorerModalProps) {
  const [activeTab, setActiveTab] = useState<JutsuManualEntry['id']>(selectedId);

  useEffect(() => {
    setActiveTab(selectedId);
  }, [selectedId]);

  // Lock background page scroll while modal is open so ScrollTrigger never scrubs
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const entry =
    JUTSU_CATALOG.find((item) => item.id === activeTab) ?? JUTSU_CATALOG[0];

  const handleSelect = (id: JutsuManualEntry['id']) => {
    setActiveTab(id);
    onSelectId(id);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Classified Shinobi Jutsu Training Manual"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="scroll-parchment-panel relative flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#F5E6C8]/20 text-zinc-100"
      >
        {/* Top Scroll Header */}
        <div className="flex items-center justify-between gap-4 border-b border-[#F5E6C8]/15 bg-[#191613]/90 px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#F97316]/40 bg-[#F97316]/15 text-[#F97316]">
              <KonohaLeafSymbol className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[#F5E6C8]/75 uppercase">
                Konohagakure · Shinobi Training Scroll
              </p>
              <h2 className="font-display text-xl font-bold tracking-wide text-[#F5E6C8] sm:text-2xl truncate">
                JUTSU &amp; HAND-SIGN MANUAL
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Jutsu Explorer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#F5E6C8]/20 bg-black/40 px-3 py-2 text-xs font-semibold text-[#F5E6C8] transition hover:border-[#F97316] hover:text-white shrink-0"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">CLOSE</span>
          </button>
        </div>

        {/* Technique Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-[#F5E6C8]/10 bg-[#12100E] px-5 py-3 sm:px-7">
          {JUTSU_CATALOG.map((item) => {
            const selected = item.id === entry.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold tracking-wider transition whitespace-nowrap shrink-0 ${
                  selected
                    ? 'border-[#F97316] bg-[#F97316] text-zinc-950 shadow-md'
                    : 'border-[#F5E6C8]/15 bg-[#1B1815] text-[#F5E6C8]/80 hover:border-[#F5E6C8]/40 hover:text-white'
                }`}
              >
                <span className="font-display text-sm tracking-wide">
                  {item.name}
                </span>
                <span className="opacity-75">· {item.japaneseName}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto px-5 py-6 sm:px-7">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            {/* Left: Visual Effect Preview + Description */}
            <div className="md:col-span-5 flex flex-col gap-4">
              <div className="overflow-hidden rounded-xl border border-[#F5E6C8]/15 bg-black">
                <img
                  src={entry.image}
                  alt={`${entry.name} visual effect preview`}
                  referrerPolicy="no-referrer"
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>

              <div>
                <p className="text-xs font-medium text-[#F97316]">
                  {entry.classification}
                </p>
                <h3 className="mt-1 font-display text-3xl font-bold tracking-wide text-[#F5E6C8]">
                  {entry.name}
                </h3>
                <p className="mt-1 text-xs font-medium text-[#F5E6C8]/75">
                  {entry.tagline}
                </p>
                <p className="mt-2.5 text-sm leading-relaxed text-zinc-300">
                  {entry.description}
                </p>
              </div>

              <div className="rounded-xl border border-[#F5E6C8]/12 bg-black/35 p-3.5">
                <p className="text-[11px] font-semibold tracking-wider text-[#F5E6C8]/70 uppercase">
                  Resulting Jutsu Effect
                </p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                  {entry.effectSummary}
                </p>
              </div>
            </div>

            {/* Right: Numbered Sequential Hand-Sign Progression */}
            <div className="md:col-span-7 flex flex-col justify-between gap-5">
              <div>
                <div className="flex items-center justify-between border-b border-[#F5E6C8]/15 pb-2.5">
                  <h4 className="font-display text-lg font-semibold tracking-wide text-[#F5E6C8]">
                    REQUIRED HAND-SIGN SEQUENCE
                  </h4>
                  <span className="font-mono text-xs text-zinc-400">
                    Perform in order · {entry.shortcut}
                  </span>
                </div>

                <ol className="mt-4 space-y-3.5">
                  {entry.steps.map((step, index) => (
                    <li key={step.stepNumber} className="relative">
                      <div className="flex items-start gap-4 rounded-xl border border-[#F5E6C8]/15 bg-[#1B1815]/90 p-4">
                        <HandSignDiagram
                          kind={step.diagram}
                          accentColor={entry.accentColor}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-[#F97316]">
                              STEP {String(step.stepNumber).padStart(2, '0')}
                            </span>
                            {index < entry.steps.length - 1 && (
                              <span className="inline-flex items-center gap-0.5 text-[11px] text-zinc-400">
                                <span>Then</span>
                                <ChevronRight className="h-3 w-3" aria-hidden="true" />
                              </span>
                            )}
                          </div>
                          <h5 className="mt-0.5 font-display text-lg font-semibold tracking-wide text-white">
                            {step.title}
                          </h5>
                          <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                            {step.instruction}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>

                <div className="mt-4 rounded-xl border border-[#65A30D]/30 bg-[#65A30D]/10 px-4 py-3 text-xs text-[#D9F99D]">
                  Training Note: Hand-sign diagrams above illustrate the exact
                  pose rules tracked by your webcam. Your camera remains off
                  until you begin training with your squad.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F5E6C8]/15 bg-[#151311] px-5 py-4 sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#F5E6C8]/20 bg-transparent px-4 py-2 text-xs font-semibold text-[#F5E6C8] transition hover:border-[#F5E6C8]/50 hover:bg-white/5"
          >
            Back to Village Street
          </button>

          <button
            type="button"
            onClick={onMeetTeam}
            className="inline-flex items-center gap-2 rounded-lg bg-[#F97316] px-5 py-2.5 text-xs font-bold tracking-wider text-zinc-950 uppercase transition hover:bg-[#FB923C]"
          >
            <span>Ready? Meet Your Team</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
