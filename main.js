/* ═══════════════════════════════════════════
   HAPPY BIRTHDAY, MICHAEL
   Pixel wordmark: text rasterised onto a grid,
   scrolling by, dissolving in from noise.
   ═══════════════════════════════════════════ */

const PALETTE = {
  ink: '#001B1F', red: '#7568DC', blue: '#BAFDC2',
  neon: '#A1F300', yellow: '#00BE93', teal: '#004652'
};

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

const rnd = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

const HOT = ['#00BE93', '#7568DC', '#A1F300'];
const BRUSH = 5;          // wordmark hover brush — unchanged
const STOKE = 0.34;
const DECAY = 0.90;

const GLOW_BRUSH = 2;     // page-wide cursor brush — smaller footprint
const GLOW_STOKE = 0.42;

const WM = {
  cv: null, ctx: null, w: 0, h: 0,
  CELL: 14, cols: 0, rows: 0,
  tcols: 0, phraseCells: 0,
  on: null, colour: null, heat: null,
  mx: -999, my: -999,
  offset: 0, onScreen: false
};

const WM_TEXT = 'HAPPY BIRTHDAY FRANCO • ';

function buildWordmark() {
  const cv = document.getElementById('wordmark');
  if (!cv) return;
  WM.cv = cv;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const r = cv.getBoundingClientRect();
  if (r.width < 2) return;
  cv.width = r.width * dpr; cv.height = r.height * dpr;
  WM.ctx = cv.getContext('2d');
  WM.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  WM.w = r.width; WM.h = r.height;

  WM.CELL = r.width < 700 ? 8 : 14;
  const CELL = WM.CELL;
  const cols = WM.cols = Math.ceil(r.width / CELL);
  const rows = WM.rows = Math.floor(r.height / CELL);

  const S = 4;
  const probe = document.createElement('canvas').getContext('2d');

  let size = 6;
  for (let s = 6; s < rows * S; s++) {
    probe.font = `700 ${s}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    if (s > rows * S * 0.78) break;
    size = s;
  }
  const font = `700 ${size}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  probe.font = font;

  const phraseW = probe.measureText(WM_TEXT).width;
  const phraseCells = WM.phraseCells = Math.max(1, Math.round(phraseW / S));

  const reps = Math.ceil((cols + phraseCells) / phraseCells) + 1;
  const tcols = WM.tcols = phraseCells * reps;
  const n = tcols * rows;

  WM.on = new Uint8Array(n);
  WM.colour = new Array(n);
  WM.heat = new Float32Array(WM.cols * rows);

  const off = document.createElement('canvas');
  off.width = tcols * S; off.height = rows * S;
  const oc = off.getContext('2d');
  oc.fillStyle = '#000';
  oc.textAlign = 'left';
  oc.textBaseline = 'middle';
  oc.font = font;
  for (let k = 0; k < reps; k++) {
    oc.fillText(WM_TEXT, k * phraseCells * S, (rows * S) / 2);
  }

  const px = oc.getImageData(0, 0, tcols * S, rows * S).data;

  for (let c = 0; c < tcols; c++) {
    for (let rw = 0; rw < rows; rw++) {
      const i = c * rows + rw;
      let hit = 0;
      for (let sx = 0; sx < S; sx++) {
        for (let sy = 0; sy < S; sy++) {
          const p = ((rw * S + sy) * tcols * S + (c * S + sx)) * 4 + 3;
          if (px[p] > 110) hit++;
        }
      }
      WM.on[i] = hit / (S * S) > 0.38 ? 1 : 0;

      const t = (c % phraseCells) / phraseCells;
      const h = rnd(c * 2.7, rw * 4.3);
      if (t < 0.3)       WM.colour[i] = h > 0.72 ? PALETTE.yellow : PALETTE.red;
      else if (t < 0.55) WM.colour[i] = h > 0.68 ? PALETTE.neon : PALETTE.yellow;
      else if (t < 0.8)  WM.colour[i] = h > 0.75 ? PALETTE.blue : PALETTE.yellow;
      else               WM.colour[i] = h > 0.7  ? PALETTE.ink : PALETTE.yellow;
    }
  }
}

/* No page scroll to drive this, so it scrolls itself, a few cells a beat. */
function paintWordmark() {
  if (!WM.ctx) return;
  const { ctx, cols, rows, CELL, tcols } = WM;
  ctx.clearRect(0, 0, WM.w, WM.h);

  for (let c = 0; c < cols; c++) {
    const tc = ((c + WM.offset) % tcols + tcols) % tcols;

    for (let rw = 0; rw < rows; rw++) {
      const src = tc * rows + rw;
      const heat = WM.heat[c * rows + rw];
      let colour = null;

      if (WM.on[src]) {
        colour = heat > 0.12 ? HOT[heat > 0.6 ? 2 : heat > 0.3 ? 1 : 0] : WM.colour[src];
      } else if (heat > 0.25) {
        colour = HOT[heat > 0.62 ? 2 : 0];
      }

      if (!colour) continue;
      ctx.fillStyle = colour;
      ctx.fillRect(c * CELL, rw * CELL, CELL - 1, CELL - 1);
    }
  }

  for (let i = 0; i < WM.heat.length; i++) {
    if (WM.heat[i] > 0.002) WM.heat[i] *= DECAY; else WM.heat[i] = 0;
  }
}

function stokeWordmark() {
  if (WM.mx < 0 || !WM.heat) return;
  const cx = WM.mx / WM.CELL, cy = WM.my / WM.CELL;
  const c0 = Math.max(0, Math.floor(cx - BRUSH)), c1 = Math.min(WM.cols - 1, Math.ceil(cx + BRUSH));
  const r0 = Math.max(0, Math.floor(cy - BRUSH)), r1 = Math.min(WM.rows - 1, Math.ceil(cy + BRUSH));
  for (let c = c0; c <= c1; c++) {
    for (let rw = r0; rw <= r1; rw++) {
      const d = Math.hypot(c - cx, rw - cy);
      if (d > BRUSH) continue;
      const i = c * WM.rows + rw;
      WM.heat[i] = Math.min(1, WM.heat[i] + (1 - d / BRUSH) ** 2 * STOKE);
    }
  }
}

function startWordmark() {
  buildWordmark();
  if (!WM.cv) return;

  paintWordmark();
  if (REDUCED) return;

  addEventListener('pointermove', e => {
    const r = WM.cv.getBoundingClientRect();
    WM.mx = e.clientX - r.left;
    WM.my = e.clientY - r.top;
    if (WM.mx < -40 || WM.my < -40 || WM.mx > r.width + 40 || WM.my > r.height + 40) WM.mx = -999;
  }, { passive: true });

  new IntersectionObserver(([e]) => { WM.onScreen = e.isIntersecting; },
    { threshold: 0 }).observe(WM.cv);
  WM.onScreen = true;

  setInterval(() => {
    if (!WM.onScreen || !WM.phraseCells) return;
    WM.offset = (WM.offset + 1) % WM.tcols;
    stokeWordmark();
    paintWordmark();
  }, 60);
}

startWordmark();

/* ═══════════ CONFETTI ═══════════ */
/* Scattered along the hero's edges so nothing ever lands on the copy —
   random each load, rather than fixed spots. */
const CONFETTI_COLOURS = [PALETTE.yellow, PALETTE.red, PALETTE.neon, PALETTE.blue, PALETTE.teal, PALETTE.ink];
const CONFETTI_COUNT = 6;

function initConfetti() {
  const hero = document.getElementById('hero');
  if (!hero) return;

  for (let i = 0; i < CONFETTI_COUNT; i++) {
    const span = document.createElement('span');
    span.className = 'confetti';
    const x = Math.random() < 0.5 ? 2 + Math.random() * 3 : 95 + Math.random() * 3;
    const y = 5 + Math.random() * 90;
    const c = CONFETTI_COLOURS[(Math.random() * CONFETTI_COLOURS.length) | 0];
    const d = (Math.random() * 1).toFixed(2);
    span.style.setProperty('--x', `${x.toFixed(1)}%`);
    span.style.setProperty('--y', `${y.toFixed(1)}%`);
    span.style.setProperty('--c', c);
    span.style.setProperty('--d', `${d}s`);
    hero.appendChild(span);
  }
}

initConfetti();

let rt;
addEventListener('resize', () => {
  clearTimeout(rt);
  rt = setTimeout(buildWordmark, 150);
}, { passive: true });

/* ═══════════ CURSOR: THE GLOW FIELD ═══════════ */
/* Exactly the wordmark's heat brush below, run full-page: a grid of cells,
   invisible until the cursor's brush warms them, cooling back to nothing
   a moment later. This IS the cursor — the native pointer is hidden. */
const GLOW = {
  cv: null, ctx: null, w: 0, h: 0,
  CELL: 14, cols: 0, rows: 0,
  heat: null,
  mx: -999, my: -999, onScreen: true
};

function buildGlow() {
  const cv = GLOW.cv;
  if (!cv) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = innerWidth, h = innerHeight;
  cv.width = w * dpr; cv.height = h * dpr;
  GLOW.ctx = cv.getContext('2d');
  GLOW.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  GLOW.w = w; GLOW.h = h;

  GLOW.CELL = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell')) || 14;
  GLOW.cols = Math.ceil(w / GLOW.CELL);
  GLOW.rows = Math.ceil(h / GLOW.CELL);
  GLOW.heat = new Float32Array(GLOW.cols * GLOW.rows);
}

function stokeGlow() {
  if (GLOW.mx < 0 || !GLOW.heat) return;
  const { CELL, cols, rows, heat } = GLOW;
  const cx = GLOW.mx / CELL, cy = GLOW.my / CELL;
  const c0 = Math.max(0, Math.floor(cx - GLOW_BRUSH)), c1 = Math.min(cols - 1, Math.ceil(cx + GLOW_BRUSH));
  const r0 = Math.max(0, Math.floor(cy - GLOW_BRUSH)), r1 = Math.min(rows - 1, Math.ceil(cy + GLOW_BRUSH));
  for (let c = c0; c <= c1; c++) {
    for (let rw = r0; rw <= r1; rw++) {
      const d = Math.hypot(c - cx, rw - cy);
      if (d > GLOW_BRUSH) continue;
      const i = rw * cols + c;
      heat[i] = Math.min(1, heat[i] + (1 - d / GLOW_BRUSH) ** 2 * GLOW_STOKE);
    }
  }
}

/* Same rendering rule as the wordmark's hot cells: flat, opaque colour
   swapped in hard steps across the HOT ramp — no soft alpha fade — so the
   two pixel effects read as one system. */
function paintGlow() {
  const { ctx, cols, rows, CELL, heat } = GLOW;
  if (!ctx) return;
  ctx.clearRect(0, 0, GLOW.w, GLOW.h);

  for (let rw = 0; rw < rows; rw++) {
    for (let c = 0; c < cols; c++) {
      const h = heat[rw * cols + c];
      if (h <= 0.12) continue;
      ctx.fillStyle = HOT[h > 0.6 ? 2 : h > 0.3 ? 1 : 0];
      ctx.fillRect(c * CELL, rw * CELL, CELL - 1, CELL - 1);
    }
  }

  for (let i = 0; i < heat.length; i++) {
    if (heat[i] > 0.002) heat[i] *= DECAY; else heat[i] = 0;
  }
}

function initGlow() {
  const cv = document.getElementById('glow');
  if (!cv || !matchMedia('(pointer: fine)').matches) return;
  GLOW.cv = cv;
  buildGlow();
  if (REDUCED) return;

  document.documentElement.classList.add('has-glow');

  addEventListener('pointermove', e => {
    GLOW.mx = e.clientX; GLOW.my = e.clientY;
  }, { passive: true });

  document.addEventListener('mouseleave', () => { GLOW.mx = -999; });

  document.addEventListener('visibilitychange', () => { GLOW.onScreen = !document.hidden; });

  setInterval(() => {
    if (!GLOW.onScreen) return;
    stokeGlow();
    paintGlow();
  }, 33);

  let rt2;
  addEventListener('resize', () => {
    clearTimeout(rt2);
    rt2 = setTimeout(buildGlow, 150);
  }, { passive: true });
}

initGlow();

/* ═══════════ MUSIC ═══════════ */
/* Browsers won't let audio play until there's been a real user gesture on
   the page — so the first tap, click or keypress anywhere kicks it off
   instead of a dedicated button. */
function initMusic() {
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    if (window.ytPlayer && window.ytPlayer.playVideo) window.ytPlayer.playVideo();
    else window.__wantsPlay = true;
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.removeEventListener(ev, start));
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, start, { passive: true }));
}

initMusic();
