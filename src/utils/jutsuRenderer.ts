import { JutsuType, NormalizedPoint } from '../types/jutsu';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface SmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  decay: number;
}

export interface RenderState {
  particles: Particle[];
  smokePuffs: SmokePuff[];
  smoothAnchor: NormalizedPoint;
  lastJutsu: JutsuType;
  activationTime: number;
}

export function createInitialRenderState(): RenderState {
  return {
    particles: [],
    smokePuffs: [],
    smoothAnchor: { x: 0.5, y: 0.55 },
    lastJutsu: 'none',
    activationTime: 0,
  };
}

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

export function drawHandLandmarks(
  ctx: CanvasRenderingContext2D,
  hands: NormalizedPoint[][],
  width: number,
  height: number,
  mirrorFeed: boolean
) {
  ctx.save();
  for (const hand of hands) {
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.72)';
    ctx.lineWidth = 2;
    for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
      const p1 = hand[startIdx];
      const p2 = hand[endIdx];
      if (!p1 || !p2) continue;
      const x1 = (mirrorFeed ? 1 - p1.x : p1.x) * width;
      const y1 = p1.y * height;
      const x2 = (mirrorFeed ? 1 - p2.x : p2.x) * width;
      const y2 = p2.y * height;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    for (let i = 0; i < hand.length; i++) {
      const p = hand[i];
      const x = (mirrorFeed ? 1 - p.x : p.x) * width;
      const y = p.y * height;
      ctx.beginPath();
      ctx.arc(x, y, i === 9 ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = i === 9 ? '#38BDF8' : '#F4F4F5';
      ctx.fill();
    }
  }
  ctx.restore();
}

export function spawnShadowCloneSmoke(
  state: RenderState,
  width: number,
  height: number,
  cloneCount: number
) {
  const offsets =
    cloneCount >= 4
      ? [-0.28, -0.14, 0.14, 0.28]
      : [-0.2, 0.2];

  for (const offset of offsets) {
    const cx = width * (0.5 + offset);
    const cy = height * 0.56;
    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.4;
      const speed = 1.5 + Math.random() * 4.5;
      state.smokePuffs.push({
        x: cx + (Math.random() - 0.5) * 70,
        y: cy + (Math.random() - 0.5) * 140,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.8,
        radius: 26 + Math.random() * 44,
        alpha: 0.85,
        decay: 0.018 + Math.random() * 0.015,
      });
    }
  }
}

export function renderShadowCloneLayer(
  ctx: CanvasRenderingContext2D,
  source: HTMLVideoElement | HTMLCanvasElement,
  width: number,
  height: number,
  mirrorFeed: boolean,
  cloneCount: number,
  intensity: number,
  timeSec: number,
  state: RenderState
) {
  const elapsed = (performance.now() - state.activationTime) / 1000;
  const popScale = Math.min(1, 0.82 + elapsed * 0.9);
  const offsets =
    cloneCount >= 4
      ? [
          { dx: -0.28, dy: 0.03, scale: 0.86, alpha: 0.44 },
          { dx: 0.28, dy: 0.03, scale: 0.86, alpha: 0.44 },
          { dx: -0.16, dy: 0.015, scale: 0.93, alpha: 0.62 },
          { dx: 0.16, dy: 0.015, scale: 0.93, alpha: 0.62 },
        ]
      : [
          { dx: -0.21, dy: 0.02, scale: 0.92, alpha: 0.58 },
          { dx: 0.21, dy: 0.02, scale: 0.92, alpha: 0.58 },
        ];

  ctx.save();
  for (let i = 0; i < offsets.length; i++) {
    const cfg = offsets[i];
    const bob = Math.sin(timeSec * 3.2 + i * 1.4) * 4 * intensity;
    const s = cfg.scale * popScale;
    const drawW = width * s;
    const drawH = height * s;
    const tx = width * 0.5 + cfg.dx * width * intensity;
    const ty = height * 0.5 + cfg.dy * height + bob;

    ctx.save();
    ctx.globalAlpha = Math.min(0.82, cfg.alpha * (0.7 + intensity * 0.25));
    ctx.translate(tx, ty);
    if (mirrorFeed) {
      ctx.scale(-1, 1);
    }
    ctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }
  ctx.restore();
}

export function renderSmokePuffs(
  ctx: CanvasRenderingContext2D,
  state: RenderState
) {
  if (state.smokePuffs.length === 0) return;
  ctx.save();
  for (let i = state.smokePuffs.length - 1; i >= 0; i--) {
    const puff = state.smokePuffs[i];
    puff.x += puff.vx;
    puff.y += puff.vy;
    puff.radius += 0.7;
    puff.alpha -= puff.decay;

    if (puff.alpha <= 0.01) {
      state.smokePuffs.splice(i, 1);
      continue;
    }

    const grad = ctx.createRadialGradient(
      puff.x,
      puff.y,
      puff.radius * 0.1,
      puff.x,
      puff.y,
      puff.radius
    );
    grad.addColorStop(0, `rgba(244, 244, 245, ${puff.alpha})`);
    grad.addColorStop(0.55, `rgba(212, 212, 216, ${puff.alpha * 0.75})`);
    grad.addColorStop(1, 'rgba(161, 161, 170, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(puff.x, puff.y, puff.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function renderRasengan(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  intensity: number,
  timeSec: number,
  state: RenderState
) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // Outer ambient chakra aura
  const outerGrad = ctx.createRadialGradient(cx, cy, radius * 0.15, cx, cy, radius * 2.2);
  outerGrad.addColorStop(0, `rgba(224, 242, 254, ${0.85 * intensity})`);
  outerGrad.addColorStop(0.28, `rgba(56, 189, 248, ${0.68 * intensity})`);
  outerGrad.addColorStop(0.62, `rgba(14, 165, 233, ${0.28 * intensity})`);
  outerGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');

  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Rotating spiral chakra ribbons
  const ribbonCount = 7;
  for (let i = 0; i < ribbonCount; i++) {
    const baseAngle = timeSec * (7.5 + (i % 3) * 2.1) + (i * Math.PI * 2) / ribbonCount;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(baseAngle);

    const ellipseTilt = 0.42 + (i % 3) * 0.18;
    ctx.scale(1, ellipseTilt);

    ctx.beginPath();
    ctx.arc(0, 0, radius * (0.72 + (i % 2) * 0.18), 0, Math.PI * 1.45);
    ctx.strokeStyle =
      i % 2 === 0
        ? `rgba(186, 230, 253, ${0.9 * intensity})`
        : `rgba(56, 189, 248, ${0.85 * intensity})`;
    ctx.lineWidth = 2.5 + (i % 2) * 1.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  // Inner bright swirling shell
  const coreGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, radius * 0.85);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
  coreGrad.addColorStop(0.45, 'rgba(125, 211, 252, 0.85)');
  coreGrad.addColorStop(0.85, 'rgba(2, 132, 199, 0.35)');
  coreGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');

  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
  ctx.fill();

  // Spawn orbiting chakra sparks
  if (state.particles.length < 45) {
    const angle = Math.random() * Math.PI * 2;
    const dist = radius * (0.6 + Math.random() * 0.6);
    state.particles.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      vx: -Math.sin(angle) * 2.8 + (Math.random() - 0.5) * 1.5,
      vy: Math.cos(angle) * 2.8 + (Math.random() - 0.5) * 1.5,
      life: 1,
      maxLife: 1,
      size: 1.5 + Math.random() * 2.5,
      color: Math.random() > 0.35 ? '#BAE6FD' : '#38BDF8',
    });
  }

  ctx.restore();
}

function drawLightningBolt(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  displace: number,
  lineWidth: number,
  color: string
) {
  if (displace < 4) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    return;
  }
  const midX = (x1 + x2) * 0.5 + (Math.random() - 0.5) * displace;
  const midY = (y1 + y2) * 0.5 + (Math.random() - 0.5) * displace;
  drawLightningBolt(ctx, x1, y1, midX, midY, displace * 0.52, lineWidth, color);
  drawLightningBolt(ctx, midX, midY, x2, y2, displace * 0.52, lineWidth, color);
}

export function renderChidori(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  intensity: number,
  state: RenderState
) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // Electric plasma core glow
  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, radius * 2.1);
  glow.addColorStop(0, `rgba(255, 255, 255, ${0.95 * intensity})`);
  glow.addColorStop(0.22, `rgba(147, 197, 253, ${0.78 * intensity})`);
  glow.addColorStop(0.55, `rgba(59, 130, 246, ${0.35 * intensity})`);
  glow.addColorStop(1, 'rgba(37, 99, 235, 0)');

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 2.1, 0, Math.PI * 2);
  ctx.fill();

  // Jagged branching lightning bolts
  const boltCount = Math.round(7 * intensity) + 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 0; i < boltCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const reach = radius * (1.2 + Math.random() * 1.45);
    const ex = cx + Math.cos(angle) * reach;
    const ey = cy + Math.sin(angle) * reach;

    // Outer blue arc
    drawLightningBolt(
      ctx,
      cx,
      cy,
      ex,
      ey,
      radius * 0.62,
      2.4,
      `rgba(96, 165, 250, ${0.88 * intensity})`
    );
    // Inner white hot arc
    drawLightningBolt(
      ctx,
      cx,
      cy,
      ex,
      ey,
      radius * 0.45,
      1.1,
      `rgba(240, 249, 255, ${0.95 * intensity})`
    );
  }

  // Crackling spark particles
  if (state.particles.length < 55) {
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 3 + Math.random() * 6;
      state.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: 1,
        maxLife: 1,
        size: 1.5 + Math.random() * 2,
        color: Math.random() > 0.4 ? '#E0F2FE' : '#60A5FA',
      });
    }
  }

  ctx.restore();
}

export function updateAndDrawParticles(
  ctx: CanvasRenderingContext2D,
  state: RenderState
) {
  if (state.particles.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.045;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawDemoScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  anchor: NormalizedPoint
) {
  // Clean studio dark backdrop with subtle depth radial light
  const bg = ctx.createRadialGradient(
    width * 0.5,
    height * 0.42,
    40,
    width * 0.5,
    height * 0.5,
    width * 0.72
  );
  bg.addColorStop(0, '#1E2430');
  bg.addColorStop(0.55, '#12151C');
  bg.addColorStop(1, '#09090B');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle floor grid perspective lines
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  const horizonY = height * 0.72;
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(width * 0.5 + i * 38, horizonY);
    ctx.lineTo(width * 0.5 + i * 170, height);
    ctx.stroke();
  }
  for (let r = 0; r < 5; r++) {
    const y = horizonY + Math.pow(r / 4, 1.5) * (height - horizonY);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  // Stylized shinobi silhouette in center so Shadow Clone & hand effects look alive in Demo Mode
  const cx = width * 0.5;
  const headY = height * 0.34 + Math.sin(timeSec * 1.8) * 3;
  const handX = anchor.x * width;
  const handY = anchor.y * height;

  ctx.save();
  // Headband ribbon tail
  ctx.strokeStyle = '#3F3F46';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + 34, headY - 8);
  ctx.quadraticCurveTo(
    cx + 76,
    headY - 14 + Math.sin(timeSec * 4.5) * 10,
    cx + 116,
    headY + 6 + Math.cos(timeSec * 4.5) * 12
  );
  ctx.stroke();

  // Torso & shoulders
  ctx.fillStyle = '#1C1D24';
  ctx.strokeStyle = '#3F3F46';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 105, height * 0.96);
  ctx.quadraticCurveTo(cx - 95, height * 0.56, cx - 54, height * 0.49);
  ctx.lineTo(cx + 54, height * 0.49);
  ctx.quadraticCurveTo(cx + 95, height * 0.56, cx + 105, height * 0.96);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Orange collar accent
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 32, height * 0.49);
  ctx.lineTo(cx, height * 0.55);
  ctx.lineTo(cx + 32, height * 0.49);
  ctx.stroke();

  // Head silhouette
  ctx.fillStyle = '#1C1D24';
  ctx.strokeStyle = '#3F3F46';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, headY, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Forehead protector plate
  ctx.fillStyle = '#52525B';
  ctx.fillRect(cx - 26, headY - 20, 52, 14);

  // Arm extending toward interactive hand anchor
  ctx.strokeStyle = '#27272A';
  ctx.lineWidth = 24;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + 52, height * 0.56);
  ctx.quadraticCurveTo(
    (cx + 52 + handX) * 0.5,
    Math.max(height * 0.62, handY + 35),
    handX,
    handY
  );
  ctx.stroke();

  // Palm / hand node
  ctx.fillStyle = '#27272A';
  ctx.strokeStyle = '#52525B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(handX, handY, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
