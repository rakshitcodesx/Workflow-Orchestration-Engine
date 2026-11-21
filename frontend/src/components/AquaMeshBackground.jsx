import React, { useEffect, useRef } from 'react';

/**
 * AquaMeshBackground — PST_AD_165
 *
 * Refined Interactive Aqua-Glass Background System:
 *
 * SYSTEM A ── AMBIENT WAVE MOTION
 *   • 6 procedural sine-wave ribbons with dual-frequency composition.
 *   • Temporal periods: 17s (primary) to 38s (ambient).
 *   • Wave vertical displacement: 15–22px, visibly undulating every 3–4 seconds.
 *   • Layered translucent contour mesh lines and Ocean Blue / Jade Teal gradients.
 *   • Concentrated in the lower 35–45% of the viewport; upper 55% remains calm.
 *
 * SYSTEM B ── POINTER-REACTIVE PARTICLE FIELD
 *   • Structured grid (~30px spacing) stored in stable Float32Arrays (zero heap alloc per frame).
 *   • Base dot radius: 1.4px, base opacity: 0.23, darker teal color (rgb(0, 150, 130)).
 *   • Near cursor (within 200px influence radius):
 *       - Radial repulsion displacement up to 15px.
 *       - Dot radius smoothly increases up to 1.8px.
 *       - Dot opacity increases smoothly up to 0.65.
 *       - Dot color shifts toward an Electric Ice / Sea Glass cyan highlight (rgb(54, 222, 253)).
 *   • Time-step independent semi-implicit Euler spring physics (consistent on 60Hz and 120Hz).
 *   • Smooth return to rest when the pointer moves away or leaves the window.
 *
 * SYSTEM C ── INTERACTIVE POINTER RIPPLE
 *   • Subtle concentric ripple wave spawned when the pointer moves smoothly.
 *   • Stored in a fixed 4-slot ring buffer (zero per-frame object allocation).
 *   • Gentle outward nudge (~4px) that fades naturally over 0.65s like water surface tension.
 *
 * CURSOR SPOTLIGHT
 *   • Soft radial glow: rgba(84, 222, 253, 0.12) at center, 200px radius, fading to transparent.
 *   • Smooth lag interpolation behind frosted glass panels.
 *
 * ARCHITECTURAL GUARANTEES
 *   • Single requestAnimationFrame loop.
 *   • DevicePixelRatio scaling (sharp on Retina displays).
 *   • ResizeObserver with automatic cleanup.
 *   • Visibilitychange pause/resume with delta clamping.
 *   • prefers-reduced-motion: renders a single elegant static frame without loop.
 *   • Zero React state updates per frame (100% ref-based animation loop).
 */

const TAU = 2 * Math.PI;

// ─── WAVE SPECIFICATIONS ─────────────────────────────────────────────────────
// period1s: primary period (16–20s for top waves, 30–40s for base swell)
// period2s: modulation period for vertical beating
// spatialFreq: radians per CSS pixel (wavelength = 2π / freq)
// yFrac: vertical anchor fraction (lower 35–45% of viewport)
// amp: vertical peak displacement in CSS px
// alpha: base ribbon opacity
// color: palette hex (graduated cool dark-blue / slate-blue / ocean-blue shades)
const WAVES = [
  { period1s: 17, period2s: 11, spatialFreq: 0.0042, yFrac: 0.58, amp: 21, alpha: 0.30, color: '#1E4D75' },
  { period1s: 20, period2s: 13, spatialFreq: 0.0036, yFrac: 0.65, amp: 19, alpha: 0.28, color: '#164268' },
  { period1s: 24, period2s: 15, spatialFreq: 0.0030, yFrac: 0.72, amp: 18, alpha: 0.26, color: '#113B5C' },
  { period1s: 28, period2s: 18, spatialFreq: 0.0024, yFrac: 0.79, amp: 17, alpha: 0.24, color: '#1A3D5E' },
  { period1s: 33, period2s: 21, spatialFreq: 0.0019, yFrac: 0.87, amp: 16, alpha: 0.22, color: '#0E2D48' },
  { period1s: 38, period2s: 24, spatialFreq: 0.0014, yFrac: 0.94, amp: 15, alpha: 0.20, color: '#0A233A' },
];

const W_OMEGA1 = WAVES.map((w) => TAU / w.period1s);
const W_OMEGA2 = WAVES.map((w) => TAU / w.period2s);

// ─── DOT FIELD SPECIFICATIONS ────────────────────────────────────────────────
const DOT_SPACING = 30;         // ~30px structured grid
const DOT_R_BASE = 1.4;         // default dot radius
const DOT_R_HOVER = 1.8;        // max dot radius near pointer
const DOT_A_BASE = 0.23;        // default opacity (0.20–0.25)
const DOT_A_HOVER = 0.65;       // max opacity near pointer (0.55–0.70)

// Color tokens for dots
// Base: Darker teal derived from Jade Teal (#00BD9D)
const DOT_BASE_RGB = [0, 150, 130];
// Highlight: Electric Ice (#54DEFD)
const DOT_HOVER_RGB = [54, 222, 253];

// ─── POINTER INTERACTION SPECIFICATIONS ──────────────────────────────────────
const PTR_RADIUS = 200;         // 200px influence radius
const PTR_MAX_DISP = 15;        // 12–16px maximum repulsion displacement
const SPRING_STIFFNESS = 110.0; // Spring natural frequency (rad/s)
const SPRING_DAMPING = 16.0;    // Damping factor (semi-implicit Euler)

// ─── POINTER RIPPLE SPECIFICATIONS ───────────────────────────────────────────
const MAX_RIPPLES = 4;          // Fixed ring buffer of recent ripple points
const RIPPLE_DURATION = 0.65;   // Lifetime in seconds
const RIPPLE_SPEED = 240;       // Expansion velocity (px/s)
const RIPPLE_WIDTH = 36;        // Ring wave width (px)
const RIPPLE_MAX_DISP = 4.0;    // Peak wave displacement (px)
const RIPPLE_MIN_MOVE = 18;     // Pointer distance threshold to trigger next ripple

// ─── CURSOR SPOTLIGHT SPECIFICATIONS ─────────────────────────────────────────
const SPOT_RADIUS = 200;        // ~200px radius
const SPOT_ALPHA = 0.12;        // rgba(84,222,253,0.12)
const SPOT_LERP = 0.08;         // Smooth cursor follow lag

export default function AquaMeshBackground() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  // Time-base reference in seconds
  const tRef = useRef(0);

  // Geometry and state typed arrays (allocated once on resize)
  const dotsRef = useRef(null);     // [bx0, by0, bx1, by1, ...]
  const offXRef = useRef(null);     // Spring offset X
  const offYRef = useRef(null);     // Spring offset Y
  const velXRef = useRef(null);     // Spring velocity X
  const velYRef = useRef(null);     // Spring velocity Y

  // Pointer tracking refs
  const ptrXRef = useRef(-1);
  const ptrYRef = useRef(-1);
  const ptrActiveRef = useRef(false);

  // Spotlight smooth position
  const spotXRef = useRef(-1);
  const spotYRef = useRef(-1);

  // Device pixel ratio ref
  const dprRef = useRef(1);

  // Pre-allocated ripple ring buffer
  const ripplesRef = useRef([
    { x: -999, y: -999, born: -999, active: false },
    { x: -999, y: -999, born: -999, active: false },
    { x: -999, y: -999, born: -999, active: false },
    { x: -999, y: -999, born: -999, active: false },
  ]);
  const rippleHeadRef = useRef(0);
  const lastRipplePosRef = useRef({ x: -999, y: -999, time: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Reset clock on mount (guards against StrictMode double-mount)
    tRef.current = 0;
    spotXRef.current = -1;
    spotYRef.current = -1;
    ptrXRef.current = -1;
    ptrYRef.current = -1;
    ptrActiveRef.current = false;
    ripplesRef.current.forEach((r) => {
      r.active = false;
    });

    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Build Stable Dot Grid ───────────────────────────────────────────────
    const buildDots = (W, H) => {
      const cols = Math.ceil(W / DOT_SPACING) + 2;
      const rows = Math.ceil(H / DOT_SPACING) + 2;
      const count = cols * rows;

      const xy = new Float32Array(count * 2);
      const ox = new Float32Array(count);
      const oy = new Float32Array(count);
      const vx = new Float32Array(count);
      const vy = new Float32Array(count);

      let idx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          xy[idx * 2] = c * DOT_SPACING;
          xy[idx * 2 + 1] = r * DOT_SPACING;
          idx++;
        }
      }

      dotsRef.current = xy;
      offXRef.current = ox;
      offYRef.current = oy;
      velXRef.current = vx;
      velYRef.current = vy;
    };

    // ── Resize + DPR Calibration ────────────────────────────────────────────
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;
      const W = canvas.clientWidth || window.innerWidth;
      const H = canvas.clientHeight || window.innerHeight;

      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      buildDots(W, H);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(document.documentElement);

    // ── Pointer Tracking ────────────────────────────────────────────────────
    const onPointerMove = (e) => {
      // clientX/Y maps 1:1 to canvas coordinates because canvas is position:fixed inset:0
      const px = e.clientX;
      const py = e.clientY;
      ptrXRef.current = px;
      ptrYRef.current = py;
      ptrActiveRef.current = true;

      // Check if pointer has moved enough to spawn a subtle ripple wave
      const last = lastRipplePosRef.current;
      const dist = Math.hypot(px - last.x, py - last.y);
      const now = tRef.current;

      if (dist > RIPPLE_MIN_MOVE && now - last.time > 0.08) {
        last.x = px;
        last.y = py;
        last.time = now;

        const slot = rippleHeadRef.current % MAX_RIPPLES;
        ripplesRef.current[slot].x = px;
        ripplesRef.current[slot].y = py;
        ripplesRef.current[slot].born = now;
        ripplesRef.current[slot].active = true;
        rippleHeadRef.current++;
      }
    };

    const onPointerLeave = () => {
      ptrActiveRef.current = false;
      ptrXRef.current = -1;
      ptrYRef.current = -1;
    };

    if (!reduced) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('mousemove', onPointerMove, { passive: true });
      window.addEventListener('pointerleave', onPointerLeave, { passive: true });
      document.addEventListener('mouseleave', onPointerLeave, { passive: true });
    }

    // ── Diagnostic Hook (Development Only) ──────────────────────────────────
    if (typeof window !== 'undefined' && import.meta.env?.DEV) {
      window.__AQUA_BG_DEBUG__ = () => ({
        t: tRef.current,
        dpr: dprRef.current,
        reducedMotion: reduced,
        ptrX: ptrXRef.current,
        ptrY: ptrYRef.current,
        ptrActive: ptrActiveRef.current,
        totalDots: dotsRef.current ? dotsRef.current.length / 2 : 0,
      });
    }

    // ── Base Gradient & Soft Radial Accents ──────────────────────────────────
    const drawBase = () => {
      const W = canvas.width / dprRef.current;
      const H = canvas.height / dprRef.current;

      // Soft white to cyan-glass base canvas
      const grad = ctx.createLinearGradient(0, 0, W * 0.7, H);
      grad.addColorStop(0.0, '#D6F4FA');
      grad.addColorStop(0.32, '#CAF0F8');
      grad.addColorStop(0.68, '#C4EEE8');
      grad.addColorStop(1.0, '#CEF2F8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Top-right Electric Ice accent
      const rg = ctx.createRadialGradient(W * 0.88, H * 0.04, 0, W * 0.88, H * 0.04, W * 0.52);
      rg.addColorStop(0.0, 'rgba(84,222,253,0.26)');
      rg.addColorStop(0.45, 'rgba(73,198,229,0.10)');
      rg.addColorStop(0.82, 'rgba(73,198,229,0.02)');
      rg.addColorStop(1.0, 'transparent');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);

      // Bottom-left Jade Teal accent
      const jg = ctx.createRadialGradient(W * 0.06, H * 0.90, 0, W * 0.06, H * 0.90, W * 0.46);
      jg.addColorStop(0.0, 'rgba(0,189,157,0.22)');
      jg.addColorStop(0.48, 'rgba(0,189,157,0.08)');
      jg.addColorStop(0.85, 'rgba(139,215,210,0.02)');
      jg.addColorStop(1.0, 'transparent');
      ctx.fillStyle = jg;
      ctx.fillRect(0, 0, W, H);
    };

    // ── Cursor Spotlight ─────────────────────────────────────────────────────
    const drawSpotlight = () => {
      const sx = spotXRef.current;
      const sy = spotYRef.current;
      if (sx < 0 || sy < 0) return;

      const W = canvas.width / dprRef.current;
      const H = canvas.height / dprRef.current;

      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, SPOT_RADIUS);
      sg.addColorStop(0.0, `rgba(84,222,253,${SPOT_ALPHA})`);
      sg.addColorStop(0.5, `rgba(73,198,229,${(SPOT_ALPHA * 0.35).toFixed(3)})`);
      sg.addColorStop(1.0, 'transparent');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, W, H);
    };

    // ── Layered Wave Motion ──────────────────────────────────────────────────
    const drawWaves = (t) => {
      const W = canvas.width / dprRef.current;
      const H = canvas.height / dprRef.current;

      // Soft vignette to keep the upper 55% quiet and calm
      const topMask = ctx.createLinearGradient(0, 0, 0, H * 0.55);
      topMask.addColorStop(0.0, 'rgba(214,244,250,0.50)');
      topMask.addColorStop(1.0, 'rgba(214,244,250,0.00)');
      ctx.fillStyle = topMask;
      ctx.fillRect(0, 0, W, H * 0.55);

      WAVES.forEach((w, i) => {
        const baseY = H * w.yFrac;
        const ph1 = t * W_OMEGA1[i];
        const ph2 = t * W_OMEGA2[i];
        const bandH = w.amp * 2.8;

        // Dual-frequency sine: primary + 38% secondary modulation
        // Produces perceptible vertical undulation in 3–4 seconds
        const waveY = (x) =>
          w.amp * Math.sin(x * w.spatialFreq + ph1) +
          w.amp * 0.38 * Math.sin(x * w.spatialFreq * 1.6 + ph2);

        // Filled translucent ribbon band
        ctx.beginPath();
        ctx.moveTo(-4, baseY + w.amp * 1.4);
        for (let x = W + 4; x >= -4; x -= 4) {
          ctx.lineTo(x, baseY + waveY(x) - w.amp * 1.4);
        }
        for (let x = -4; x <= W + 4; x += 4) {
          ctx.lineTo(x, baseY + waveY(x) + w.amp * 1.4);
        }
        ctx.closePath();

        const hex = Math.round(w.alpha * 255).toString(16).padStart(2, '0');
        const fg = ctx.createLinearGradient(0, baseY - bandH * 0.5, 0, baseY + bandH * 0.5);
        fg.addColorStop(0.0, `${w.color}00`);
        fg.addColorStop(0.32, `${w.color}${hex}`);
        fg.addColorStop(0.68, `${w.color}${hex}`);
        fg.addColorStop(1.0, `${w.color}00`);
        ctx.fillStyle = fg;
        ctx.fill();

        // Crisp illuminated wave crest line
        const cHex = Math.round(Math.min(w.alpha * 2.5, 1) * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.moveTo(-4, baseY + waveY(-4));
        for (let x = -4; x <= W + 4; x += 4) {
          ctx.lineTo(x, baseY + waveY(x));
        }
        ctx.strokeStyle = `${w.color}${cHex}`;
        ctx.lineWidth = 1.3;
        ctx.stroke();

        // Secondary subtle contour line for dimensional mesh effect
        if (i < 3) {
          const contourAlpha = Math.round(w.alpha * 0.65 * 255).toString(16).padStart(2, '0');
          ctx.beginPath();
          ctx.moveTo(-4, baseY + waveY(-4) - 9);
          for (let x = -4; x <= W + 4; x += 6) {
            ctx.lineTo(x, baseY + waveY(x) - 9);
          }
          ctx.strokeStyle = `${w.color}${contourAlpha}`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      });
    };

    // ── Interactive Particle Dot Field ───────────────────────────────────────
    const drawDots = (t, dt) => {
      const dots = dotsRef.current;
      const offX = offXRef.current;
      const offY = offYRef.current;
      const velX = velXRef.current;
      const velY = velYRef.current;
      if (!dots) return;

      const px = ptrXRef.current;
      const py = ptrYRef.current;
      const hasPointer = ptrActiveRef.current && px >= 0;

      // Ambient drift phase (very slow gentle wave swell)
      const ambPh = t * W_OMEGA1[3];

      // Safe dt clamp for numerical spring stability
      const clampedDt = Math.min(dt, 0.05);

      const ripples = ripplesRef.current;
      const numDots = dots.length / 2;

      for (let k = 0; k < numDots; k++) {
        const bx = dots[k * 2];
        const by = dots[k * 2 + 1];

        let targetOX = 0;
        let targetOY = 0;
        let influence = 0;

        // 1. Pointer Repulsion Field
        if (hasPointer) {
          const dx = bx - px;
          const dy = by - py;
          const dist = Math.hypot(dx, dy);

          if (dist < PTR_RADIUS && dist > 0.5) {
            // Smooth cosine falloff (1 at pointer center, 0 at PTR_RADIUS)
            const norm = dist / PTR_RADIUS;
            influence = 0.5 * (1 + Math.cos(norm * Math.PI));

            const disp = influence * PTR_MAX_DISP;
            targetOX = (dx / dist) * disp;
            targetOY = (dy / dist) * disp;
          }
        }

        // 2. Interactive Ripple Effect
        for (let r = 0; r < MAX_RIPPLES; r++) {
          const rip = ripples[r];
          if (!rip.active) continue;

          const age = t - rip.born;
          if (age > RIPPLE_DURATION) {
            rip.active = false;
            continue;
          }

          const rdx = bx - rip.x;
          const rdy = by - rip.y;
          const rDist = Math.hypot(rdx, rdy);
          const currentRadius = age * RIPPLE_SPEED;
          const delta = rDist - currentRadius;

          if (Math.abs(delta) < RIPPLE_WIDTH && rDist > 1.0) {
            // Concentric sine wave pulse passing through dots
            const wavePhase = (delta / RIPPLE_WIDTH) * Math.PI;
            const envelope = (1 - age / RIPPLE_DURATION) * Math.sin(wavePhase);
            const rippleNudge = envelope * RIPPLE_MAX_DISP;

            targetOX += (rdx / rDist) * rippleNudge;
            targetOY += (rdy / rDist) * rippleNudge;
          }
        }

        // 3. Time-Step Independent Semi-Implicit Euler Spring Physics
        // Behaves identically on 60Hz and 120Hz displays
        const accelX = (targetOX - offX[k]) * SPRING_STIFFNESS - velX[k] * SPRING_DAMPING;
        const accelY = (targetOY - offY[k]) * SPRING_STIFFNESS - velY[k] * SPRING_DAMPING;

        velX[k] += accelX * clampedDt;
        velY[k] += accelY * clampedDt;
        offX[k] += velX[k] * clampedDt;
        offY[k] += velY[k] * clampedDt;

        // Ambient gentle wave drift (~1.2px)
        const ambDrift = Math.sin(bx * 0.015 + ambPh) * 1.2;

        const fx = bx + offX[k];
        const fy = by + offY[k] + ambDrift;

        // Visual properties: smoothly scale radius, opacity, and color near cursor
        const currentRadius = DOT_R_BASE + influence * (DOT_R_HOVER - DOT_R_BASE);
        const currentAlpha = DOT_A_BASE + influence * (DOT_A_HOVER - DOT_A_BASE);

        // Color interpolation: dark jade teal -> luminous Electric Ice
        const cr = Math.round(DOT_BASE_RGB[0] + influence * (DOT_HOVER_RGB[0] - DOT_BASE_RGB[0]));
        const cg = Math.round(DOT_BASE_RGB[1] + influence * (DOT_HOVER_RGB[1] - DOT_BASE_RGB[1]));
        const cb = Math.round(DOT_BASE_RGB[2] + influence * (DOT_HOVER_RGB[2] - DOT_BASE_RGB[2]));

        ctx.fillStyle = `rgba(${cr},${cg},${cb},${currentAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(fx, fy, currentRadius, 0, TAU);
        ctx.fill();
      }
    };

    // ── Reduced-Motion Static Presentation ───────────────────────────────────
    if (reduced) {
      drawBase();
      drawWaves(2.0); // t=2s for an elegant stationary wave contour
      const dots = dotsRef.current;
      if (dots) {
        ctx.fillStyle = `rgba(${DOT_BASE_RGB[0]},${DOT_BASE_RGB[1]},${DOT_BASE_RGB[2]},${DOT_A_BASE})`;
        const count = dots.length / 2;
        for (let k = 0; k < count; k++) {
          ctx.beginPath();
          ctx.arc(dots[k * 2], dots[k * 2 + 1], DOT_R_BASE, 0, TAU);
          ctx.fill();
        }
      }
      return () => {
        ro.disconnect();
      };
    }

    // ── Animation Loop ───────────────────────────────────────────────────────
    let lastTs = 0;

    const loop = (ts) => {
      let dt = 0.016; // default fallback (60fps)
      if (lastTs !== 0) {
        const rawDt = (ts - lastTs) / 1000;
        dt = Math.min(rawDt, 0.1); // clamp tab-inactivity jump
        tRef.current += dt;
      }
      lastTs = ts;

      const t = tRef.current;

      // Cursor spotlight interpolation (gentle 150ms follow delay)
      const px = ptrXRef.current;
      const py = ptrYRef.current;
      if (px >= 0) {
        if (spotXRef.current < 0) {
          spotXRef.current = px;
          spotYRef.current = py;
        } else {
          spotXRef.current += (px - spotXRef.current) * SPOT_LERP;
          spotYRef.current += (py - spotYRef.current) * SPOT_LERP;
        }
      } else if (spotXRef.current >= 0) {
        // Pointer left: smoothly glide away off-screen
        spotXRef.current += (-400 - spotXRef.current) * 0.05;
        if (spotXRef.current < -380) {
          spotXRef.current = -1;
        }
      }

      drawBase();
      drawSpotlight();
      drawWaves(t);
      drawDots(t, dt);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    // ── Tab Visibility Handling ──────────────────────────────────────────────
    const handleVisibility = () => {
      if (document.hidden) {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      } else if (!rafRef.current) {
        lastTs = 0; // reset delta so no phase leap on return
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // ── Component Cleanup ────────────────────────────────────────────────────
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      ro.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('mouseleave', onPointerLeave);
      if (typeof window !== 'undefined') {
        delete window.__AQUA_BG_DEBUG__;
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none', // passes clicks cleanly to buttons and dashboard elements
        display: 'block',
      }}
      aria-hidden="true"
    />
  );
}
