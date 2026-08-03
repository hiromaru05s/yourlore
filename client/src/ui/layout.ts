// ============================================================
// LORE — in-game FIT-TO-VIEWPORT layout solver.
//
// The board is a fixed set of rows (portrait / field / market / field /
// hand). Pure CSS clamps sized off ONE axis collapse the moment the window
// takes an awkward aspect ratio (tall-narrow, short-wide, split-screen), so
// the sizing is solved here from BOTH axes and written back as CSS vars.
//
// Everything downstream (cards, slots, piles, market) is expressed in terms
// of these vars, so one solve keeps the whole board consistent.
// ============================================================

const clamp = (lo: number, v: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export interface BoardMetrics {
  cardH: number;      // --card-h        (hand/zoom reference card height)
  mktH: number;       // --card-h-mkt
  handH: number;      // --card-h-hand
  tile: number;       // --field-card-size (square field tile)
  gap: number;        // --slot-gap
  portrait: number;   // --pt
  railW: number;      // --rail-w  (right gutter reserved for the side rail)
  logW: number;       // --loggutter-w (left gutter reserved for the log tab)
  compact: boolean;   // narrow layout (icon-only rail, tucked chrome)
  tiny: boolean;      // very small viewport — drop non-essential chrome
  flatMkt: boolean;   // short + wide → market collapses to ONE row (8 | 4)
  capH: number;       // hard ceiling on cardH imposed by the WIDTH budget
  capMkt: number;     // hard ceiling on mktH imposed by the WIDTH budget
}

/** Solve the board sizing for the current viewport. */
export function solveBoard(w: number, h: number): BoardMetrics {
  const portraitPhone = w < 620 && h > w;
  const compact = w < 1000;
  const tiny = w < 560 || h < 480;
  // A short window can't afford six card rows. When it's also wide enough, the
  // market flattens to a single row (8 fixed | 4 supply) and buys back ~40% of
  // the vertical budget — the difference between 22px and 37px field tiles.
  const flatMkt = h < 660 && w >= 780;

  // reserved gutters: the side rail (right) and the log tab (left) must never
  // sit ON TOP of the board — the board width is what's left between them.
  const railW = w < 620 ? 40 : w < 760 ? 52 : w < 1000 ? 80 : w < 1280 ? 116 : 152;
  const logW = w < 700 ? 16 : 26;

  const gap = h < 620 || w < 700 ? 3 : w < 1100 ? 4 : 6;
  const portrait = clamp(34, Math.min(h * 0.062, w * 0.09), 60);

  // ---- vertical budget -------------------------------------------------
  const topbarH = h < 560 ? 30 : h < 720 ? 36 : 42;
  const clusterOpp = portrait + (tiny ? 16 : 24);
  const clusterMe = portrait + (tiny ? 14 : 22);
  const mktHead = tiny ? 18 : 24;
  const rowGaps = gap * 4 + 10;
  const pad = 12;

  const availV = h - topbarH - clusterOpp - clusterMe - mktHead - rowGaps - pad;
  // rows: 2 sides × (2 field tiles + gap) + the market rows
  //   = 4 × 0.64·cardH + 2 gaps  +  (1 or 2) × 0.9·cardH
  const mktRows = flatMkt ? 0.9 : 1.8;
  let cardH = (availV - gap * 3) / (2.56 + mktRows);

  // ---- horizontal budget -----------------------------------------------
  const availH = w - railW - logW - 14;
  // field row: 7 tiles + 6 gaps + the pile column (묘지+덱 = 2 tiles wide, 1 gap) + margin + block padding
  const fieldCap = (availH - gap * 7 - 34) / (9 * 0.64 + 0.4);
  cardH = Math.min(cardH, fieldCap);
  cardH = clamp(portraitPhone ? 50 : 44, cardH, 150);

  // market columns: 4 + 2 stacked (normal) or 8 + 4 in one line (flat).
  // solved separately so a wide-but-short window doesn't starve the field.
  const mktCols = flatMkt ? 12 : 6;
  const mktCap = (availH - (mktCols - 1) * gap - 52) / (mktCols * 0.64);
  const mktH = clamp(tiny ? 38 : 46, Math.min(cardH * 0.9, mktCap), 150);

  const handH = clamp(tiny ? 58 : 70, Math.min(cardH * 1.3, h * 0.19), 176);

  return {
    cardH: Math.round(cardH),
    mktH: Math.round(mktH),
    handH: Math.round(handH),
    tile: Math.round(cardH * 0.64),
    gap,
    portrait: Math.round(portrait),
    railW,
    logW,
    compact,
    tiny,
    flatMkt,
    capH: Math.max(44, Math.floor(fieldCap)),
    capMkt: Math.max(46, Math.floor(mktCap)),
  };
}

/** Scale the three card sizes by `r`, respecting the width ceilings. */
function scaled(m: BoardMetrics, r: number): BoardMetrics {
  const cardH = clamp(m.tiny ? 34 : 40, Math.round(m.cardH * r), Math.min(150, m.capH));
  const mktH = clamp(m.tiny ? 34 : 42, Math.round(m.mktH * r), Math.min(150, m.capMkt));
  const handH = clamp(m.tiny ? 52 : 62, Math.round(m.handH * r), 176);
  return { ...m, cardH, mktH, handH, tile: Math.round(cardH * 0.64) };
}

function apply(m: BoardMetrics): void {
  const r = document.documentElement;
  const s = r.style;
  s.setProperty("--card-h", `${m.cardH}px`);
  s.setProperty("--card-h-mkt", `${m.mktH}px`);
  s.setProperty("--card-h-hand", `${m.handH}px`);
  s.setProperty("--field-card-size", `${m.tile}px`);
  s.setProperty("--slot-gap", `${m.gap}px`);
  s.setProperty("--pt", `${m.portrait}px`);
  s.setProperty("--rail-w", `${m.railW}px`);
  s.setProperty("--log-w", `${m.logW}px`);
  r.classList.toggle("board-compact", m.compact);
  r.classList.toggle("board-tiny", m.tiny);
  r.classList.toggle("board-flatmkt", m.flatMkt);
}

function clear(): void {
  const s = document.documentElement.style;
  for (const p of ["--card-h", "--card-h-mkt", "--card-h-hand", "--field-card-size", "--slot-gap", "--pt", "--rail-w", "--log-w"]) s.removeProperty(p);
  document.documentElement.classList.remove("board-compact", "board-tiny", "board-flatmkt");
}

/**
 * Start solving on every viewport change. Returns a teardown that restores
 * the pure-CSS defaults (so non-game screens are untouched).
 */
export function startBoardLayout(): () => void {
  let raf = 0;

  /** Height the five board rows actually want, measured (not guessed). */
  const need = (col: HTMLElement, gap: number): number => {
    const rows = Array.from(col.children) as HTMLElement[];
    if (!rows.length) return 0;
    let s = gap * (rows.length - 1);
    for (const r of rows) s += r.getBoundingClientRect().height;
    return s;
  };

  const run = (): void => {
    raf = 0;
    const vv = window.visualViewport;
    // visualViewport tracks the mobile URL bar / on-screen keyboard; fall back
    // to innerWidth/Height where it's missing.
    const w = Math.round(vv?.width ?? window.innerWidth);
    const h = Math.round(vv?.height ?? window.innerHeight);
    if (w < 200 || h < 200) return;

    let m = solveBoard(w, h);
    apply(m);

    // ---- measure & correct ------------------------------------------------
    // Panel padding, borders, label heights and font metrics can't be modelled
    // from the outside, and a 20px miss is the difference between a snug board
    // and a hand clipped off the bottom edge. So: apply, MEASURE, converge.
    const stage = document.querySelector(".stage") as HTMLElement | null;
    const col = document.querySelector(".board-col") as HTMLElement | null;
    if (!stage || !col) return;
    // SAFE = a few px of slack; absolutely-positioned decorations (name plates,
    // HP strips, count badges) hang outside their row box and aren't measured.
    const SAFE = 8;
    // phase 1 — GROW into leftover height (tall/narrow windows), capped by width
    for (let i = 0; i < 6; i++) {
      const avail = stage.clientHeight, want = need(col, m.gap);
      if (!avail || !want || avail - want <= 26 + SAFE) break;
      if (m.cardH >= m.capH && m.mktH >= m.capMkt) break;
      const next = scaled(m, Math.min(1.1, (avail - 14 - SAFE) / want));
      if (next.cardH === m.cardH && next.mktH === m.mktH) break;
      m = next; apply(m);
    }
    // phase 2 — SHRINK until it genuinely fits (monotone, so it always settles)
    for (let i = 0; i < 10; i++) {
      const avail = stage.clientHeight, want = need(col, m.gap);
      if (!avail || !want || want + SAFE <= avail) break;
      const next = scaled(m, Math.max(0.72, (avail - SAFE) / want));
      if (next.cardH === m.cardH && next.mktH === m.mktH) break;
      m = next; apply(m);
    }
  };
  const schedule = (): void => { if (!raf) raf = requestAnimationFrame(run); };
  run();
  // settle passes: the board is still growing when we first measure (webfonts,
  // card art, the first render's labels), and each of those changes row heights.
  const timers = [0, 60, 250, 800, 2000].map((ms) => window.setTimeout(run, ms));
  window.addEventListener("resize", schedule);
  window.addEventListener("orientationchange", schedule);
  window.visualViewport?.addEventListener("resize", schedule);
  document.fonts?.ready?.then(run).catch(() => { /* ignore */ });
  return () => {
    if (raf) cancelAnimationFrame(raf);
    for (const t of timers) clearTimeout(t);
    window.removeEventListener("resize", schedule);
    window.removeEventListener("orientationchange", schedule);
    window.visualViewport?.removeEventListener("resize", schedule);
    clear();
  };
}
