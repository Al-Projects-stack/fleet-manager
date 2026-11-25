import { forwardRef, useEffect, useImperativeHandle, useRef, type ReactNode, type RefObject } from 'react';
import {
  Truck,
  createTruckRefs,
  AIR_BRAKES,
  CAB_PIVOT,
  CHASSIS_PIVOT,
  EXHAUST,
  FRONT,
  G,
  HUD_ANCHOR,
  TRAILER_PIVOT,
  UNITS_PER_M,
  VB,
  WHEELS,
  WHEEL_CY,
  WHEEL_R_M,
} from './Truck';
import { LAMPS, SCENE, SceneBackdrop } from './SceneBackdrop';

export interface TruckSceneHandle {
  /** Drive the truck off to the right. Resolves when the page can navigate. */
  depart: () => Promise<void>;
}

type Phase = 'wait' | 'cruise' | 'brake' | 'stopped' | 'parked' | 'exit';

interface Spring {
  th: number;
  w: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  grow: number;
  life: number;
  max: number;
  a: number;
  drag: number;
  lift: number;
  sprite: number;
}

const A_NOM = 2.3; // m/s², firm but comfortable service braking
const A_EXIT = 3.2;
const LAMP_SRC_X = 33; // light source offset from pole in backdrop units
const STATUS: Record<Phase, string> = {
  wait: 'Inbound',
  cruise: 'Inbound',
  brake: 'Braking',
  stopped: 'Holding',
  parked: 'Parked',
  exit: 'Departing',
};

function stepSpring(s: Spring, target: number, hz: number, zeta: number, dt: number) {
  const w = 2 * Math.PI * hz;
  const acc = -w * w * (s.th - target) - 2 * zeta * w * s.w;
  s.w += acc * dt;
  s.th += s.w * dt;
}

function makeSprite(rgb: string, size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, `rgba(${rgb},1)`);
  grd.addColorStop(0.4, `rgba(${rgb},0.55)`);
  grd.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return c;
}

interface Props {
  children?: ReactNode;
  /** Element (hero copy) the parked truck should not overlap. */
  avoidRef?: RefObject<HTMLElement>;
}

export const TruckScene = forwardRef<TruckSceneHandle, Props>(function TruckScene({ children, avoidRef }, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const truckWrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const hudSpeed = useRef<HTMLSpanElement>(null);
  const hudStatus = useRef<HTMLSpanElement>(null);
  const hudOdo = useRef<HTMLSpanElement>(null);
  const refs = useRef(createTruckRefs()).current;
  const departRef = useRef<() => void>(() => {});

  useImperativeHandle(ref, () => ({
    depart: () =>
      new Promise<void>((resolve) => {
        departRef.current();
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.setTimeout(resolve, reduce ? 0 : 1150);
      }),
  }));

  useEffect(() => {
    const root = rootRef.current!;
    const wrap = truckWrapRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const sprites = [
      makeSprite('188,196,208'), // 0 exhaust haze
      makeSprite('46,48,54'), // 1 diesel soot
      makeSprite('196,214,236'), // 2 tyre spray
      makeSprite('232,238,246'), // 3 air brake
    ];

    // ── layout ──
    const L = {
      W: 0,
      H: 0,
      s: 1,
      offX: 0,
      groundY: 0,
      ts: 1,
      pxPerM: 1,
      targetM: 0,
      startM: 0,
      dpr: 1,
      lampsX: [] as number[],
      hudOk: false,
    };

    const st = {
      phase: (reduce ? 'parked' : 'wait') as Phase,
      x: 0,
      v: 0,
      a: 0,
      t: 0,
      phaseT: 0,
      wheelAng: 0,
      dist: 0,
      brake: reduce ? 0 : 1,
      cab: { th: 0, w: 0 } as Spring,
      ch: { th: 0, w: 0 } as Spring,
      tr: { th: 0, w: 0 } as Spring,
      hudT: 0,
      emitAcc: [0, 0, 0, 0, 0, 0, 0],
      odo: 214806.4,
      visible: true,
    };

    const particles: Particle[] = [];
    const rain: { x: number; y: number; l: number; v: number }[] = [];

    function layout() {
      const rect = root.getBoundingClientRect();
      L.W = rect.width;
      L.H = rect.height;
      L.s = Math.max(L.W / SCENE.w, L.H / SCENE.h);
      L.offX = (L.W - SCENE.w * L.s) / 2;
      const offY = L.H - SCENE.h * L.s;
      L.groundY = offY + SCENE.roadY * L.s;
      const stopFor = (ts: number) => Math.min(L.W * 0.9, L.W / 2 + (FRONT * ts) / 2 + Math.min(140, L.W * 0.05));
      L.ts = Math.min(L.s * 1.02, (L.W * 0.94) / 830);
      // Keep the parked truck clear of the hero copy: shrink it if its roof would
      // run into the text while sitting underneath it.
      const avoid = avoidRef?.current;
      let copyBottom = 0;
      if (avoid) {
        copyBottom = avoid.offsetTop + avoid.offsetHeight;
        const copyRight = avoid.offsetLeft + avoid.offsetWidth;
        const rear = stopFor(L.ts) - FRONT * L.ts;
        if (rear < copyRight) {
          const room = (L.groundY - copyBottom - 14) / 192;
          L.ts = Math.max(0.3, Math.min(L.ts, room));
        }
      }
      L.pxPerM = UNITS_PER_M * L.ts;
      const stopPx = stopFor(L.ts);
      L.hudOk = L.W >= 1024 && L.groundY - 190 * L.ts - 200 > 70;
      L.targetM = stopPx / L.pxPerM;
      L.startM = (-120 * L.ts) / L.pxPerM;
      L.lampsX = LAMPS.map((x) => L.offX + (x + LAMP_SRC_X) * L.s);
      L.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(L.W * L.dpr);
      canvas.height = Math.round(L.H * L.dpr);
      canvas.style.width = `${L.W}px`;
      canvas.style.height = `${L.H}px`;
      wrap.style.width = `${VB.w * L.ts}px`;
      wrap.style.height = `${VB.h * L.ts}px`;

      if (st.phase === 'wait') st.x = L.startM;
      if (st.phase === 'parked' || st.phase === 'stopped') st.x = L.targetM;

      rain.length = 0;
      if (!reduce) {
        const n = Math.round(L.W / 9);
        for (let i = 0; i < n; i++) {
          rain.push({ x: Math.random() * L.W, y: Math.random() * L.H, l: 10 + Math.random() * 14, v: 700 + Math.random() * 400 });
        }
      }
    }

    // local truck units → screen px
    const originX = () => st.x * L.pxPerM - FRONT * L.ts;
    const originY = () => L.groundY - G * L.ts;

    function emit(kind: number, lx: number, ly: number, n: number, o: Partial<Particle> = {}) {
      const ox = originX();
      const oy = originY();
      for (let i = 0; i < n && particles.length < 700; i++) {
        particles.push({
          x: ox + lx * L.ts,
          y: oy + ly * L.ts,
          vx: 0,
          vy: 0,
          r: 3 * L.ts,
          grow: 30 * L.ts,
          life: 0,
          max: 2,
          a: 0.2,
          drag: 1.2,
          lift: 0,
          sprite: kind,
          ...o,
        });
      }
    }

    function exhaust(rate: number, dt: number, sooty: boolean) {
      st.emitAcc[0] += rate * dt;
      while (st.emitAcc[0] >= 1) {
        st.emitAcc[0] -= 1;
        const k = L.ts;
        emit(sooty ? 1 : 0, EXHAUST[0], EXHAUST[1], 1, {
          vx: (-30 - Math.random() * 30) * k,
          vy: (60 + Math.random() * 40) * k,
          r: (3 + Math.random() * 2) * k,
          grow: (sooty ? 46 : 30) * k,
          max: sooty ? 2.2 : 2.6,
          a: sooty ? 0.38 : 0.13,
          drag: 2.6,
          lift: -70 * k,
        });
      }
    }

    function airBrake() {
      for (const x of AIR_BRAKES) {
        for (let i = 0; i < 14; i++) {
          const ang = Math.random() * Math.PI * 2;
          const sp = (60 + Math.random() * 160) * L.ts;
          emit(3, x + (Math.random() - 0.5) * 20, WHEEL_CY + 6, 1, {
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp * 0.5 - 20 * L.ts,
            r: 4 * L.ts,
            grow: 70 * L.ts,
            max: 0.9 + Math.random() * 0.5,
            a: 0.16,
            drag: 4,
            lift: -10 * L.ts,
          });
        }
      }
    }

    departRef.current = () => {
      if (st.phase === 'exit') return;
      if (st.phase === 'wait') st.x = L.targetM;
      st.phase = 'exit';
      st.phaseT = 0;
      if (!reduce) {
        for (let i = 0; i < 18; i++) exhaust(1000, 0.001, true);
      }
    };

    function setGroupTransform(els: (SVGGElement | null)[], t: string) {
      for (const el of els) el?.setAttribute('transform', t);
    }

    function render() {
      const ox = originX();
      const oy = originY();
      wrap.style.transform = `translate3d(${ox + VB.x * L.ts}px, ${oy + VB.y * L.ts}px, 0)`;

      // wheels
      const deg = (st.wheelAng * 180) / Math.PI;
      const omega = st.v / WHEEL_R_M;
      const blur = Math.min(0.92, Math.max(0, (omega - 4) / 18));
      for (let i = 0; i < WHEELS.length; i++) {
        const w = refs.wheels[i];
        if (w) {
          w.setAttribute('transform', `rotate(${deg.toFixed(2)})`);
          w.setAttribute('opacity', (1 - blur * 0.95).toFixed(3));
        }
        refs.blurs[i]?.setAttribute('opacity', blur.toFixed(3));
      }

      // suspension
      const road = st.v > 0.05 ? Math.min(st.v / 10, 1) : 0;
      const d = st.dist;
      const bump = road * (Math.sin(d * 2.3) * 0.5 + Math.sin(d * 5.9 + 1.3) * 0.3 + Math.sin(d * 13.1) * 0.15);
      const idle = st.phase === 'stopped' || st.phase === 'parked' ? (reduce ? 0 : 1) : 0.4;
      const vib = idle * (Math.sin(st.t * 2 * Math.PI * 12.5) * 0.22 + Math.sin(st.t * 2 * Math.PI * 7.1) * 0.12);

      setGroupTransform(refs.chassis, `rotate(${st.ch.th.toFixed(4)} ${CHASSIS_PIVOT[0]} ${CHASSIS_PIVOT[1]}) translate(0 ${(bump * 0.35).toFixed(3)})`);
      setGroupTransform(refs.cab, `translate(0 ${(bump * 0.9 + vib).toFixed(3)}) rotate(${st.cab.th.toFixed(4)} ${CAB_PIVOT[0]} ${CAB_PIVOT[1]})`);
      refs.trailer?.setAttribute(
        'transform',
        `rotate(${st.tr.th.toFixed(4)} ${TRAILER_PIVOT[0]} ${TRAILER_PIVOT[1]}) translate(0 ${(bump * 0.25).toFixed(3)})`,
      );

      // brake lights
      const b = (0.3 + st.brake * 0.7).toFixed(3);
      for (const el of refs.brake) el?.setAttribute('opacity', b);

      // street-lamp light sweeping across the body
      for (let i = 0; i < L.lampsX.length; i++) {
        const lx = ((L.lampsX[i] - ox) / L.ts).toFixed(1);
        refs.lampTrailer[i]?.setAttribute('cx', lx);
        refs.lampCab[i]?.setAttribute('cx', lx);
      }

      // particles + rain
      ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
      ctx.clearRect(0, 0, L.W, L.H);
      for (const p of particles) {
        const k = p.life / p.max;
        const alpha = p.a * (k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88);
        if (alpha <= 0) continue;
        ctx.globalAlpha = alpha;
        const r = p.r;
        ctx.drawImage(sprites[p.sprite], p.x - r, p.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      if (rain.length) {
        ctx.strokeStyle = 'rgba(170,195,225,0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const r of rain) {
          ctx.moveTo(r.x, r.y);
          ctx.lineTo(r.x - r.l * 0.18, r.y + r.l);
        }
        ctx.stroke();
      }

      // HUD
      const hud = hudRef.current;
      if (hud) {
        const ax = ox + HUD_ANCHOR[0] * L.ts;
        const ay = oy + HUD_ANCHOR[1] * L.ts;
        hud.style.transform = `translate3d(${ax}px, ${ay}px, 0)`;
        const vis = L.hudOk && ax > L.W * 0.52 && ax < L.W + 40 ? 1 : 0;
        hud.style.opacity = String(vis);
      }
    }

    function updateHud(dt: number) {
      st.hudT += dt;
      if (st.hudT < 0.08) return;
      st.hudT = 0;
      const kmh = st.v * 3.6;
      if (hudSpeed.current) hudSpeed.current.textContent = kmh.toFixed(0);
      if (hudStatus.current) hudStatus.current.textContent = STATUS[st.phase];
      if (hudOdo.current) hudOdo.current.textContent = st.odo.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      if (hudRef.current) hudRef.current.dataset.phase = st.phase;
    }

    function step(dt: number) {
      st.t += dt;
      st.phaseT += dt;

      // ── longitudinal dynamics ──
      let aCmd = 0;
      if (st.phase === 'wait') {
        st.x = L.startM;
        if (st.phaseT > 0.35) {
          const dist = L.targetM - L.startM;
          st.v = Math.sqrt(2 * A_NOM * dist * 0.82);
          st.phase = 'cruise';
          st.phaseT = 0;
        }
      } else if (st.phase === 'cruise') {
        const rem = L.targetM - st.x;
        if ((st.v * st.v) / (2 * Math.max(rem, 0.01)) >= A_NOM * 0.96) {
          st.phase = 'brake';
          st.phaseT = 0;
        }
      }
      if (st.phase === 'brake') {
        const rem = L.targetM - st.x;
        if (rem <= 0.004 || st.v <= 0.04) {
          st.v = 0;
          st.a = 0;
          st.x = Math.min(st.x, L.targetM);
          st.phase = 'stopped';
          st.phaseT = 0;
        } else {
          aCmd = -(st.v * st.v) / (2 * rem);
        }
      } else if (st.phase === 'stopped') {
        if (st.phaseT > 1.1) {
          st.phase = 'parked';
          st.phaseT = 0;
          airBrake();
        }
      } else if (st.phase === 'exit') {
        aCmd = A_EXIT;
      }

      if (st.phase === 'cruise' || st.phase === 'brake' || st.phase === 'exit') {
        const J = 7;
        st.a += Math.max(-J * dt, Math.min(J * dt, aCmd - st.a));
        st.v = Math.max(0, st.v + st.a * dt);
        st.x += st.v * dt;
        st.dist += st.v * dt;
        st.odo += (st.v * dt) / 1000;
        st.wheelAng += (st.v * dt) / WHEEL_R_M;
      } else {
        st.a = 0;
      }

      // ── suspension (degrees; +ve = nose down) ──
      const accel = st.a;
      for (let i = 0; i < 2; i++) {
        const h = dt / 2;
        stepSpring(st.cab, -accel * 0.62, 1.25, 0.2, h);
        stepSpring(st.ch, -accel * 0.16, 1.7, 0.42, h);
        stepSpring(st.tr, -accel * 0.07, 1.15, 0.35, h);
      }

      // ── lights ──
      const brakeTarget = st.phase === 'brake' || st.phase === 'stopped' ? 1 : 0;
      st.brake += (brakeTarget - st.brake) * Math.min(1, dt * 18);

      // ── particles ──
      if (!reduce) {
        if (st.phase === 'exit') exhaust(st.phaseT < 0.6 ? 60 : 28, dt, st.phaseT < 0.5);
        else if (st.phase === 'cruise') exhaust(10, dt, false);
        else if (st.phase === 'brake') exhaust(4, dt, false);
        else if (st.phase === 'stopped' || st.phase === 'parked') exhaust(6, dt, false);

        if (st.v > 1.2) {
          const vpx = st.v * L.pxPerM;
          for (let i = 0; i < WHEELS.length; i++) {
            st.emitAcc[i + 1] += st.v * 2.2 * dt;
            while (st.emitAcc[i + 1] >= 1) {
              st.emitAcc[i + 1] -= 1;
              emit(2, WHEELS[i] - 20, G - 3, 1, {
                vx: -vpx * (0.05 + Math.random() * 0.12),
                vy: (-30 - Math.random() * 70) * L.ts,
                r: (2 + Math.random() * 3) * L.ts,
                grow: 26 * L.ts,
                max: 0.5 + Math.random() * 0.4,
                a: 0.14,
                drag: 2.4,
                lift: 140 * L.ts,
              });
            }
          }
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.max) {
          particles.splice(i, 1);
          continue;
        }
        const dr = Math.exp(-p.drag * dt);
        p.vx = p.vx * dr - 9 * L.s * dt; // light breeze
        p.vy = p.vy * dr + p.lift * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.r += p.grow * dt * (1 - p.life / p.max);
        if (p.y > L.groundY + 6 * L.ts && p.vy > 0) p.vy *= -0.2;
      }

      for (const r of rain) {
        r.y += r.v * dt;
        r.x -= r.v * 0.18 * dt;
        if (r.y > L.H) {
          r.y = -r.l - Math.random() * 40;
          r.x = Math.random() * (L.W + 80);
        }
      }

      updateHud(dt);
    }

    layout();
    if (reduce) st.x = L.targetM;
    else st.x = L.startM;
    render();

    const ro = new ResizeObserver(() => {
      layout();
      render();
    });
    ro.observe(root);
    if (avoidRef?.current) ro.observe(avoidRef.current);

    const io = new IntersectionObserver(([e]) => {
      st.visible = e.isIntersecting;
    });
    io.observe(root);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      if (st.visible) {
        step(dt);
        render();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [refs, avoidRef]);

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden" style={{ background: '#03060c' }}>
      <SceneBackdrop />
      <div
        ref={truckWrapRef}
        className="absolute left-0 top-0 will-change-transform"
        style={{ transform: 'translate3d(-200vw,0,0)' }}
      >
        <Truck refs={refs} />
      </div>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Live telemetry HUD that rides along with the cab */}
      <div
        ref={hudRef}
        className="absolute left-0 top-0 hidden md:block pointer-events-none transition-opacity duration-500"
        style={{ opacity: 0 }}
      >
        <div className="absolute left-0 bottom-0 w-px h-10" style={{ background: 'linear-gradient(to top, rgba(0,240,255,0.9), rgba(0,240,255,0.1))' }} />
        <div className="absolute -left-[3px] -bottom-[3px] w-[7px] h-[7px] rounded-full" style={{ background: '#00f0ff', boxShadow: '0 0 10px #00f0ff' }} />
        <div
          className="absolute bottom-10 right-[-18px] w-[236px] rounded-xl px-4 py-3 text-[11px]"
          style={{
            background: 'rgba(6,12,22,0.72)',
            border: '1px solid rgba(0,240,255,0.25)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 24px rgba(0,240,255,0.08)',
            backdropFilter: 'blur(10px)',
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          }}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="whitespace-nowrap">FM-204 · LIVE</span>
            </span>
            <span ref={hudStatus} className="text-cyan-300 uppercase tracking-wider whitespace-nowrap">
              Inbound
            </span>
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span ref={hudSpeed} className="text-[34px] leading-none font-medium text-white tabular-nums">
              0
            </span>
            <span className="text-slate-400 pb-1">km/h</span>
            <span className="ml-auto text-right pb-0.5 text-slate-500">
              <span className="block">GPS</span>
              <span className="text-slate-300">51.507, -0.128</span>
            </span>
          </div>
          <div className="mt-2 text-slate-500">
            ODO <span ref={hudOdo} className="text-slate-300 tabular-nums">214,806.4</span> km
          </div>
          <div className="mt-2 pt-2 border-t border-white/5 grid grid-cols-3 gap-x-2 text-slate-500">
            <span>
              FUEL <span className="text-emerald-300">72%</span>
            </span>
            <span>
              ENGINE <span className="text-slate-300">88°C</span>
            </span>
            <span>
              HRS <span className="text-slate-300">9,412</span>
            </span>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
});
