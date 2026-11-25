/**
 * Side-view European cab-over tractor + tri-axle box trailer, drawn in SVG.
 *
 * Units: 1 metre = 47 units. Ground (tyre contact) is at y = G. The truck faces
 * right; local x = 0 is the trailer's rear face and x = FRONT is the bumper.
 *
 * Nothing here animates by itself. TruckScene drives the refs every frame
 * (wheel spin, suspension pitch, lights, light sweep from street lamps).
 */

export const G = 300;
export const UNITS_PER_M = 47;
export const WHEEL_R = 25;
export const WHEEL_R_M = WHEEL_R / UNITS_PER_M;
export const WHEEL_CY = G - WHEEL_R;
export const FRONT = 806;
export const VB = { x: -80, y: 80, w: 1360, h: 360 } as const;

export const WHEELS = [100, 162, 224, 560, 752] as const;
export const TRAILER_PIVOT = [162, WHEEL_CY] as const;
export const CHASSIS_PIVOT = [560, WHEEL_CY] as const;
export const CAB_PIVOT = [700, 248] as const;
export const EXHAUST = [602, 290] as const;
export const HUD_ANCHOR = [748, 114] as const;
export const AIR_BRAKES = [100, 162, 224, 560] as const;
export const LAMP_COUNT = 4;

export interface TruckRefs {
  wheels: (SVGGElement | null)[];
  blurs: (SVGCircleElement | null)[];
  trailer: SVGGElement | null;
  chassis: (SVGGElement | null)[];
  cab: (SVGGElement | null)[];
  brake: (SVGGElement | null)[];
  lampTrailer: (SVGEllipseElement | null)[];
  lampCab: (SVGEllipseElement | null)[];
}

export function createTruckRefs(): TruckRefs {
  return {
    wheels: [],
    blurs: [],
    trailer: null,
    chassis: [],
    cab: [],
    brake: [],
    lampTrailer: [],
    lampCab: [],
  };
}

const HOLES = Array.from({ length: 10 }, (_, i) => i * 36);
const RIBS = Array.from({ length: 15 }, (_, i) => 24 + i * 40);
const MARKERS = [34, 128, 300, 392, 586];

const CAB_PATH =
  'M690 252 L690 132 Q690 120 702 120 L774 120 Q789 120 792 132 L800 236 L803 252 L777 252 A34 34 0 0 0 727 252 Z';

function Wheel({ x, i, refs }: { x: number; i: number; refs: TruckRefs }) {
  return (
    <g transform={`translate(${x} ${WHEEL_CY})`}>
      <circle r={25} fill="url(#fm-tire)" />
      <circle r={24.3} fill="none" stroke="#2c3037" strokeWidth={0.7} opacity={0.8} />
      <circle r={21.4} fill="none" stroke="#17191d" strokeWidth={1.4} />
      <circle r={17.8} fill="#07080a" />
      <circle r={16.2} fill="url(#fm-rim)" />
      <circle r={16.2} fill="none" stroke="#e9edf2" strokeWidth={0.6} opacity={0.55} />
      <g
        ref={(el) => {
          refs.wheels[i] = el;
        }}
      >
        {HOLES.map((a) => (
          <ellipse
            key={a}
            cx={0}
            cy={-11.6}
            rx={2.9}
            ry={1.9}
            transform={`rotate(${a})`}
            fill="#14171b"
            stroke="#6b737e"
            strokeWidth={0.35}
          />
        ))}
        {HOLES.map((a) => (
          <circle
            key={`n${a}`}
            cx={0}
            cy={-7.3}
            r={1.15}
            transform={`rotate(${a + 18})`}
            fill="#d2d7de"
            stroke="#4f5660"
            strokeWidth={0.35}
          />
        ))}
        <rect x={-0.7} y={-15.6} width={1.4} height={3} fill="#2a2e34" transform="rotate(9)" />
      </g>
      <circle
        r={16.2}
        fill="url(#fm-rimblur)"
        opacity={0}
        ref={(el) => {
          refs.blurs[i] = el;
        }}
      />
      <circle r={5} fill="url(#fm-hub)" stroke="#3f454e" strokeWidth={0.5} />
      <circle r={16.2} fill="url(#fm-rimspec)" />
      <path d="M-19 -13 A23 23 0 0 1 12 -20" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={2} />
    </g>
  );
}

function Defs() {
  return (
    <defs>
      <linearGradient id="fm-cab" gradientUnits="userSpaceOnUse" x1="0" y1="118" x2="0" y2="254">
        <stop offset="0" stopColor="#6a809f" />
        <stop offset="0.05" stopColor="#3a5070" />
        <stop offset="0.2" stopColor="#1f3150" />
        <stop offset="0.43" stopColor="#172742" />
        <stop offset="0.455" stopColor="#0a1324" />
        <stop offset="0.75" stopColor="#111d31" />
        <stop offset="1" stopColor="#060b15" />
      </linearGradient>
      <linearGradient id="fm-cab-h" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#000" stopOpacity="0.5" />
        <stop offset="0.12" stopColor="#000" stopOpacity="0" />
        <stop offset="0.88" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#fff" stopOpacity="0.1" />
      </linearGradient>
      <linearGradient id="fm-trailer" gradientUnits="userSpaceOnUse" x1="0" y1="112" x2="0" y2="246">
        <stop offset="0" stopColor="#c7d0db" />
        <stop offset="0.05" stopColor="#a9b4c2" />
        <stop offset="0.44" stopColor="#7e8b9d" />
        <stop offset="0.47" stopColor="#5d697a" />
        <stop offset="0.8" stopColor="#6a7687" />
        <stop offset="1" stopColor="#3e4756" />
      </linearGradient>
      <linearGradient id="fm-trailer-h" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#000" stopOpacity="0.35" />
        <stop offset="0.04" stopColor="#000" stopOpacity="0" />
        <stop offset="0.6" stopColor="#000" stopOpacity="0.06" />
        <stop offset="0.97" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.3" />
      </linearGradient>
      <linearGradient id="fm-ao" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.45" />
      </linearGradient>
      <linearGradient id="fm-glass" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stopColor="#2a3a52" />
        <stop offset="0.35" stopColor="#0c1422" />
        <stop offset="1" stopColor="#04070d" />
      </linearGradient>
      <linearGradient id="fm-alu" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#eef2f6" />
        <stop offset="0.22" stopColor="#a5afbc" />
        <stop offset="0.5" stopColor="#5a6473" />
        <stop offset="0.56" stopColor="#c9d0d9" />
        <stop offset="0.8" stopColor="#7c8694" />
        <stop offset="1" stopColor="#323843" />
      </linearGradient>
      <linearGradient id="fm-metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c5ccd5" />
        <stop offset="0.5" stopColor="#7d8693" />
        <stop offset="1" stopColor="#3d444e" />
      </linearGradient>
      <linearGradient id="fm-rail" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#dfe5ec" />
        <stop offset="1" stopColor="#7f8998" />
      </linearGradient>
      <linearGradient id="fm-frame" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2a2f37" />
        <stop offset="1" stopColor="#0b0d11" />
      </linearGradient>
      <radialGradient id="fm-tire" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#0b0c0e" />
        <stop offset="0.72" stopColor="#15171a" />
        <stop offset="0.92" stopColor="#202328" />
        <stop offset="1" stopColor="#0a0b0d" />
      </radialGradient>
      <radialGradient id="fm-rim" cx="0.42" cy="0.38" r="0.62">
        <stop offset="0" stopColor="#f2f5f8" />
        <stop offset="0.45" stopColor="#bcc4ce" />
        <stop offset="0.8" stopColor="#7a8491" />
        <stop offset="1" stopColor="#3b424c" />
      </radialGradient>
      <radialGradient id="fm-rimblur" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#c9d0d8" />
        <stop offset="0.3" stopColor="#aeb6c0" />
        <stop offset="0.45" stopColor="#8e97a3" />
        <stop offset="0.62" stopColor="#868f9b" />
        <stop offset="0.82" stopColor="#a3abb5" />
        <stop offset="1" stopColor="#5f6773" />
      </radialGradient>
      <radialGradient id="fm-rimspec" cx="0.3" cy="0.22" r="0.6">
        <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0.08" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="fm-hub" cx="0.4" cy="0.35" r="0.65">
        <stop offset="0" stopColor="#f3f6f9" />
        <stop offset="1" stopColor="#5f6874" />
      </radialGradient>
      <radialGradient id="fm-lamp">
        <stop offset="0" stopColor="#fff1d2" stopOpacity="0.62" />
        <stop offset="0.45" stopColor="#ffe9c2" stopOpacity="0.2" />
        <stop offset="1" stopColor="#ffe9c2" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="fm-headglow">
        <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
        <stop offset="0.2" stopColor="#fff6dc" stopOpacity="0.75" />
        <stop offset="1" stopColor="#fff2cc" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="fm-brakeglow">
        <stop offset="0" stopColor="#ff4a2e" stopOpacity="0.95" />
        <stop offset="0.3" stopColor="#ff1a0a" stopOpacity="0.45" />
        <stop offset="1" stopColor="#ff0000" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="fm-amber">
        <stop offset="0" stopColor="#ffc35a" stopOpacity="0.95" />
        <stop offset="0.35" stopColor="#ff9b1a" stopOpacity="0.35" />
        <stop offset="1" stopColor="#ff8a00" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="fm-shadow">
        <stop offset="0" stopColor="#000" stopOpacity="0.85" />
        <stop offset="0.7" stopColor="#000" stopOpacity="0.5" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="fm-beam" gradientUnits="userSpaceOnUse" x1="800" y1="0" x2="1270" y2="0">
        <stop offset="0" stopColor="#fff6dd" stopOpacity="0.38" />
        <stop offset="0.5" stopColor="#fff2d0" stopOpacity="0.12" />
        <stop offset="1" stopColor="#fff2d0" stopOpacity="0" />
      </linearGradient>
      <radialGradient id="fm-pool">
        <stop offset="0" stopColor="#fff4d8" stopOpacity="0.32" />
        <stop offset="1" stopColor="#fff4d8" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="fm-streak" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity="0" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="fm-reflmask-g" gradientUnits="userSpaceOnUse" x1="0" y1={G} x2="0" y2={G + 120}>
        <stop offset="0" stopColor="#fff" stopOpacity="1" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <mask id="fm-reflmask" maskUnits="userSpaceOnUse" x={VB.x} y={G} width={VB.w} height={140}>
        <rect x={VB.x} y={G} width={VB.w} height={140} fill="url(#fm-reflmask-g)" />
      </mask>
      <filter id="fm-reflblur" x="-5%" y="-5%" width="110%" height="110%">
        <feGaussianBlur stdDeviation="1.6 2.6" />
      </filter>
      <linearGradient id="fm-refstreak" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff2cf" stopOpacity="0.55" />
        <stop offset="1" stopColor="#fff2cf" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="fm-redstreak" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ff2a14" stopOpacity="0.6" />
        <stop offset="1" stopColor="#ff2a14" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="fm-cyan" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#00f0ff" stopOpacity="0" />
        <stop offset="0.25" stopColor="#00f0ff" stopOpacity="0.9" />
        <stop offset="1" stopColor="#38bdf8" stopOpacity="1" />
      </linearGradient>
      <clipPath id="fm-clip-trailer">
        <rect x={0} y={112} width={640} height={134} />
      </clipPath>
      <clipPath id="fm-clip-cab">
        <path d={CAB_PATH} />
      </clipPath>
    </defs>
  );
}

function Lights({ refs, kind }: { refs: TruckRefs; kind: 'trailer' | 'cab' }) {
  return (
    <g clipPath={`url(#fm-clip-${kind})`} style={{ mixBlendMode: 'screen' }} opacity={kind === 'cab' ? 0.55 : 1}>
      {Array.from({ length: LAMP_COUNT }, (_, i) => (
        <ellipse
          key={i}
          cx={-9999}
          cy={150}
          rx={230}
          ry={190}
          fill="url(#fm-lamp)"
          ref={(el) => {
            if (kind === 'trailer') refs.lampTrailer[i] = el;
            else refs.lampCab[i] = el;
          }}
        />
      ))}
    </g>
  );
}

function Suzies() {
  // Coiled air (red / blue) and electrical (black) lines from cab to trailer.
  const coil = (y0: number, sag: number) =>
    `M688 ${y0} C676 ${y0 + sag} 664 ${y0 + sag} 655 ${y0 + 8}`;
  return (
    <g fill="none" strokeLinecap="round">
      {[
        { y: 150, sag: 16, c: '#a3221b' },
        { y: 156, sag: 13, c: '#1e40af' },
        { y: 162, sag: 10, c: '#1a1c20' },
      ].map(({ y, sag, c }) => (
        <g key={y}>
          <path d={coil(y, sag)} stroke={c} strokeWidth={2.4} />
          <path d={coil(y, sag)} stroke="rgba(0,0,0,0.55)" strokeWidth={2.4} strokeDasharray="0.7 1.3" />
        </g>
      ))}
    </g>
  );
}

function TruckBody({ refs }: { refs: TruckRefs }) {
  const chassisRef = (i: number) => (el: SVGGElement | null) => {
    refs.chassis[i] = el;
  };
  const cabRef = (i: number) => (el: SVGGElement | null) => {
    refs.cab[i] = el;
  };

  return (
    <g id="fm-truck-body">
      {/* Underside darkness behind wheels */}
      <rect x={0} y={244} width={640} height={22} fill="#07090c" />
      <rect x={520} y={246} width={280} height={24} fill="#06080b" />

      {WHEELS.map((x, i) => (
        <Wheel key={x} x={x} i={i} refs={refs} />
      ))}

      {/* ── Tractor chassis (pitches about drive axle) ── */}
      <g ref={chassisRef(0)}>
        <rect x={516} y={236} width={278} height={14} fill="url(#fm-frame)" />
        <rect x={538} y={231} width={58} height={6} rx={1} fill="#2c323b" />
        {/* drive-axle fender + flap */}
        <path d="M528 264 A33 33 0 0 1 592 264" fill="none" stroke="#0b0d11" strokeWidth={7} />
        <path d="M528 264 A33 33 0 0 1 592 264" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} transform="translate(0 -3)" />
        <rect x={518} y={258} width={5} height={36} rx={1} fill="#0a0c0f" />
        {/* air tanks */}
        <rect x={597} y={252} width={15} height={22} rx={6} fill="url(#fm-metal)" />
        {/* fuel tank */}
        <rect x={614} y={250} width={82} height={34} rx={11} fill="url(#fm-alu)" />
        <rect x={629} y={249} width={4} height={36} rx={1} fill="#2a3039" />
        <rect x={676} y={249} width={4} height={36} rx={1} fill="#2a3039" />
        <rect x={654} y={253} width={9} height={4} rx={1.5} fill="#3a414b" />
        {/* exhaust tail pipe */}
        <rect x={598} y={276} width={7} height={12} rx={1.5} fill="#3b3f45" />
        <rect x={598} y={286} width={7} height={2} fill="#121316" />
        {/* contact shadow under tank */}
        <rect x={616} y={283} width={78} height={3} fill="#000" opacity={0.35} />
      </g>

      {/* ── Trailer (pitches about axle group) ── */}
      <g ref={(el) => (refs.trailer = el)}>
        {/* box */}
        <rect x={0} y={112} width={640} height={134} rx={2} fill="url(#fm-trailer)" />
        {RIBS.map((x) => (
          <g key={x}>
            <line x1={x} y1={119} x2={x} y2={236} stroke="#000" strokeOpacity={0.14} />
            <line x1={x + 1.2} y1={119} x2={x + 1.2} y2={236} stroke="#fff" strokeOpacity={0.07} />
          </g>
        ))}
        {/* brand swoosh */}
        <path
          d="M0 214 L292 214 Q404 214 498 168 L640 118 L640 133 L506 180 Q412 228 292 228 L0 228 Z"
          fill="url(#fm-cyan)"
          opacity={0.85}
        />
        <path d="M0 214 L292 214 Q404 214 498 168 L640 118" fill="none" stroke="#c9fbff" strokeOpacity={0.5} strokeWidth={0.8} />
        <g fontFamily="'Space Grotesk', 'Inter', system-ui, sans-serif" fontWeight={700}>
          <text x={46} y={178} fontSize={44} fill="#0c1628" letterSpacing={1.5}>
            FLEET MANAGER
          </text>
          <text x={48} y={200} fontSize={12.5} fill="#16243b" letterSpacing={4.2} fontWeight={600}>
            LIVE TELEMATICS · PREDICTIVE MAINTENANCE
          </text>
          <g transform="translate(470 142)">
            <rect x={0} y={0} width={44} height={44} rx={9} fill="#0c1628" />
            <text x={22} y={30} fontSize={19} fill="#00f0ff" textAnchor="middle">
              FM
            </text>
          </g>
        </g>
        <rect x={0} y={112} width={640} height={134} fill="url(#fm-trailer-h)" />
        <rect x={0} y={200} width={640} height={46} fill="url(#fm-ao)" opacity={0.6} />
        <Lights refs={refs} kind="trailer" />
        {/* top rail, posts, bottom rail */}
        <rect x={0} y={111} width={640} height={6} fill="url(#fm-rail)" />
        <rect x={0} y={112} width={7} height={134} fill="#5d6776" />
        <rect x={633} y={112} width={7} height={134} fill="#5d6776" />
        <rect x={0} y={236} width={640} height={10} fill="url(#fm-frame)" />
        <rect x={0} y={236} width={640} height={1} fill="#9aa4b1" opacity={0.6} />
        {/* contour marking tape */}
        <line x1={10} y1={232} x2={630} y2={232} stroke="#f2c200" strokeWidth={2.6} strokeDasharray="20 14" opacity={0.65} />
        <line x1={3.5} y1={120} x2={3.5} y2={230} stroke="#f2c200" strokeWidth={2.4} strokeDasharray="16 12" opacity={0.6} />
        {/* reefer unit on front face */}
        <rect x={640} y={128} width={16} height={86} rx={2} fill="#262c35" />
        {[140, 150, 160, 170, 180, 190, 200].map((y) => (
          <line key={y} x1={642} y1={y} x2={654} y2={y} stroke="#0c0f13" strokeWidth={1.4} />
        ))}
        <rect x={654} y={128} width={2} height={86} fill="#fff" opacity={0.12} />
        {/* mudguards over tri-axle */}
        <path d="M68 266 A32 32 0 0 1 130 258 L132 252 A32 32 0 0 1 192 252 L194 258 A32 32 0 0 1 256 266" fill="none" stroke="#0b0d11" strokeWidth={6} />
        <rect x={68} y={246} width={190} height={5} fill="#0e1014" />
        <rect x={60} y={252} width={6} height={42} rx={1} fill="#0b0d10" />
        {/* rear underrun bar */}
        <rect x={18} y={246} width={4} height={18} fill="#2c323b" />
        <rect x={4} y={262} width={46} height={8} rx={1} fill="url(#fm-metal)" />
        {/* side guard */}
        <rect x={262} y={256} width={206} height={4} rx={1} fill="url(#fm-metal)" />
        <rect x={262} y={270} width={206} height={4} rx={1} fill="url(#fm-metal)" />
        {[268, 360, 462].map((x) => (
          <rect key={x} x={x} y={246} width={3} height={29} fill="#2a3038" />
        ))}
        {/* landing gear */}
        <rect x={476} y={246} width={8} height={40} fill="url(#fm-metal)" />
        <rect x={470} y={285} width={20} height={4} rx={1} fill="#2c323b" />
        <rect x={484} y={258} width={10} height={2.5} fill="#5c6570" />
        {/* side markers (amber) */}
        {MARKERS.map((x) => (
          <g key={x}>
            <circle cx={x} cy={242} r={9} fill="url(#fm-amber)" />
            <rect x={x - 3} y={239.5} width={6} height={4} rx={1} fill="#ffcf73" />
          </g>
        ))}
        {/* rear light cluster edge + tail/brake glow */}
        <rect x={0} y={246} width={11} height={9} rx={1} fill="#4a0c08" />
        <g
          ref={(el) => {
            refs.brake[0] = el;
          }}
          opacity={0.35}
        >
          <circle cx={1} cy={250} r={34} fill="url(#fm-brakeglow)" />
          <rect x={0} y={247} width={10} height={6} rx={1} fill="#ff5a3c" />
        </g>
      </g>

      <g ref={chassisRef(1)}>
        <Suzies />
      </g>

      {/* ── Cab (own air suspension) ── */}
      <g ref={chassisRef(2)}>
        <g ref={cabRef(0)}>
          <path d={CAB_PATH} fill="url(#fm-cab)" />
          <path d={CAB_PATH} fill="url(#fm-cab-h)" />
          {/* panel lines: sleeper seam, front corner, beltline crease */}
          <path d="M705 124 L705 250" stroke="#000" strokeOpacity={0.45} strokeWidth={0.9} />
          <path d="M706 124 L706 250" stroke="#9fb4d0" strokeOpacity={0.1} strokeWidth={0.8} />
          <path d="M781 124 Q787 180 789 250" fill="none" stroke="#000" strokeOpacity={0.4} strokeWidth={0.9} />
          <path d="M690 197 L796 196" stroke="#000" strokeOpacity={0.35} strokeWidth={0.8} />
          <path d="M690 198.2 L796 197.2" stroke="#b9cbe4" strokeOpacity={0.14} strokeWidth={0.8} />
          {/* roof highlight + light bar */}
          <path d="M702 120 L774 120 Q789 120 792 132" fill="none" stroke="#a9bcd6" strokeOpacity={0.55} strokeWidth={1.4} />
          <rect x={738} y={114} width={50} height={6} rx={2} fill="#0b1018" />
          {[746, 757, 768, 779].map((x) => (
            <g key={x}>
              <circle cx={x} cy={117} r={8} fill="url(#fm-amber)" opacity={0.75} />
              <circle cx={x} cy={117} r={1.8} fill="#ffe0a3" />
            </g>
          ))}
          {/* sun visor */}
          <path d="M782 128 L801 131 L800 138 L784 137 Z" fill="#070c15" />
          {/* windscreen edge */}
          <path d="M792 140 L797 140 L800 200 L795 200 Z" fill="url(#fm-glass)" opacity={0.9} />
          {/* door + window */}
          <path d="M707 142 L775 142 Q778 142 778 146 L779 232 L707 232 Z" fill="none" stroke="#000" strokeOpacity={0.55} strokeWidth={1.2} />
          <path d="M708 143 L776 143" stroke="#fff" strokeOpacity={0.08} />
          <path d="M712 147 L771 147 Q774 147 774 151 L775 193 L712 193 Z" fill="url(#fm-glass)" stroke="#05080d" strokeWidth={1.4} />
          <path d="M724 147 L742 147 L722 193 L704 193 Z" fill="#fff" opacity={0.06} clipPath="url(#fm-clip-cab)" />
          <path d="M748 147 L754 147 L736 193 L730 193 Z" fill="#fff" opacity={0.04} />
          <rect x={715} y={202} width={15} height={3} rx={1.2} fill="url(#fm-metal)" />
          {/* grab handle */}
          <rect x={701} y={166} width={2.4} height={62} rx={1.2} fill="url(#fm-metal)" />
          {/* sleeper vent */}
          {[160, 166, 172, 178, 184, 190].map((y) => (
            <line key={y} x1={692} y1={y} x2={699} y2={y} stroke="#05080e" strokeWidth={1.6} />
          ))}
          {/* door monogram + accent strip */}
          <text x={745} y={222} fontFamily="'Space Grotesk', system-ui, sans-serif" fontWeight={700} fontSize={11} fill="#00f0ff" opacity={0.9}>
            FM
          </text>
          <path d="M690 238 L798 233" stroke="#00f0ff" strokeWidth={1.3} opacity={0.85} />
          <path d="M690 238 L798 233" stroke="#00f0ff" strokeWidth={5} opacity={0.12} />
          {/* lower AO */}
          <rect x={690} y={205} width={115} height={47} fill="url(#fm-ao)" clipPath="url(#fm-clip-cab)" />
          <Lights refs={refs} kind="cab" />
          {/* cab side marker */}
          <circle cx={694} cy={246} r={8} fill="url(#fm-amber)" />
          <rect x={692} y={244} width={5} height={4} rx={1} fill="#ffcf73" />
          {/* mirrors */}
          <path d="M790 150 L812 146" stroke="#1a1f27" strokeWidth={2.2} />
          <path d="M792 188 L812 192" stroke="#1a1f27" strokeWidth={1.8} />
          <rect x={807} y={138} width={11} height={48} rx={3} fill="#0d131c" />
          <rect x={808} y={139} width={2} height={46} rx={1} fill="#fff" opacity={0.15} />
          <rect x={808} y={190} width={9} height={15} rx={2.5} fill="#0d131c" />
          {/* headlight */}
          <path d="M786 224 L801 223 L803 239 L788 240 Q785 232 786 224 Z" fill="#1d2430" />
          <path d="M789 226 L800 225.5 L801.5 237 L790.5 237.5 Z" fill="#fffbef" />
          <path d="M787 221.5 L801 220.5" stroke="#eaf6ff" strokeWidth={1.4} />
          <rect x={789} y={241} width={12} height={4} rx={1} fill="#ffb02e" />
        </g>
      </g>

      {/* ── Bumper, steps, front arch liner (on chassis) ── */}
      <g ref={chassisRef(3)}>
        <path d="M718 262 A34 34 0 0 1 786 262" fill="none" stroke="#090b0e" strokeWidth={6} />
        <path d="M781 250 L806 250 Q809 250 809 254 L809 280 Q809 285 804 285 L786 285 Q782 266 781 250 Z" fill="#141a23" />
        <path d="M783 252 L807 252" stroke="#7e8aa0" strokeOpacity={0.4} />
        <rect x={801} y={270} width={7} height={5} rx={1.2} fill="#fff3d6" opacity={0.85} />
        {/* steps */}
        <rect x={692} y={250} width={30} height={42} rx={2} fill="#090c10" />
        <rect x={694} y={266} width={26} height={3} fill="url(#fm-metal)" />
        <rect x={694} y={284} width={26} height={3} fill="url(#fm-metal)" />
      </g>
    </g>
  );
}

export function Truck({ refs }: { refs: TruckRefs }) {
  return (
    <svg
      viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
      width="100%"
      height="100%"
      overflow="visible"
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <Defs />

      {/* Wet-road reflection (live clone of the body, flipped about the ground) */}
      <g mask="url(#fm-reflmask)" opacity={0.34} filter="url(#fm-reflblur)">
        <use href="#fm-truck-body" transform={`matrix(1 0 0 -1 0 ${2 * G})`} />
      </g>
      <g>
        <rect x={789} y={G} width={14} height={110} fill="url(#fm-refstreak)" />
        <g
          ref={(el) => {
            refs.brake[1] = el;
          }}
          opacity={0.35}
        >
          <rect x={-2} y={G} width={14} height={90} fill="url(#fm-redstreak)" />
        </g>
      </g>

      {/* Ground shadow */}
      <ellipse cx={410} cy={G + 1} rx={440} ry={10} fill="url(#fm-shadow)" />
      {WHEELS.map((x) => (
        <ellipse key={x} cx={x} cy={G + 0.5} rx={27} ry={3.2} fill="#000" opacity={0.85} />
      ))}

      {/* Headlight pool on the road (moves with chassis pitch) */}
      <g ref={(el) => (refs.chassis[4] = el)}>
        <ellipse cx={1010} cy={G + 4} rx={220} ry={13} fill="url(#fm-pool)" />
      </g>

      <TruckBody refs={refs} />

      {/* Headlight beam, glow and anamorphic streak (moves with cab) */}
      <g ref={(el) => (refs.chassis[5] = el)} style={{ mixBlendMode: 'screen' }}>
        <g ref={(el) => (refs.cab[1] = el)}>
          <path d="M800 226 L1270 262 L1270 300 L800 240 Z" fill="url(#fm-beam)" />
          <path d="M800 228 L1270 236 L1270 300 L800 238 Z" fill="url(#fm-beam)" opacity={0.35} />
          <circle cx={797} cy={231} r={34} fill="url(#fm-headglow)" opacity={0.85} />
          <rect x={600} y={230} width={400} height={2.2} fill="url(#fm-streak)" opacity={0.55} />
        </g>
      </g>
    </svg>
  );
}
