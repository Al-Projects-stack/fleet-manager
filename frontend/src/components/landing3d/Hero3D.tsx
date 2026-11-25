import { forwardRef, useEffect, useImperativeHandle, useRef, type ReactNode } from 'react';
import { createEngine, type Engine, type FrameInfo } from './engine';

export interface Hero3DHandle {
  depart: () => Promise<void>;
}

interface Props {
  nav: ReactNode;
  intro: ReactNode;
  finale: ReactNode;
}

const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" };
const DISPLAY = { fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif" };

// Same order as rig.sensors in buildTruck.ts
const SENSORS = [
  { label: 'GPS position', value: 'Live' },
  { label: 'Engine temp', value: '88°C' },
  { label: 'Fuel level', value: '72%' },
  { label: 'Odometer', value: '214,806 km' },
  { label: 'Engine hours', value: '9,412 h' },
  { label: 'Service due in', value: '420 km' },
];

const STAGES = [
  {
    at: 1 / 3,
    eyebrow: '01 · Live telematics',
    title: 'Know where every truck is, and how it’s doing.',
    body: 'Speed, location, engine and fuel data stream in as they happen, from every vehicle in the fleet.',
  },
  {
    at: 2 / 3,
    eyebrow: '02 · Sensors',
    title: 'Every reading on one screen.',
    body: 'GPS position, fuel level, engine temperature, odometer and engine hours, with an alert the moment a reading crosses its limit.',
  },
];

const sm = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const bump = (p: number, c: number, w: number) => sm(c - w, c - w * 0.35, p) * (1 - sm(c + w * 0.35, c + w, p));

export const Hero3D = forwardRef<Hero3DHandle, Props>(function Hero3D({ nav, intro, finale }, ref) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const finaleRef = useRef<HTMLDivElement>(null);
  const stageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lineRefs = useRef<(SVGPolylineElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hudRef = useRef<HTMLDivElement>(null);
  const hud = {
    speed: useRef<HTMLSpanElement>(null),
    odo: useRef<HTMLSpanElement>(null),
    status: useRef<HTMLSpanElement>(null),
  };

  useImperativeHandle(ref, () => ({
    depart: () =>
      new Promise<void>((resolve) => {
        engineRef.current?.depart();
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.setTimeout(resolve, reduce ? 0 : 1150);
      }),
  }));

  useEffect(() => {
    const canvas = canvasRef.current!;
    const section = sectionRef.current!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const quality = coarse || window.innerWidth < 900 ? 'low' : 'high';

    const onFrame = (f: FrameInfo) => {
      const p = f.p;
      const set = (el: HTMLElement | null, o: number, extra = '') => {
        if (!el) return;
        el.style.opacity = o.toFixed(3);
        el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
        if (extra) el.style.transform = extra;
      };
      const io = 1 - sm(0.015, 0.09, p);
      set(introRef.current, io, `translate3d(0, ${(-40 * (1 - io)).toFixed(1)}px, 0)`);
      set(hintRef.current, 1 - sm(0.005, 0.03, p));
      STAGES.forEach((s, i) => {
        const o = bump(p, s.at, 0.13);
        set(stageRefs.current[i], o, `translate3d(0, ${(24 * (1 - o)).toFixed(1)}px, 0)`);
      });
      const fo = sm(0.9, 0.975, p);
      set(finaleRef.current, fo, `translate3d(0, ${(24 * (1 - fo)).toFixed(1)}px, 0)`);

      // Sensor read-outs: dots stay on the truck, labels line up in one column to
      // the right, ordered top to bottom by their dot so leader lines never cross.
      const so = bump(p, 2 / 3, 0.11);
      const CW = canvas.clientWidth;
      const CH = canvas.clientHeight;
      const narrow = CW < 640;
      const cardW = narrow ? 128 : 168;
      const rowH = narrow ? 44 : 50;
      const colX = CW - (narrow ? 12 : Math.max(28, CW * 0.05)) - cardW;
      const order = f.sensors
        .map((s, i) => ({ ...s, i }))
        .filter((s) => s.on)
        .sort((a, b) => a.y - b.y);
      const total = order.length * rowH;
      const meanY = order.reduce((acc, s) => acc + s.y, 0) / Math.max(1, order.length);
      const card = stageRefs.current[1];
      const minTop = narrow && card ? card.offsetTop + card.offsetHeight + 16 : 92;
      const maxTop = narrow ? CH - 16 - total : Math.min(CH - 16 - total, CH * 0.62 - total / 2);
      const top = Math.max(minTop, Math.min(maxTop, meanY - total / 2));
      const row = new Map(order.map((s, k) => [s.i, k]));
      f.sensors.forEach((s, i) => {
        const k = row.get(i);
        const dot = dotRefs.current[i];
        const line = lineRefs.current[i];
        const cardEl = cardRefs.current[i];
        // stagger: each row arrives a beat after the one above
        const o = k === undefined ? 0 : Math.min(1, Math.max(0, so * 1.5 - k * 0.08));
        if (dot) {
          dot.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`;
          set(dot, o);
        }
        const ry = top + (k ?? 0) * rowH + rowH / 2 - 4;
        if (cardEl) {
          cardEl.style.width = `${cardW}px`;
          set(cardEl, o, `translate3d(${(colX + 12 * (1 - o)).toFixed(1)}px, ${(ry - 19).toFixed(1)}px, 0)`);
        }
        if (line) {
          const elbow = Math.max(s.x, colX - 36);
          line.setAttribute('points', `${s.x.toFixed(1)},${s.y.toFixed(1)} ${elbow.toFixed(1)},${ry.toFixed(1)} ${colX.toFixed(1)},${ry.toFixed(1)}`);
          line.style.opacity = (o * 0.7).toFixed(3);
        }
      });

      const W = canvas.clientWidth;
      const h = hudRef.current;
      if (h) {
        h.style.transform = `translate3d(${f.hud.x.toFixed(1)}px, ${f.hud.y.toFixed(1)}px, 0)`;
        const show = W >= 1024 && f.hud.on && f.hud.y > 230 && f.hud.x > W * 0.5 && f.hud.x < W - 60;
        set(h, show ? 1 - sm(0.01, 0.05, p) : 0);
      }
      if (hud.speed.current) hud.speed.current.textContent = f.kmh.toFixed(0);
      if (hud.status.current) hud.status.current.textContent = f.phase;
      if (hud.odo.current)
        hud.odo.current.textContent = f.odo.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    };

    let engine: Engine;
    try {
      engine = createEngine(canvas, { reduced, quality, onFrame });
    } catch {
      return;
    }
    engineRef.current = engine;

    const intro = introRef.current;
    const measure = () => {
      if (intro) engine.setClearance(intro.offsetTop + intro.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (intro) ro.observe(intro);
    ro.observe(canvas);

    const onScroll = () => {
      const r = section.getBoundingClientRect();
      const range = r.height - window.innerHeight;
      engine.setProgress(range > 0 ? -r.top / range : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    const io = new IntersectionObserver(([e]) => engine.setActive(e.isIntersecting));
    io.observe(section);
    const onVis = () => engine.setActive(!document.hidden);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('visibilitychange', onVis);
      io.disconnect();
      ro.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section ref={sectionRef} className="relative" style={{ height: '420vh' }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden" style={{ background: '#03060c' }}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(3,6,12,0.7) 0%, rgba(3,6,12,0.15) 34%, rgba(3,6,12,0) 55%)' }}
        />

        <div className="relative z-20">{nav}</div>

        <div ref={introRef} className="relative z-10 will-change-transform">
          {intro}
        </div>

        {/* Stage cards */}
        {STAGES.map((s, i) => (
          <div
            key={s.eyebrow}
            ref={(el) => {
              stageRefs.current[i] = el;
            }}
            className="absolute z-10 left-5 right-5 sm:left-10 sm:right-auto top-24 sm:top-auto sm:bottom-14 max-w-md"
            style={{ opacity: 0, visibility: 'hidden' }}
          >
            <div
              className="rounded-2xl p-6"
              style={{ background: 'rgba(5,10,18,0.62)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(14px)' }}
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300/90 mb-2" style={MONO}>
                {s.eyebrow}
              </p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight" style={DISPLAY}>
                {s.title}
              </h2>
              <p className="mt-2 text-sm md:text-base text-slate-300/90 leading-relaxed">{s.body}</p>
            </div>
          </div>
        ))}

        <div
          ref={finaleRef}
          className="absolute z-10 left-5 right-5 sm:left-10 sm:right-auto top-24 sm:top-auto sm:bottom-14 max-w-lg"
          style={{ opacity: 0, visibility: 'hidden' }}
        >
          {finale}
        </div>

        {/* Sensor read-outs: leader lines, dots on the truck, one tidy column of values */}
        <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" aria-hidden>
          {SENSORS.map((s, i) => (
            <polyline
              key={s.label}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              fill="none"
              stroke="rgba(0,240,255,0.85)"
              strokeWidth="1"
              style={{ opacity: 0 }}
            />
          ))}
        </svg>
        {SENSORS.map((s, i) => (
          <div
            key={`dot-${s.label}`}
            ref={(el) => {
              dotRefs.current[i] = el;
            }}
            className="absolute left-0 top-0 z-10 pointer-events-none"
            style={{ opacity: 0, visibility: 'hidden' }}
          >
            <span
              className="absolute -left-[4px] -top-[4px] w-2 h-2 rounded-full"
              style={{ background: '#00f0ff', boxShadow: '0 0 0 3px rgba(0,240,255,0.18), 0 0 10px #00f0ff' }}
            />
          </div>
        ))}
        {SENSORS.map((s, i) => (
          <div
            key={`card-${s.label}`}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className="absolute left-0 top-0 z-10 pointer-events-none rounded-md px-2.5 py-1.5"
            style={{
              opacity: 0,
              visibility: 'hidden',
              background: 'rgba(5,10,18,0.78)',
              borderLeft: '2px solid rgba(0,240,255,0.8)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400 leading-none" style={MONO}>
              {s.label}
            </p>
            <p className="mt-1 text-[13px] sm:text-sm text-cyan-200 leading-none" style={MONO}>
              {s.value}
            </p>
          </div>
        ))}

        {/* Live telemetry HUD riding above the cab */}
        <div ref={hudRef} className="absolute left-0 top-0 z-10 pointer-events-none" style={{ opacity: 0, visibility: 'hidden' }}>
          <div className="absolute left-0 bottom-0 w-px h-10" style={{ background: 'linear-gradient(to top, rgba(0,240,255,0.9), rgba(0,240,255,0.1))' }} />
          <div className="absolute -left-[3px] -bottom-[3px] w-[7px] h-[7px] rounded-full" style={{ background: '#00f0ff', boxShadow: '0 0 10px #00f0ff' }} />
          <div
            className="absolute bottom-10 right-[-18px] w-[240px] rounded-xl px-4 py-3 text-[11px]"
            style={{
              ...MONO,
              background: 'rgba(6,12,22,0.72)',
              border: '1px solid rgba(0,240,255,0.25)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                FM-204 · LIVE
              </span>
              <span ref={hud.status} className="text-cyan-300 uppercase tracking-wider whitespace-nowrap">
                Inbound
              </span>
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span ref={hud.speed} className="text-[34px] leading-none font-medium text-white tabular-nums">
                0
              </span>
              <span className="text-slate-400 pb-1">km/h</span>
              <span className="ml-auto text-right pb-0.5 text-slate-500">
                <span className="block">GPS</span>
                <span className="text-slate-300">51.507, -0.128</span>
              </span>
            </div>
            <div className="mt-2 text-slate-500">
              ODO <span ref={hud.odo} className="text-slate-300 tabular-nums">214,806.4</span> km
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

        {/* scroll hint */}
        <div ref={hintRef} className="absolute z-10 bottom-3 right-6 flex flex-col items-center gap-2 text-slate-400 pointer-events-none">
          <span className="text-[10px] uppercase tracking-[0.3em]" style={MONO}>
            Scroll
          </span>
          <span className="relative block w-px h-8 overflow-hidden bg-white/10">
            <span className="absolute left-0 top-0 w-px h-3 bg-cyan-300 animate-[fm-scrollhint_1.6s_ease-in-out_infinite]" />
          </span>
        </div>
      </div>
    </section>
  );
});

export default Hero3D;
