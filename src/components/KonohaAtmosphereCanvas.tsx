import { useEffect, useRef } from 'react';

interface LeafParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  swayPhase: number;
  swayAmp: number;
  tint: string;
  alpha: number;
}

interface DustMote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
}

interface KonohaAtmosphereCanvasProps {
  active: boolean;
  reducedMotion: boolean;
  scrollVelocityRef: React.MutableRefObject<number>;
}

const LEAF_TINTS = ['#4D7C0F', '#65A30D', '#84CC16', '#3F6212', '#A3E635'];

export function KonohaAtmosphereCanvas({
  active,
  reducedMotion,
  scrollVelocityRef,
}: KonohaAtmosphereCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active || reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const leaves: LeafParticle[] = Array.from({ length: 16 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0.45 + Math.random() * 0.65,
      vy: 0.3 + Math.random() * 0.45,
      size: 6 + Math.random() * 6,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      swayPhase: Math.random() * Math.PI * 2,
      swayAmp: 0.4 + Math.random() * 0.6,
      tint: LEAF_TINTS[Math.floor(Math.random() * LEAF_TINTS.length)],
      alpha: 0.45 + Math.random() * 0.35,
    }));

    const motes: DustMote[] = Array.from({ length: 24 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1 + Math.random() * 1.8,
      vx: (Math.random() - 0.5) * 0.22,
      vy: -0.15 - Math.random() * 0.25,
      alpha: 0.18 + Math.random() * 0.28,
    }));

    let t = 0;
    const tick = () => {
      t += 0.016;
      ctx.clearRect(0, 0, width, height);

      const vel = scrollVelocityRef.current;
      // Decay velocity smoothly
      scrollVelocityRef.current *= 0.9;

      // Subtle warm sunlight dust motes
      for (const m of motes) {
        m.x += m.vx + vel * 0.12;
        m.y += m.vy;
        if (m.y < -10) m.y = height + 10;
        if (m.x < -10) m.x = width + 10;
        if (m.x > width + 10) m.x = -10;

        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(254, 240, 138, ${m.alpha})`;
        ctx.fill();
      }

      // Drifting Hidden Leaf foliage
      for (const leaf of leaves) {
        leaf.swayPhase += 0.028;
        const speedBoost = 1 + Math.min(3, Math.abs(vel) * 0.08);
        leaf.x += (leaf.vx + Math.sin(leaf.swayPhase) * leaf.swayAmp) * speedBoost;
        leaf.y += leaf.vy * speedBoost;
        leaf.rotation += leaf.rotSpeed * speedBoost;

        if (leaf.x > width + 30) leaf.x = -25;
        if (leaf.x < -30) leaf.x = width + 25;
        if (leaf.y > height + 30) {
          leaf.y = -20;
          leaf.x = Math.random() * width;
        }

        ctx.save();
        ctx.translate(leaf.x, leaf.y);
        ctx.rotate(leaf.rotation);
        ctx.scale(1, 0.55 + Math.sin(leaf.swayPhase) * 0.22);
        ctx.globalAlpha = leaf.alpha;
        ctx.fillStyle = leaf.tint;

        ctx.beginPath();
        ctx.moveTo(0, -leaf.size);
        ctx.quadraticCurveTo(leaf.size * 0.85, 0, 0, leaf.size);
        ctx.quadraticCurveTo(-leaf.size * 0.85, 0, 0, -leaf.size);
        ctx.fill();

        // Leaf spine
        ctx.strokeStyle = 'rgba(236, 252, 203, 0.45)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -leaf.size * 0.75);
        ctx.lineTo(0, leaf.size * 0.75);
        ctx.stroke();
        ctx.restore();
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [active, reducedMotion, scrollVelocityRef]);

  if (!active || reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-20 h-full w-full"
    />
  );
}
