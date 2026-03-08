import { useEffect, useRef } from 'react';

// ─── TYPES ────────────────────────────────────────────
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseOpacity: number;
  flickerSpeed: number;
  flickerPhase: number;
  hue: number;
  sat: number;
  lum: number;
}

interface Bubble {
  x: number;
  y: number;
  size: number;
  depth: number;
  floatAmp: number;
  floatFreq: number;
  floatPhase: number;
  wobbleAmp: number;
  wobbleFreq: number;
  wobblePhase: number;
  opacity: number;
}

interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

interface SceneState {
  W: number;
  H: number;
  particles: Particle[];
  bubbles: Bubble[];
}

// ─── CONFIG ───────────────────────────────────────────
const PARTICLE_COUNT = 200;
const BUBBLE_COUNT = 13;
const TRAIL_LENGTH = 55;
const GRAVITY_RADIUS = 170;
const GRAVITY_FORCE = 0.022;
const REPEL_RADIUS = 50;
const DAMPING = 0.91;

const rand = (a: number, b: number): number => a + Math.random() * (b - a);

// ─── FACTORIES ────────────────────────────────────────
function makeParticles(W: number, H: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: rand(0, W),
    y: rand(0, H),
    vx: rand(-0.3, 0.3),
    vy: rand(-0.3, 0.3),
    size: rand(1.5, 4),
    baseOpacity: rand(0.35, 0.9),
    flickerSpeed: rand(0.6, 2.2),
    flickerPhase: rand(0, Math.PI * 2),
    hue: rand(158, 182),
    sat: rand(72, 100),
    lum: rand(58, 80),
  }));
}

function makeBubbles(): Bubble[] {
  return Array.from({ length: BUBBLE_COUNT }, () => ({
    x: rand(5, 95),
    y: rand(5, 95),
    size: rand(45, 125),
    depth: rand(0.1, 0.55),
    floatAmp: rand(15, 38),
    floatFreq: rand(0.18, 0.5),
    floatPhase: rand(0, Math.PI * 2),
    wobbleAmp: rand(4, 12),
    wobbleFreq: rand(0.35, 0.85),
    wobblePhase: rand(0, Math.PI * 2),
    opacity: rand(0.05, 0.18),
  }));
}

// ─── TRAIL RENDERER ───────────────────────────────────
function drawTrail(ctx: CanvasRenderingContext2D, trail: TrailPoint[]): void {
  if (trail.length < 3) return;
  const now = Date.now();
  const MAX_AGE = 750;

  for (let i = 1; i < trail.length; i++) {
    const curr = trail[i],
      prev = trail[i - 1];
    const age = now - curr.t;
    if (age > MAX_AGE) break;
    const life = 1 - age / MAX_AGE;
    const seg = 1 - i / trail.length;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.strokeStyle = `rgba(45,212,191,${0.1 * life * seg})`;
    ctx.lineWidth = 18 * seg * life;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  for (let i = 1; i < trail.length; i++) {
    const curr = trail[i],
      prev = trail[i - 1];
    const age = now - curr.t;
    if (age > MAX_AGE) break;
    const life = 1 - age / MAX_AGE;
    const seg = 1 - i / trail.length;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.strokeStyle = `rgba(45,212,191,${0.52 * life * seg})`;
    ctx.lineWidth = Math.max(0.5, 4.5 * seg * life);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

// ─── MAIN COMPONENT ───────────────────────────────────
export default function GravityScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -999, y: -999 });
  const smoothRef = useRef<{ x: number; y: number }>({ x: -999, y: -999 });
  const trailRef = useRef<TrailPoint[]>([]);
  const stateRef = useRef<SceneState | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = Date.now();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;

    const init = (): void => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      canvas.width = W;
      canvas.height = H;
      stateRef.current = {
        W,
        H,
        particles: makeParticles(W, H),
        bubbles: makeBubbles(),
      };
    };
    init();

    const onMove = (e: MouseEvent): void => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const parent = canvas.parentElement;
    parent?.addEventListener('mousemove', onMove);

    const loop = (): void => {
      const st = stateRef.current;
      if (!st) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const { W, H, particles, bubbles } = st;
      const t = (Date.now() - (startRef.current ?? Date.now())) / 1000;

      const SM = smoothRef.current;
      SM.x += (mouseRef.current.x - SM.x) * 0.1;
      SM.y += (mouseRef.current.y - SM.y) * 0.1;

      if (mouseRef.current.x > 0) {
        trailRef.current.unshift({
          x: mouseRef.current.x,
          y: mouseRef.current.y,
          t: Date.now(),
        });
        if (trailRef.current.length > TRAIL_LENGTH) trailRef.current.pop();
      }

      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = '#060c10';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = 'rgba(45,212,191,0.03)';
      for (let gx = 0; gx < W; gx += 40) {
        for (let gy = 0; gy < H; gy += 40) {
          ctx.beginPath();
          ctx.arc(gx, gy, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const orb1 = ctx.createRadialGradient(W * 0.8, -60, 0, W * 0.8, -60, 440);
      orb1.addColorStop(0, 'rgba(13,148,136,0.32)');
      orb1.addColorStop(1, 'rgba(13,148,136,0)');
      ctx.fillStyle = orb1;
      ctx.fillRect(0, 0, W, H);

      const orb2 = ctx.createRadialGradient(
        W * 0.1,
        H * 1.0,
        0,
        W * 0.1,
        H * 1.0,
        340,
      );
      orb2.addColorStop(0, 'rgba(45,212,191,0.18)');
      orb2.addColorStop(1, 'rgba(45,212,191,0)');
      ctx.fillStyle = orb2;
      ctx.fillRect(0, 0, W, H);

      drawTrail(ctx, trailRef.current);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = SM.x - p.x;
        const dy = SM.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;

        if (dist < GRAVITY_RADIUS) {
          const f = GRAVITY_FORCE * (1 - dist / GRAVITY_RADIUS);
          if (dist > REPEL_RADIUS) {
            p.vx += (dx / dist) * f * 2.5;
            p.vy += (dy / dist) * f * 2.5;
          } else {
            p.vx -= (dx / dist) * f * 5;
            p.vy -= (dy / dist) * f * 5;
          }
        }
        p.vx += rand(-0.1, 0.1);
        p.vy += rand(-0.1, 0.1);
        p.vx *= DAMPING;
        p.vy *= DAMPING;
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -8) p.x = W + 8;
        if (p.x > W + 8) p.x = -8;
        if (p.y < -8) p.y = H + 8;
        if (p.y > H + 8) p.y = -8;

        const flicker =
          0.5 + 0.5 * Math.sin(t * p.flickerSpeed + p.flickerPhase);
        const op = p.baseOpacity * (0.55 + 0.45 * flicker);
        const prox = Math.max(0, 1 - dist / GRAVITY_RADIUS);
        const finalOp = Math.min(1, op + prox * 0.65);
        const finalLum = p.lum + prox * 28;
        const finalSize = p.size * (1 + prox * 0.9);

        if (prox > 0.05) {
          const grd = ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            finalSize * 5,
          );
          grd.addColorStop(
            0,
            `hsla(${p.hue},${p.sat}%,${finalLum}%,${finalOp * 0.45})`,
          );
          grd.addColorStop(1, `hsla(${p.hue},${p.sat}%,${finalLum}%,0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, finalSize * 5, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, finalSize, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},${p.sat}%,${finalLum}%,${finalOp})`;
        ctx.fill();
      }

      const mxN = (SM.x / W) * 2 - 1;
      const myN = (SM.y / H) * 2 - 1;

      bubbles.forEach((b: Bubble) => {
        const fy = Math.sin(t * b.floatFreq + b.floatPhase) * b.floatAmp;
        const fx =
          Math.cos(t * b.floatFreq * 0.62 + b.floatPhase) * b.floatAmp * 0.45;
        const wb = Math.sin(t * b.wobbleFreq + b.wobblePhase) * b.wobbleAmp;
        const cx = (b.x / 100) * W + fx + mxN * b.depth * -65;
        const cy = (b.y / 100) * H + fy + myN * b.depth * -65;
        const rx = b.size * 0.5 + wb;
        const ry = b.size * 0.5 - wb * 0.45;

        ctx.save();
        ctx.globalAlpha = b.opacity;

        const grd = ctx.createRadialGradient(
          cx - rx * 0.18,
          cy - ry * 0.22,
          0,
          cx,
          cy,
          Math.max(rx, ry),
        );
        grd.addColorStop(0, 'rgba(45,212,191,0.30)');
        grd.addColorStop(0.5, 'rgba(13,148,136,0.12)');
        grd.addColorStop(1, 'rgba(6,18,20,0.02)');
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(45,212,191,0.24)';
        ctx.lineWidth = 1.3;
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(
          cx - rx * 0.2,
          cy - ry * 0.25,
          rx * 0.26,
          ry * 0.14,
          -0.45,
          0,
          Math.PI * 2,
        );
        const gGrd = ctx.createRadialGradient(
          cx - rx * 0.2,
          cy - ry * 0.25,
          0,
          cx - rx * 0.2,
          cy - ry * 0.25,
          rx * 0.26,
        );
        gGrd.addColorStop(0, 'rgba(255,255,255,0.68)');
        gGrd.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gGrd;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx + rx * 0.24, cy - ry * 0.28, rx * 0.05, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.52)';
        ctx.fill();

        ctx.restore();
      });

      if (mouseRef.current.x > 0) {
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        const cursorGrd = ctx.createRadialGradient(mx, my, 0, mx, my, 18);
        cursorGrd.addColorStop(0, 'rgba(45,212,191,0.9)');
        cursorGrd.addColorStop(0.4, 'rgba(45,212,191,0.3)');
        cursorGrd.addColorStop(1, 'rgba(45,212,191,0)');
        ctx.beginPath();
        ctx.arc(mx, my, 18, 0, Math.PI * 2);
        ctx.fillStyle = cursorGrd;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(mx, my, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#2dd4bf';
        ctx.fill();
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      parent?.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        minHeight: 580,
        cursor: 'none',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          textAlign: 'center',
          padding: '0 2rem',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(45,212,191,0.08)',
            border: '1px solid rgba(45,212,191,0.22)',
            borderRadius: 100,
            padding: '0.35rem 1.1rem',
            fontSize: '0.72rem',
            fontFamily: 'monospace',
            letterSpacing: '0.12em',
            color: '#2dd4bf',
            marginBottom: '1.8rem',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#2dd4bf',
              boxShadow: '0 0 10px #2dd4bf',
            }}
          />
          Personal Data Platform
        </div>

        <h1
          style={{
            fontSize: 'clamp(2rem, 6vw, 4.2rem)',
            fontWeight: 900,
            color: '#e8f5f3',
            lineHeight: 1.1,
            marginBottom: '1rem',
            letterSpacing: '-0.01em',
            textShadow: '0 2px 60px rgba(0,0,0,0.7)',
            fontFamily: 'Georgia, serif',
          }}
        >
          Know Your <span style={{ color: '#2dd4bf' }}>Digital Self</span>
          <br />
          Like Never Before
        </h1>

        <p
          style={{
            color: 'rgba(180,220,215,0.6)',
            fontSize: 'clamp(0.85rem, 2vw, 1.05rem)',
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 300,
            maxWidth: 500,
            lineHeight: 1.85,
            margin: '0 auto 2.5rem',
            letterSpacing: '0.03em',
          }}
        >
          Personal Data Platform — unified behavioral insights, AI-driven
          cognitive observability, privacy-first.
        </p>

        <div
          style={{
            display: 'inline-block',
            pointerEvents: 'auto',
            background: 'linear-gradient(135deg, #0d9488, #2dd4bf)',
            color: '#060c10',
            padding: '0.92rem 2.8rem',
            borderRadius: 12,
            fontFamily: 'system-ui, sans-serif',
            fontSize: '0.88rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            cursor: 'pointer',
            boxShadow: '0 4px 30px rgba(45,212,191,0.32)',
          }}
        >
          GET STARTED FREE
        </div>
      </div>
    </div>
  );
}
