import { memo } from 'react';

/** Night depot scene. Drawn in a 1600 x 900 box, scaled with "slice", bottom-aligned. */
export const SCENE = { w: 1600, h: 900, roadY: 800 } as const;
export const LAMPS = [190, 640, 1090, 1540] as const;
const LAMP_TOP = 360;

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r = rng(7);
const STARS = Array.from({ length: 70 }, () => ({
  x: r() * 1600,
  y: r() * 330,
  s: 0.4 + r() * 0.9,
  o: 0.15 + r() * 0.5,
}));

interface Bldg {
  x: number;
  w: number;
  h: number;
  win: { x: number; y: number; c: string; o: number }[];
}
const SKYLINE: Bldg[] = (() => {
  const out: Bldg[] = [];
  let x = -20;
  while (x < 1620) {
    const w = 34 + r() * 70;
    const h = 40 + Math.pow(r(), 1.6) * 190;
    const win: Bldg['win'] = [];
    for (let wy = 568 - h + 8; wy < 556; wy += 9) {
      for (let wx = x + 5; wx < x + w - 5; wx += 7) {
        if (r() < 0.09) {
          win.push({ x: wx, y: wy, c: r() < 0.75 ? '#ffd58a' : '#a5ecff', o: 0.35 + r() * 0.55 });
        }
      }
    }
    out.push({ x, w, h, win });
    x += w + r() * 6;
  }
  return out;
})();

const TREES = Array.from({ length: 46 }, (_, i) => ({
  x: i * 19 + r() * 10,
  h: 18 + r() * 34,
  w: 16 + r() * 18,
}));

const DOORS = [880, 975, 1070, 1165, 1260, 1355, 1450];

function SceneBackdropImpl() {
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMax slice"
      width="100%"
      height="100%"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, display: 'block' }}
    >
      <defs>
        <linearGradient id="bg-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#02040a" />
          <stop offset="0.35" stopColor="#060c1a" />
          <stop offset="0.55" stopColor="#0b1a2e" />
          <stop offset="0.64" stopColor="#15304a" />
          <stop offset="0.68" stopColor="#0d1b2c" />
        </linearGradient>
        <radialGradient id="bg-cityglow" cx="0.5" cy="1" r="0.7">
          <stop offset="0" stopColor="#3aa6c9" stopOpacity="0.28" />
          <stop offset="0.5" stopColor="#1d5a7a" stopOpacity="0.1" />
          <stop offset="1" stopColor="#0b1a2e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bg-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a3550" stopOpacity="0" />
          <stop offset="0.7" stopColor="#1b3a55" stopOpacity="0.45" />
          <stop offset="1" stopColor="#0e1d2e" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="bg-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#10161f" />
          <stop offset="0.35" stopColor="#0b1018" />
          <stop offset="1" stopColor="#05070b" />
        </linearGradient>
        <linearGradient id="bg-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4c8fb3" stopOpacity="0.16" />
          <stop offset="0.4" stopColor="#2b5876" stopOpacity="0.05" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="bg-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#172235" />
          <stop offset="1" stopColor="#0a111c" />
        </linearGradient>
        <radialGradient id="bg-lampglow">
          <stop offset="0" stopColor="#fff8ea" stopOpacity="1" />
          <stop offset="0.12" stopColor="#ffe7bd" stopOpacity="0.55" />
          <stop offset="0.4" stopColor="#ffd796" stopOpacity="0.12" />
          <stop offset="1" stopColor="#ffd796" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bg-cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe6b8" stopOpacity="0.2" />
          <stop offset="0.6" stopColor="#ffe6b8" stopOpacity="0.05" />
          <stop offset="1" stopColor="#ffe6b8" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="bg-pool">
          <stop offset="0" stopColor="#ffe3b0" stopOpacity="0.26" />
          <stop offset="0.6" stopColor="#ffe3b0" stopOpacity="0.07" />
          <stop offset="1" stopColor="#ffe3b0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bg-refl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe2ad" stopOpacity="0.5" />
          <stop offset="0.5" stopColor="#ffd690" stopOpacity="0.18" />
          <stop offset="1" stopColor="#ffd690" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="bg-doorlit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffcf8a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff9f45" stopOpacity="0.15" />
        </linearGradient>
        <radialGradient id="bg-docklight">
          <stop offset="0" stopColor="#ffe9c4" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffe9c4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bg-vignette" cx="0.5" cy="0.55" r="0.75">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.6" />
        </radialGradient>
        <filter id="bg-blur6">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="bg-blur3" x="-50%" y="-10%" width="200%" height="120%">
          <feGaussianBlur stdDeviation="3 1" />
        </filter>
        <filter id="bg-neon" x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="bg-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
          <feColorMatrix values="0 0 0 0 0.6  0 0 0 0 0.65  0 0 0 0 0.7  0 0 0 0.09 0" />
        </filter>
      </defs>

      {/* Sky */}
      <rect width="1600" height="620" fill="url(#bg-sky)" />
      <rect y="300" width="1600" height="300" fill="url(#bg-cityglow)" />
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#dbe8ff" opacity={s.o} />
      ))}

      {/* Distant skyline */}
      <g>
        {SKYLINE.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={568 - b.h} width={b.w} height={b.h} fill={i % 3 === 0 ? '#0b1526' : '#09121f'} />
            {b.win.map((w, j) => (
              <rect key={j} x={w.x} y={w.y} width={3} height={4} fill={w.c} opacity={w.o * 0.7} />
            ))}
          </g>
        ))}
        {/* radio mast with aviation light */}
        <path d="M1460 568 L1470 330 L1480 568" fill="none" stroke="#0d1828" strokeWidth={3} />
        <circle cx={1470} cy={328} r={2.5} fill="#ff3b30" className="fm-blink" />
        <circle cx={1470} cy={328} r={10} fill="#ff3b30" opacity={0.25} className="fm-blink" />
      </g>
      <rect y="420" width="1600" height="200" fill="url(#bg-haze)" />

      {/* Tree line (left) */}
      <g fill="#060c16">
        {TREES.map((t, i) => (
          <ellipse key={i} cx={t.x} cy={600 - t.h / 2} rx={t.w / 2} ry={t.h / 2 + 8} />
        ))}
        <rect x="0" y="588" width="900" height="30" />
      </g>

      {/* Depot warehouse */}
      <g>
        <rect x="830" y="498" width="790" height="120" fill="url(#bg-wall)" />
        <rect x="830" y="494" width="790" height="6" fill="#22324a" />
        {Array.from({ length: 26 }, (_, i) => (
          <line key={i} x1={846 + i * 30} y1={502} x2={846 + i * 30} y2={540} stroke="#0a111b" strokeWidth={1} />
        ))}
        {DOORS.map((x, i) => (
          <g key={x}>
            <rect x={x} y={548} width={70} height={66} fill={i === 2 ? 'url(#bg-doorlit)' : '#0c1420'} />
            {i !== 2 &&
              [556, 566, 576, 586, 596, 606].map((y) => (
                <line key={y} x1={x} y1={y} x2={x + 70} y2={y} stroke="#070c14" strokeWidth={1.2} />
              ))}
            <rect x={x - 4} y={612} width={78} height={6} fill="#111a27" />
            <rect x={x + 30} y={538} width={10} height={4} rx={1} fill="#fff1d6" />
            <ellipse cx={x + 35} cy={556} rx={46} ry={26} fill="url(#bg-docklight)" />
          </g>
        ))}
        {/* neon sign */}
        <g filter="url(#bg-neon)" className="fm-neon">
          <text
            x="1190"
            y="528"
            textAnchor="middle"
            fontFamily="'Space Grotesk', system-ui, sans-serif"
            fontWeight={700}
            fontSize="24"
            letterSpacing="6"
            fill="#7ff7ff"
          >
            DEPOT 04
          </text>
        </g>
      </g>

      {/* Fence along far sidewalk */}
      <g stroke="#131c29" strokeWidth={1.4}>
        <line x1="0" y1="596" x2="830" y2="596" />
        {Array.from({ length: 28 }, (_, i) => (
          <line key={i} x1={i * 30 + 8} y1={590} x2={i * 30 + 8} y2={620} />
        ))}
      </g>

      {/* Far sidewalk + curb */}
      <rect x="0" y="616" width="1600" height="12" fill="#131a24" />
      <rect x="0" y="616" width="1600" height="1.5" fill="#2a3646" />

      {/* Road */}
      <rect x="0" y="628" width="1600" height="242" fill="url(#bg-road)" />
      <rect x="0" y="628" width="1600" height="242" filter="url(#bg-grain)" />
      <rect x="0" y="628" width="1600" height="242" fill="url(#bg-sheen)" />
      <line x1="0" y1="640" x2="1600" y2="640" stroke="#d9dde3" strokeOpacity={0.35} strokeWidth={2} />
      <line x1="0" y1="716" x2="1600" y2="716" stroke="#e6e9ee" strokeOpacity={0.4} strokeWidth={4} strokeDasharray="70 60" />
      <line x1="0" y1="858" x2="1600" y2="858" stroke="#d9dde3" strokeOpacity={0.4} strokeWidth={3} />
      {/* puddles */}
      {[
        [260, 760, 90, 7],
        [720, 834, 120, 6],
        [1180, 748, 70, 5],
        [1420, 842, 110, 6],
      ].map(([x, y, rx, ry], i) => (
        <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill="#1b3044" opacity={0.45} />
      ))}

      {/* Street lamps */}
      {LAMPS.map((x) => (
        <g key={x}>
          <polygon points={`${x + 30},${LAMP_TOP + 8} ${x - 150},870 ${x + 230},870`} fill="url(#bg-cone)" />
          <ellipse cx={x + 40} cy={760} rx={260} ry={70} fill="url(#bg-pool)" />
          <rect x={x + 30} y={630} width={14} height={240} fill="url(#bg-refl)" filter="url(#bg-blur3)" />
          <rect x={x + 34} y={630} width={5} height={150} fill="url(#bg-refl)" />
          <rect x={x - 3} y={LAMP_TOP} width={6} height={258} fill="#141c28" />
          <rect x={x - 3} y={LAMP_TOP} width={1.5} height={258} fill="#33435a" />
          <path d={`M${x} ${LAMP_TOP + 4} Q${x + 4} ${LAMP_TOP - 6} ${x + 26} ${LAMP_TOP - 2}`} fill="none" stroke="#141c28" strokeWidth={4} />
          <path d={`M${x + 18} ${LAMP_TOP - 6} L${x + 48} ${LAMP_TOP - 4} L${x + 46} ${LAMP_TOP + 4} L${x + 18} ${LAMP_TOP + 2} Z`} fill="#1a2433" />
          <rect x={x + 22} y={LAMP_TOP + 2} width={22} height={3} rx={1.5} fill="#fff8e8" />
          <circle cx={x + 33} cy={LAMP_TOP + 6} r={120} fill="url(#bg-lampglow)" />
        </g>
      ))}

      {/* Near curb + sidewalk */}
      <rect x="0" y="870" width="1600" height="30" fill="#0d1219" />
      <rect x="0" y="870" width="1600" height="2" fill="#26313f" />

      {/* Out-of-focus foreground bollards (depth of field) */}
      <g filter="url(#bg-blur6)" opacity={0.9}>
        <rect x="1560" y="760" width="34" height="160" rx="10" fill="#05080c" />
        <rect x="1560" y="790" width="34" height="10" fill="#c8a000" opacity={0.4} />
        <rect x="6" y="780" width="28" height="140" rx="8" fill="#05080c" />
      </g>

      <rect width="1600" height="900" fill="url(#bg-vignette)" />
    </svg>
  );
}

export const SceneBackdrop = memo(SceneBackdropImpl);
