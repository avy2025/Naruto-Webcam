import rasenganGuideImg from '../assets/images/jutsu_rasengan_guide_1795781420830.jpg';
import chidoriGuideImg from '../assets/images/jutsu_chidori_guide_1795781421952.jpg';
import shadowCloneGuideImg from '../assets/images/jutsu_shadow_clone_guide_1795781421426.jpg';
import { JutsuType } from '../types/jutsu';

interface JutsuGuideSectionProps {
  onTryJutsu: (jutsu: JutsuType) => void;
}

const GUIDE_CARDS: {
  id: JutsuType;
  title: string;
  sign: string;
  description: string;
  image: string;
}[] = [
  {
    id: 'rasengan',
    title: 'Rasengan',
    sign: 'Open Palm · Key 1',
    description:
      'Hold an open palm toward the camera to condense spinning azure chakra spirals directly over your hand.',
    image: rasenganGuideImg,
  },
  {
    id: 'chidori',
    title: 'Chidori',
    sign: 'Lightning Claw or Fist · Key 2',
    description:
      'Form a tense claw or closed fist to unleash branching high-voltage plasma arcs and crackling sparks.',
    image: chidoriGuideImg,
  },
  {
    id: 'shadow-clone',
    title: 'Multi Shadow Clone',
    sign: 'Two-Finger Cross Seal · Key 3',
    description:
      'Raise two fingers—or cross both hands in the signature seal—to burst smoke clouds and summon mirrored clones.',
    image: shadowCloneGuideImg,
  },
];

export function JutsuGuideSection({ onTryJutsu }: JutsuGuideSectionProps) {
  return (
    <section
      id="jutsu-guide"
      className="mx-auto max-w-[1440px] border-t border-zinc-800/80 px-6 py-14"
    >
      <div className="max-w-2xl">
        <h2 className="font-display text-2xl font-bold tracking-tight text-zinc-100">
          Hand Sign Reference
        </h2>
        <p className="mt-1.5 text-sm text-zinc-400">
          Show any of these three hand seals to your webcam when Auto Detection
          is enabled, or click a technique below to test it right away.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {GUIDE_CARDS.map((card) => (
          <article
            key={card.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#121216]"
          >
            <div className="aspect-[4/3] overflow-hidden bg-zinc-950">
              <img
                src={card.image}
                alt={`${card.title} hand sign illustration`}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex flex-1 flex-col justify-between p-5">
              <div>
                <p className="text-xs font-medium text-[#F97316]">
                  {card.sign}
                </p>
                <h3 className="mt-1 font-display text-lg font-semibold text-zinc-100">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {card.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onTryJutsu(card.id);
                  document
                    .getElementById('studio')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-5 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-100 transition hover:border-[#F97316] hover:text-white"
              >
                Activate {card.title}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
