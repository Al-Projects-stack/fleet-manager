import { lazy, Suspense, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { TruckScene, type TruckSceneHandle } from '../components/landing/TruckScene';
import type { Hero3DHandle } from '../components/landing3d/Hero3D';

const Hero3D = lazy(() => import('../components/landing3d/Hero3D'));

function canUseWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2'));
  } catch {
    return false;
  }
}

/** Shown while the 3D chunk loads: same copy over a dark night gradient. */
function StaticHero({ nav, intro }: { nav: ReactNode; intro: ReactNode }) {
  return (
    <section className="relative h-[100svh]" style={{ background: 'linear-gradient(180deg, #02040a, #0b1a2e 62%, #05080d)' }}>
      <div className="relative z-10">{nav}</div>
      {intro}
    </section>
  );
}

const DISPLAY = { fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif" };
const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" };

// Mirrors backend/src/services/alert.service.ts
const RULES = [
  { check: 'Fuel level', alert: '15%', worse: '5%', sev: 'critical' },
  { check: 'Engine temperature', alert: '105°C', worse: '115°C', sev: 'critical' },
  { check: 'Distance to next service', alert: '500 km', worse: '200 km, overdue', sev: 'high, critical' },
  { check: 'Fuel used vs. its last 10 readings', alert: '+2.5σ', worse: '+4σ', sev: 'high' },
] as const;

const PAYLOAD = `POST /api/v1/telemetry/ingest

{
  "vehicleId": "665f1c2e8a4b3d0012ab34cd",
  "odometerKm": 214806,
  "fuelLevelPercent": 72,
  "fuelConsumedLiters": 31.4,
  "engineTempCelsius": 88,
  "engineHours": 9412,
  "speedKmh": 84,
  "latitude": 51.507,
  "longitude": -0.128
}`;

const PHOTOS = [
  { img: '/trucks/volvo.jpg', alt: 'Volvo truck' },
  { img: '/trucks/mercedes.jpg', alt: 'Mercedes-Benz truck' },
  { img: '/trucks/man.jpg', alt: 'MAN truck' },
] as const;

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const sceneRef = useRef<TruckSceneHandle>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const hero3dRef = useRef<Hero3DHandle>(null);
  const [use3D] = useState(canUseWebGL);
  const [leaving, setLeaving] = useState(false);

  const goTo = async (path: string) => {
    if (leaving) return;
    setLeaving(true);
    const scene = use3D ? hero3dRef.current : sceneRef.current;
    const heroVisible = use3D ? window.scrollY < window.innerHeight * 0.4 : window.scrollY < window.innerHeight * 0.5;
    if (heroVisible && scene) await scene.depart();
    navigate(path);
  };

  const navEl = (
      <nav className="relative z-10 flex items-center justify-between px-5 sm:px-10 py-5">
        <span className="text-lg font-bold tracking-tight" style={DISPLAY}>
          Fleet<span style={{ color: '#00f0ff', textShadow: '0 0 12px rgba(0,240,255,0.6)' }}>Manager</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void goTo('/login')}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5"
          >
            Log in
          </button>
          <button
            onClick={() => void goTo('/login?tab=register')}
            className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            style={{ background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.35)', color: '#7ff7ff' }}
          >
            Sign up
          </button>
        </div>
      </nav>
  );

  const introEl = (
      <div ref={copyRef} className="relative z-10 w-fit px-5 sm:px-10 pt-[6vh] md:pt-[9vh] max-w-3xl">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-300/90 mb-5"
          style={MONO}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
          Fleet intelligence, live
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="text-[clamp(2.4rem,6vw,4.75rem)] font-bold leading-[1.02] tracking-tight"
          style={DISPLAY}
        >
          Every truck.
          <br />
          Every kilometre.
          <br />
          <span style={{ color: '#7ff7ff', textShadow: '0 0 40px rgba(0,240,255,0.35)' }}>In real time.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-5 text-slate-300/90 text-base sm:text-lg max-w-md leading-relaxed"
        >
          Live telematics, maintenance you see coming, and fuel anomalies flagged the moment they happen.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          <button
            onClick={() => void goTo('/login?tab=register')}
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#021015] transition-transform hover:-translate-y-0.5 active:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #7ff7ff, #00c8ff)', boxShadow: '0 8px 30px rgba(0,200,255,0.3)' }}
          >
            Get started free
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            onClick={() => void goTo('/login')}
            className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-colors hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(6px)' }}
          >
            Log in
          </button>
        </motion.div>
      </div>
  );

  const finaleEl = (
    <div
      className="rounded-2xl p-6"
      style={{ background: 'rgba(5,10,18,0.62)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(14px)' }}
    >
      <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300/90 mb-2" style={MONO}>
        03 · Act
      </p>
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight" style={DISPLAY}>
        Fix it before it fails.
      </h2>
      <p className="mt-2 text-sm md:text-base text-slate-300/90 leading-relaxed">
        Alerts become work orders, technicians log the fix, and the truck is back on the road.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          onClick={() => void goTo('/login?tab=register')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-[#021015]"
          style={{ background: 'linear-gradient(135deg, #7ff7ff, #00c8ff)', boxShadow: '0 8px 30px rgba(0,200,255,0.25)' }}
        >
          Get started free <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => void goTo('/login')}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)' }}
        >
          Log in
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen overflow-x-clip text-white" style={{ background: '#03060c' }}>
      {/* ── Hero ── */}
      {use3D ? (
        <Suspense fallback={<StaticHero nav={navEl} intro={introEl} />}>
          <Hero3D ref={hero3dRef} nav={navEl} intro={introEl} finale={finaleEl} />
        </Suspense>
      ) : (
        <section className="relative h-[100svh] min-h-[620px] max-h-[1100px]">
          <TruckScene ref={sceneRef} avoidRef={copyRef} />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(3,6,12,0.75) 0%, rgba(3,6,12,0.25) 38%, rgba(3,6,12,0) 60%)' }}
          />
          <div className="relative z-10">{navEl}</div>
          {introEl}
          <div
            className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(3,6,12,0), #03060c)' }}
          />
        </section>
      )}

      {/* ── Alert rules ── */}
      <section className="px-5 sm:px-10 pt-24 pb-20 max-w-6xl mx-auto grid gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16">
        <motion.div {...fadeUp}>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight" style={DISPLAY}>
            Four checks run on every reading.
          </h2>
          <p className="mt-5 text-slate-400 leading-relaxed">
            Each time a truck reports in, Fleet Manager looks at its fuel level, engine temperature, how far it is from
            its next service, and how much fuel it used compared with its last ten readings.
          </p>
          <p className="mt-4 text-slate-400 leading-relaxed">
            If a check fails you get an alert. If that truck already has an open alert of the same kind, you won&apos;t
            get another one until the first is resolved.
          </p>
        </motion.div>

        <motion.div {...fadeUp} className="self-start overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-[13px] sm:text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-white/10" style={{ background: '#070d16' }}>
                <th className="font-medium px-3 sm:px-4 py-3">Check</th>
                <th className="font-medium px-3 sm:px-4 py-3">Alert at</th>
                <th className="font-medium px-3 sm:px-4 py-3">Escalates at</th>
              </tr>
            </thead>
            <tbody>
              {RULES.map((r) => (
                <tr key={r.check} className="border-b border-white/5 last:border-0 align-top">
                  <td className="px-3 sm:px-4 py-3.5 text-slate-200">{r.check}</td>
                  <td className="px-3 sm:px-4 py-3.5 text-slate-300 whitespace-nowrap" style={MONO}>
                    {r.alert}
                  </td>
                  <td className="px-3 sm:px-4 py-3.5 text-slate-300">
                    <span style={MONO}>
                      {r.worse}
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">{r.sev}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </section>

      {/* ── Photos ── */}
      <section className="px-5 sm:px-10 max-w-6xl mx-auto grid grid-cols-3 gap-2 sm:gap-3">
        {PHOTOS.map((t) => (
          <img
            key={t.img}
            src={t.img}
            alt={t.alt}
            loading="lazy"
            className="w-full aspect-[4/3] object-cover rounded-lg"
            style={{ filter: 'saturate(0.85) brightness(0.85)' }}
          />
        ))}
      </section>

      {/* ── Work orders ── */}
      <section className="px-5 sm:px-10 py-24 max-w-6xl mx-auto grid gap-10 md:grid-cols-2 md:gap-16 items-start">
        <motion.div {...fadeUp} className="md:order-2">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight" style={DISPLAY}>
            Then someone fixes it.
          </h2>
          <p className="mt-5 text-slate-400 leading-relaxed">
            Open a work order for the truck: preventive, corrective or an inspection, with a priority from low to urgent.
            Whoever picks it up adds notes and the parts they used as they go.
          </p>
          <p className="mt-4 text-slate-400 leading-relaxed">
            Estimated and actual cost sit side by side, so you can see what each repair really came to.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp}
          className="md:order-1 rounded-xl border border-white/10 text-sm"
          style={{ background: '#070d16' }}
          aria-label="Example work order"
        >
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
            <p className="font-semibold text-slate-100">Engine running hot</p>
            <div className="flex gap-1.5 text-xs">
              <span className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-300">High</span>
              <span className="px-2 py-0.5 rounded bg-sky-400/10 text-sky-300">In progress</span>
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 px-5 py-4 border-b border-white/10 text-slate-400">
            <dt>Vehicle</dt>
            <dd className="text-slate-200">TRK-07</dd>
            <dt>Type</dt>
            <dd className="text-slate-200">Corrective</dd>
            <dt>Alert</dt>
            <dd className="text-slate-200">TRK-07 engine temperature at 109°C</dd>
            <dt>Parts</dt>
            <dd className="text-slate-200">Thermostat, housing gasket</dd>
          </dl>
          <div className="px-5 py-4 border-b border-white/10 space-y-3">
            <div>
              <p className="text-xs text-slate-500">Technician, 09:12</p>
              <p className="text-slate-300 mt-0.5">Thermostat sticking shut. Ordered a replacement.</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Technician, 14:40</p>
              <p className="text-slate-300 mt-0.5">Fitted and test driven, holding at 88°C.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 px-5 py-4" style={MONO}>
            <div>
              <p className="text-xs text-slate-500">Estimated</p>
              <p className="text-slate-200 mt-0.5">2,400.00</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Actual</p>
              <p className="text-slate-200 mt-0.5">2,150.00</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Getting data in ── */}
      <section className="px-5 sm:px-10 pb-24 max-w-6xl mx-auto grid gap-10 md:grid-cols-2 md:gap-16 items-start">
        <motion.div {...fadeUp}>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight" style={DISPLAY}>
            Getting data in
          </h2>
          <p className="mt-5 text-slate-400 leading-relaxed">
            Point your tracker at the ingest endpoint and send each reading as JSON, or upload a CSV export if that&apos;s
            what you have. Readings are kept for 90 days.
          </p>
          <p className="mt-4 text-slate-400 leading-relaxed">
            Admins and managers can send data. Technicians add notes to the jobs they work on, and read-only accounts can
            look around without changing anything.
          </p>
        </motion.div>
        <motion.pre
          {...fadeUp}
          className="overflow-x-auto rounded-xl border border-white/10 p-5 text-[12.5px] leading-relaxed text-slate-300"
          style={{ ...MONO, background: '#070d16' }}
        >
          {PAYLOAD}
        </motion.pre>
      </section>

      {/* ── Sign up ── */}
      <section className="border-t border-white/5">
        <div className="px-5 sm:px-10 py-16 max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={DISPLAY}>
              Try it on your own trucks.
            </h2>
            <p className="text-slate-400 mt-2">Make an account, add a vehicle, and send it its first reading.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void goTo('/login?tab=register')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#021015] transition-transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #7ff7ff, #00c8ff)' }}
            >
              Sign up <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => void goTo('/login')}
              className="px-6 py-3 rounded-xl text-sm font-semibold transition-colors hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)' }}
            >
              Log in
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 px-5 sm:px-10 py-8 flex flex-wrap justify-between gap-2 text-xs text-slate-600">
        <span style={DISPLAY}>Fleet Manager</span>
        <span>Built with React, Node.js and MongoDB</span>
      </footer>

      {/* fade-out while navigating */}
      <motion.div
        className="fixed inset-0 z-50 pointer-events-none"
        style={{ background: '#03060c' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: leaving ? 1 : 0 }}
        transition={{ duration: 0.45, delay: leaving ? 0.7 : 0 }}
      />
    </div>
  );
}
