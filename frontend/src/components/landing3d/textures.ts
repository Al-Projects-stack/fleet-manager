import * as THREE from 'three';

/** All textures are generated on canvases at runtime: no image downloads. */

const FONT = "'Space Grotesk', 'Inter', system-ui, sans-serif";

/** `read`: the canvas gets pixel noise, so keep it CPU-side and the readback is free. */
function canvas(w: number, h: number, read = false) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d', { willReadFrequently: read })!] as const;
}

function tex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

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

function noise(g: CanvasRenderingContext2D, w: number, h: number, amount: number, seed: number) {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  // inlined xorshift32: this loop touches every pixel, so no closure call per pixel
  let x = (seed * 2654435761) | 0 || 1;
  const k = amount / 4294967296;
  for (let i = 0; i < d.length; i += 4) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    const n = x * k; // x is a signed int32, so n spans ±amount/2
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

/**
 * Road tile: 20 m along x (u) by 12 m across z (v). v = 0 is z = -7.6 (far edge),
 * v = 1 is z = +4.4 (near edge). Returns colour map and an alpha map where
 * darker = more transparent = more mirror reflection (puddles, wet tyre tracks).
 */
export function roadTextures() {
  const W = 1024;
  const H = 614;
  const zToV = (z: number) => ((z + 7.6) / 12) * H;
  const [c, g] = canvas(W, H, true);
  g.fillStyle = '#26292e';
  g.fillRect(0, 0, W, H);
  noise(g, W, H, 38, 11);
  const r = rng(5);
  // aggregate speckle: two batched paths instead of 9000 separate fills
  const light = new Path2D();
  const dark = new Path2D();
  for (let i = 0; i < 9000; i++) {
    (r() < 0.5 ? light : dark).rect(r() * W, r() * H, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  g.fillStyle = 'rgba(255,255,255,0.05)';
  g.fill(light);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  g.fill(dark);
  // patched repairs and cracks
  for (let i = 0; i < 4; i++) {
    g.fillStyle = 'rgba(10,11,13,0.35)';
    g.fillRect(r() * W, r() * H, 60 + r() * 120, 30 + r() * 60);
  }
  g.strokeStyle = 'rgba(0,0,0,0.5)';
  g.lineWidth = 1.2;
  for (let i = 0; i < 14; i++) {
    let x = r() * W;
    let y = r() * H;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 8; k++) {
      x += (r() - 0.5) * 40;
      y += (r() - 0.5) * 18;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // tyre polish tracks in each lane
  for (const z of [-2.85, -0.85, 0.85, 2.85]) {
    const v = zToV(z);
    const grd = g.createLinearGradient(0, v - 18, 0, v + 18);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(0.5, 'rgba(0,0,0,0.28)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, v - 18, W, 36);
  }
  // markings
  const line = (z: number, wM: number, dash: boolean) => {
    const v = zToV(z);
    const hpx = (wM / 12) * H;
    g.fillStyle = 'rgba(225,228,232,0.85)';
    if (!dash) g.fillRect(0, v - hpx / 2, W, hpx);
    else {
      for (let x = 0; x < W; x += W / 2) g.fillRect(x + 20, v - hpx / 2, W / 4, hpx);
    }
  };
  line(-7.25, 0.15, false);
  line(-3.7, 0.12, true);
  line(0, 0.15, true);
  line(4.05, 0.15, false);
  noise(g, W, H, 22, 3);

  // alpha (wetness)
  const [a, ga] = canvas(512, 307);
  ga.fillStyle = '#dcdcdc';
  ga.fillRect(0, 0, 512, 307);
  const ra = rng(9);
  for (let i = 0; i < 26; i++) {
    const x = ra() * 512;
    const y = ra() * 307;
    const rx = 12 + ra() * 60;
    const ry = 4 + ra() * 14;
    const grd = ga.createRadialGradient(x, y, 0, x, y, rx);
    grd.addColorStop(0, 'rgba(70,70,70,1)');
    grd.addColorStop(0.7, 'rgba(110,110,110,0.7)');
    grd.addColorStop(1, 'rgba(220,220,220,0)');
    ga.fillStyle = grd;
    ga.save();
    ga.translate(x, y);
    ga.scale(1, ry / rx);
    ga.translate(-x, -y);
    ga.beginPath();
    ga.arc(x, y, rx, 0, Math.PI * 2);
    ga.fill();
    ga.restore();
  }
  for (const z of [-2.85, -0.85, 0.85, 2.85]) {
    const v = ((z + 7.6) / 12) * 307;
    ga.fillStyle = 'rgba(120,120,120,0.55)';
    ga.fillRect(0, v - 6, 512, 12);
  }
  return { map: tex(c), alpha: tex(a, false) };
}

export function sidewalkTexture() {
  const [c, g] = canvas(512, 256, true);
  g.fillStyle = '#3a3e45';
  g.fillRect(0, 0, 512, 256);
  noise(g, 512, 256, 40, 21);
  g.strokeStyle = 'rgba(0,0,0,0.45)';
  g.lineWidth = 2;
  for (let x = 0; x <= 512; x += 64) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 256);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(0, 128);
  g.lineTo(512, 128);
  g.stroke();
  return tex(c);
}

/** Trailer side livery: 13.6 m x 2.75 m. */
export function trailerSideTexture() {
  const W = 2720;
  const H = 550;
  const [c, g] = canvas(W, H);
  // Panel base with faint grain, made on a quarter-width CPU tile and repeated:
  // the grain is too faint to show the repeat, and the big canvas never reads back.
  const TW = W / 4;
  const [b, gb] = canvas(TW, H, true);
  const base = gb.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#f2f4f7');
  base.addColorStop(0.5, '#e3e7ec');
  base.addColorStop(1, '#c9cfd7');
  gb.fillStyle = base;
  gb.fillRect(0, 0, TW, H);
  noise(gb, TW, H, 6, 31);
  for (let x = 0; x < W; x += TW) g.drawImage(b, x, 0);
  // ribs
  for (let x = 40; x < W; x += 80) {
    g.fillStyle = 'rgba(0,0,0,0.07)';
    g.fillRect(x, 14, 3, H - 40);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.fillRect(x + 3, 14, 2, H - 40);
  }
  // swoosh
  const sw = g.createLinearGradient(0, 0, W, 0);
  sw.addColorStop(0, 'rgba(0,240,255,0)');
  sw.addColorStop(0.2, 'rgba(0,224,255,0.95)');
  sw.addColorStop(1, 'rgba(14,165,233,1)');
  g.fillStyle = sw;
  g.beginPath();
  g.moveTo(0, 420);
  g.lineTo(1250, 420);
  g.bezierCurveTo(1800, 420, 2150, 260, W, 40);
  g.lineTo(W, 100);
  g.bezierCurveTo(2200, 320, 1820, 470, 1250, 470);
  g.lineTo(0, 470);
  g.closePath();
  g.fill();
  // brand
  g.fillStyle = '#0c1628';
  g.font = `700 150px ${FONT}`;
  g.textBaseline = 'alphabetic';
  g.fillText('FLEET MANAGER', 110, 300);
  g.font = `600 40px ${FONT}`;
  g.fillStyle = '#1b2a44';
  g.fillText('LIVE TELEMATICS  ·  PREDICTIVE MAINTENANCE  ·  FUEL INTELLIGENCE', 116, 370);
  // badge
  g.fillStyle = '#0c1628';
  g.beginPath();
  g.roundRect(1880, 150, 170, 170, 34);
  g.fill();
  g.fillStyle = '#00f0ff';
  g.font = `700 80px ${FONT}`;
  g.textAlign = 'center';
  g.fillText('FM', 1965, 265);
  g.textAlign = 'left';
  // contour tape
  g.fillStyle = '#f2c200';
  for (let x = 30; x < W - 30; x += 110) g.fillRect(x, H - 24, 70, 12);
  // grime at bottom
  const grime = g.createLinearGradient(0, H - 90, 0, H);
  grime.addColorStop(0, 'rgba(60,50,40,0)');
  grime.addColorStop(1, 'rgba(60,52,44,0.35)');
  g.fillStyle = grime;
  g.fillRect(0, H - 90, W, 90);
  // rails
  g.fillStyle = '#9aa3ae';
  g.fillRect(0, 0, W, 12);
  return tex(c);
}

export function trailerRearTexture() {
  const W = 510;
  const H = 550;
  const [c, g] = canvas(W, H, true);
  g.fillStyle = '#d9dee4';
  g.fillRect(0, 0, W, H);
  noise(g, W, H, 8, 41);
  g.fillStyle = '#7d8793';
  g.fillRect(0, 0, W, 14);
  g.fillRect(0, 0, 14, H);
  g.fillRect(W - 14, 0, 14, H);
  g.fillRect(W / 2 - 3, 0, 6, H);
  // lock rods
  for (const x of [90, 200, 310, 420]) {
    g.fillStyle = '#9aa4ae';
    g.fillRect(x, 20, 9, H - 40);
    g.fillStyle = '#5c6570';
    g.fillRect(x - 6, 300, 22, 36);
  }
  // hinges
  g.fillStyle = '#5c6570';
  for (const y of [50, 190, 340, 480]) {
    g.fillRect(14, y, 26, 22);
    g.fillRect(W - 40, y, 26, 22);
  }
  // contour tape (red / white)
  for (let y = 20; y < H - 20; y += 60) {
    g.fillStyle = '#d7261e';
    g.fillRect(16, y, 10, 30);
    g.fillRect(W - 26, y, 10, 30);
  }
  for (let x = 20; x < W - 20; x += 60) {
    g.fillStyle = '#d7261e';
    g.fillRect(x, H - 26, 30, 10);
  }
  g.fillStyle = '#0c1628';
  g.font = `700 34px ${FONT}`;
  g.textAlign = 'center';
  g.fillText('FLEET MANAGER', W / 2, 120);
  return tex(c);
}

export function cabSideTexture() {
  // Covers x 14.6..17.2 m, y 0.9..3.95 m. 200 px per metre.
  const W = 520;
  const H = 610;
  const [c, g] = canvas(W, H);
  const X = (m: number) => (m - 14.6) * 200;
  const Y = (m: number) => H - (m - 0.9) * 200;
  g.clearRect(0, 0, W, H);
  g.strokeStyle = 'rgba(0,0,0,0.7)';
  g.lineWidth = 2.5;
  // door seam
  g.beginPath();
  g.roundRect(X(15.05), Y(3.36), X(16.6) - X(15.05), Y(1.12) - Y(3.36), 10);
  g.stroke();
  g.strokeStyle = 'rgba(160,190,230,0.18)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(X(15.05) + 2, Y(3.36) + 2, X(16.6) - X(15.05), Y(1.12) - Y(3.36), 10);
  g.stroke();
  // sleeper seam + beltline
  g.strokeStyle = 'rgba(0,0,0,0.6)';
  g.beginPath();
  g.moveTo(X(14.98), Y(3.75));
  g.lineTo(X(14.98), Y(1.05));
  g.moveTo(X(14.62), Y(2.15));
  g.lineTo(X(17.0), Y(2.18));
  g.stroke();
  // handle
  g.fillStyle = '#9aa4b0';
  g.beginPath();
  g.roundRect(X(15.2), Y(2.05), 40, 9, 4);
  g.fill();
  // vents
  g.fillStyle = 'rgba(0,0,0,0.75)';
  for (let i = 0; i < 7; i++) g.fillRect(X(14.66), Y(3.1) + i * 14, 50, 6);
  // cyan accent + monogram
  g.strokeStyle = '#00e8ff';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(X(14.6), Y(1.3));
  g.lineTo(X(17.1), Y(1.4));
  g.stroke();
  g.fillStyle = '#00f0ff';
  g.font = `700 54px ${FONT}`;
  g.fillText('FM', X(15.8), Y(1.55));
  const t = tex(c);
  t.repeat.set(1 / 2.6, 1 / 3.05);
  t.offset.set(-14.6 / 2.6, -0.9 / 3.05);
  return t;
}

export function grilleTexture() {
  const [c, g] = canvas(512, 220);
  g.fillStyle = '#0a0d12';
  g.fillRect(0, 0, 512, 220);
  for (let y = 18; y < 210; y += 22) {
    const grd = g.createLinearGradient(0, y, 0, y + 12);
    grd.addColorStop(0, '#5d6878');
    grd.addColorStop(0.5, '#262d38');
    grd.addColorStop(1, '#0d1117');
    g.fillStyle = grd;
    g.fillRect(14, y, 484, 11);
  }
  g.strokeStyle = '#aab4c0';
  g.lineWidth = 8;
  g.strokeRect(4, 4, 504, 212);
  g.fillStyle = '#0c1628';
  g.beginPath();
  g.roundRect(206, 70, 100, 80, 14);
  g.fill();
  g.fillStyle = '#00f0ff';
  g.font = `700 44px ${FONT}`;
  g.textAlign = 'center';
  g.fillText('FM', 256, 126);
  return tex(c);
}

export function treadTexture() {
  const [c, g] = canvas(1024, 64, true);
  g.fillStyle = '#1b1c1f';
  g.fillRect(0, 0, 1024, 64);
  g.fillStyle = '#0b0b0c';
  for (let x = 0; x < 1024; x += 16) {
    g.fillRect(x, 8, 6, 20);
    g.fillRect(x + 8, 36, 6, 20);
  }
  g.fillRect(0, 29, 1024, 5);
  noise(g, 1024, 64, 14, 51);
  const t = tex(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** Rim face: aluminium disc with hand holes. `blurred` = motion-blurred version. */
export function rimTexture(blurred: boolean) {
  const S = 256;
  const [c, g] = canvas(S, S);
  const cx = S / 2;
  const grd = g.createRadialGradient(cx * 0.8, cx * 0.7, 10, cx, cx, cx);
  grd.addColorStop(0, '#f4f6f8');
  grd.addColorStop(0.55, '#c3cad3');
  grd.addColorStop(0.9, '#8a939f');
  grd.addColorStop(1, '#4e5560');
  g.fillStyle = grd;
  g.beginPath();
  g.arc(cx, cx, cx, 0, Math.PI * 2);
  g.fill();
  if (blurred) {
    g.strokeStyle = 'rgba(40,46,54,0.55)';
    g.lineWidth = 22;
    g.beginPath();
    g.arc(cx, cx, cx * 0.7, 0, Math.PI * 2);
    g.stroke();
  } else {
    g.fillStyle = '#16191e';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      g.save();
      g.translate(cx + Math.cos(a) * cx * 0.7, cx + Math.sin(a) * cx * 0.7);
      g.rotate(a + Math.PI / 2);
      g.beginPath();
      g.ellipse(0, 0, 17, 11, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
  g.strokeStyle = 'rgba(255,255,255,0.5)';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(cx, cx, cx - 3, 0, Math.PI * 2);
  g.stroke();
  return tex(c);
}

export function sidewallTexture() {
  const S = 512;
  const [c, g] = canvas(S, S);
  const cx = S / 2;
  g.fillStyle = '#141518';
  g.fillRect(0, 0, S, S);
  g.strokeStyle = '#1f2125';
  g.lineWidth = 6;
  for (const r of [0.62, 0.95]) {
    g.beginPath();
    g.arc(cx, cx, cx * r, 0, Math.PI * 2);
    g.stroke();
  }
  g.fillStyle = '#2b2d32';
  g.font = `700 26px ${FONT}`;
  g.textAlign = 'center';
  const text = 'FM ROADMASTER  315/80 R22.5  ·  TUBELESS  ·  ';
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i < text.length; i++) {
      const a = (i / text.length) * Math.PI + k * Math.PI;
      g.save();
      g.translate(cx + Math.cos(a) * cx * 0.8, cx + Math.sin(a) * cx * 0.8);
      g.rotate(a + Math.PI / 2);
      g.fillText(text[i], 0, 0);
      g.restore();
    }
  }
  return tex(c);
}

export function skylineTexture() {
  const W = 4096;
  const H = 640;
  const [c, g] = canvas(W, H);
  const r = rng(77);
  g.clearRect(0, 0, W, H);
  let x = 0;
  while (x < W) {
    const w = 60 + r() * 150;
    const h = 120 + Math.pow(r(), 1.5) * 470;
    g.fillStyle = r() < 0.5 ? '#0b1424' : '#0d1729';
    g.fillRect(x, H - h, w, h);
    for (let wy = H - h + 14; wy < H - 10; wy += 16) {
      for (let wx = x + 8; wx < x + w - 8; wx += 12) {
        if (r() < 0.12) {
          g.fillStyle = r() < 0.75 ? `rgba(255,214,140,${0.4 + r() * 0.6})` : `rgba(160,235,255,${0.4 + r() * 0.5})`;
          g.fillRect(wx, wy, 5, 7);
        }
      }
    }
    x += w + r() * 10;
  }
  return tex(c);
}

export function neonTexture(text: string) {
  const [c, g] = canvas(1024, 192);
  g.clearRect(0, 0, 1024, 192);
  g.font = `700 120px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = '#00f0ff';
  g.shadowBlur = 30;
  g.fillStyle = '#9ffbff';
  g.fillText(text, 512, 100);
  g.shadowBlur = 0;
  g.fillStyle = '#e8feff';
  g.fillText(text, 512, 100);
  return tex(c);
}

export function skyTexture() {
  const [c, g] = canvas(16, 512);
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, '#010309');
  grd.addColorStop(0.38, '#050b18');
  grd.addColorStop(0.47, '#0d1d33');
  grd.addColorStop(0.5, '#1b3a55');
  grd.addColorStop(0.53, '#0b1522');
  grd.addColorStop(1, '#05080d');
  g.fillStyle = grd;
  g.fillRect(0, 0, 16, 512);
  return tex(c);
}

export function softSprite() {
  const [c, g] = canvas(64, 64);
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return tex(c);
}

export function ringSprite() {
  const [c, g] = canvas(128, 128);
  g.strokeStyle = 'rgba(0,240,255,1)';
  g.lineWidth = 6;
  g.beginPath();
  g.arc(64, 64, 50, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = 'rgba(0,240,255,1)';
  g.beginPath();
  g.arc(64, 64, 12, 0, Math.PI * 2);
  g.fill();
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,240,255,0.35)');
  grd.addColorStop(1, 'rgba(0,240,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return tex(c);
}

export function doorTexture(lit: boolean) {
  const [c, g] = canvas(128, 128);
  if (lit) {
    const grd = g.createLinearGradient(0, 0, 0, 128);
    grd.addColorStop(0, '#ffd89a');
    grd.addColorStop(1, '#ff9a3c');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  } else {
    g.fillStyle = '#1a2230';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(0,0,0,0.6)';
    for (let y = 8; y < 128; y += 12) g.fillRect(0, y, 128, 3);
  }
  return tex(c);
}
