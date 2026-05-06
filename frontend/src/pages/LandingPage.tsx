import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useAnimation } from 'framer-motion';
import { Zap, Wrench, Bell, ClipboardList } from 'lucide-react';

const FEATURES = [
  {
    icon: Zap,
    color: '#00f0ff',
    title: 'Fuel Optimization',
    desc: 'AI-powered anomaly detection flags unusual consumption instantly. Statistical z-score analysis catches spikes before they drain your budget.',
  },
  {
    icon: Wrench,
    color: '#a855f7',
    title: 'Predictive Maintenance',
    desc: 'Threshold-based alerts fire before breakdowns happen. Odometer and engine-hour tracking keeps every vehicle road-ready.',
  },
  {
    icon: Bell,
    color: '#f59e0b',
    title: 'Real-Time Alerts',
    desc: 'Low fuel, high engine temp, overdue maintenance — every critical event surfaces instantly with severity-ranked notifications.',
  },
  {
    icon: ClipboardList,
    color: '#00ff88',
    title: 'Work Order Workflow',
    desc: 'Create, assign, and track maintenance jobs end-to-end. Full status lifecycle with cost tracking and technician notes.',
  },
] as const;

const TRUCKS = [
  {
    img: '/trucks/volvo.jpg',
    label: 'Real-Time Tracking',
    sub: 'Live GPS · Speed · Engine data',
    color: '#00f0ff',
    stat: 'Always connected',
  },
  {
    img: '/trucks/mercedes.jpg',
    label: 'Fuel Monitoring',
    sub: 'Anomaly detection · Cost per km',
    color: '#a855f7',
    stat: 'Cut costs by 20%',
  },
  {
    img: '/trucks/man.jpg',
    label: 'Maintenance Alerts',
    sub: 'Preventive · Predictive · On-time',
    color: '#00ff88',
    stat: 'Zero missed services',
  },
] as const;

export default function LandingPage() {
  const navigate = useNavigate();
  const truckControls = useAnimation();

  // Start idle float on mount
  useEffect(() => {
    void truckControls.start({
      y: [0, -8, 0],
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
    });
  }, [truckControls]);

  // Login → flip right, drive right
  // Sign Up → stay facing left, drive left
  const goTo = async (path: string, dir: 'left' | 'right') => {
    truckControls.stop();
    if (dir === 'right') {
      await truckControls.start({
        scaleX: -1, y: 0,
        transition: { duration: 0.2, ease: 'easeInOut' },
      });
      await truckControls.start({
        x: '120vw',
        transition: { duration: 0.6, ease: [0.4, 0, 1, 1] },
      });
    } else {
      await truckControls.start({
        x: '-120vw', y: 0,
        transition: { duration: 0.6, ease: [0.4, 0, 1, 1] },
      });
    }
    navigate(path);
  };

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: 'linear-gradient(135deg, #050510 0%, #080e1e 50%, #05050f 100%)' }}
    >
      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <span className="text-xl font-bold text-white tracking-tight">
          Fleet<span style={{ color: '#00f0ff', textShadow: '0 0 12px #00f0ff' }}>Manager</span>
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void goTo('/login', 'left')}
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5"
          >
            Login
          </button>
          <button
            onClick={() => void goTo('/login?tab=register', 'right')}
            className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:scale-105"
            style={{
              background: 'rgba(0,240,255,0.12)',
              border: '1px solid rgba(0,240,255,0.4)',
              color: '#00f0ff',
              boxShadow: '0 0 12px rgba(0,240,255,0.15)',
            }}
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex flex-col items-center text-center px-6 pt-20 pb-10">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8"
          style={{
            background: 'rgba(0,240,255,0.08)',
            border: '1px solid rgba(0,240,255,0.25)',
            color: '#00f0ff',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          AI-Powered Fleet Intelligence
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-5xl md:text-7xl font-black text-white leading-none mb-6 max-w-4xl"
        >
          The Future of{' '}
          <span
            className="block"
            style={{
              color: '#00f0ff',
              textShadow: '0 0 30px rgba(0,240,255,0.5), 0 0 60px rgba(0,240,255,0.2)',
            }}
          >
            Fleet Management
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-slate-400 text-lg max-w-xl mb-12 leading-relaxed"
        >
          Real-time telematics, predictive maintenance, and fuel optimization — built for modern fleets.
        </motion.p>

        {/* Animated truck — idle float, then flip + drive right on click */}
        <motion.div
          className="mb-12 select-none"
          animate={truckControls}
          style={{
            fontSize: '7rem',
            lineHeight: 1,
            filter: 'drop-shadow(0 0 30px rgba(0,240,255,0.45)) drop-shadow(0 0 60px rgba(0,240,255,0.2))',
          }}
        >
          🚛
        </motion.div>

        {/* CTA: Login + Sign Up */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-4"
        >
          <button
            onClick={() => void goTo('/login', 'left')}
            className="px-8 py-3.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'white',
            }}
          >
            Login
          </button>
          <button
            onClick={() => void goTo('/login?tab=register', 'right')}
            className="px-8 py-3.5 rounded-xl text-sm font-bold text-black transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #00f0ff, #0088ff)',
              boxShadow: '0 0 30px rgba(0,240,255,0.35)',
            }}
          >
            Sign Up
          </button>
        </motion.div>
      </section>

      {/* ── Divider ── */}
      <div
        className="h-px mx-8 my-16"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,240,255,0.3), transparent)' }}
      />

      {/* ── Fleet showcase ── */}
      <section className="px-6 pb-20 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Built for every fleet
          </h2>
          <p className="text-slate-500">From long-haul to heavy duty — full control across your entire operation.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TRUCKS.map(({ img, label, sub, color, stat }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="rounded-2xl p-6 flex flex-col gap-4"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${color}22`,
                boxShadow: `0 0 40px ${color}06`,
              }}
            >
              {/* Truck photo */}
              <div
                className="w-full rounded-xl overflow-hidden"
                style={{ border: `1px solid ${color}30`, boxShadow: `0 0 24px ${color}20`, height: 160 }}
              >
                <img
                  src={img}
                  alt={label}
                  className="w-full h-full object-cover"
                  style={{ filter: 'brightness(0.85) saturate(1.1)' }}
                />
              </div>

              {/* Text */}
              <div>
                <p className="font-bold text-white text-base">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
              </div>

              {/* Stat pill */}
              <div
                className="self-start px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
              >
                {stat}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Divider ── */}
      <div
        className="h-px mx-8 mb-20"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.3), transparent)' }}
      />

      {/* ── Features ── */}
      <section className="px-6 pb-28 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Everything your fleet needs
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto">One platform. Full visibility. Zero surprises.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="p-6 rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${f.color}22`,
                boxShadow: `0 0 40px ${f.color}08`,
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: `${f.color}15`,
                  border: `1px solid ${f.color}30`,
                  boxShadow: `0 0 20px ${f.color}20`,
                }}
              >
                <f.icon className="w-6 h-6" style={{ color: f.color }} />
              </div>
              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: f.color, textShadow: `0 0 10px ${f.color}40` }}
              >
                {f.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="text-center pb-24 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="inline-block p-12 rounded-3xl max-w-2xl w-full"
          style={{
            background: 'rgba(0,240,255,0.04)',
            border: '1px solid rgba(0,240,255,0.15)',
            boxShadow: '0 0 60px rgba(0,240,255,0.06)',
          }}
        >
          <span style={{ fontSize: '3rem' }}>🚛</span>
          <h2 className="text-3xl font-bold text-white mt-4 mb-3">Ready to take control?</h2>
          <p className="text-slate-400 mb-8">Join your fleet on FleetManager today.</p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => void goTo('/login', 'left')}
              className="px-7 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'white',
              }}
            >
              Login
            </button>
            <button
              onClick={() => void goTo('/login?tab=register', 'right')}
              className="px-7 py-3 rounded-xl text-sm font-bold text-black transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #00f0ff, #0088ff)',
                boxShadow: '0 0 25px rgba(0,240,255,0.3)',
              }}
            >
              Sign Up Free
            </button>
          </div>
        </motion.div>
      </section>

      <footer className="text-center pb-8 text-xs text-slate-600 border-t border-white/5 pt-6">
        FleetManager MVP · Built with React, Node.js & MongoDB
      </footer>
    </div>
  );
}
