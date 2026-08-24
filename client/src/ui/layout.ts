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
  stackMkt: boolean;  // tall portrait → market stacks 4-wide over three rows
  underPile: boolean; // narrow board → 덱/묘지 drop under the zones, END TURN under my field
  phone: boolean;     // portrait phone/tablet → market stacks 4-wide, hand is always open
  capH: number;       // hard ceiling on cardH imposed by the WIDTH budget
  capMkt: number;     // hard ceiling on mktH imposed by the WIDTH budget
}

/** Solve the board sizing for the current viewport. */
export function solveBoard(w: number, h: number, underPile: boolean): BoardMetrics {
  const compact = w < 1000;
  const tiny = w < 560 || h < 480;
  // A short window can't afford six card rows. When it's also wide enough, the
  // market flattens to a single row (8 fixed | 4 supply) and buys back ~40% of
  // the vertical budget — the difference between 22px and 37px field tiles.
  const flatMkt = h < 660 && w >= 780;
  // MUST match the CSS portrait-PHONE media query (max-width: 700px). Wider
  // portrait tablets stay on the desktop regime: there the field is height-
  // bound, not width-bound, so handing rows to the market/hand only shrinks
  // the battlefield (768×1024 lost 25% of its tile size before this bound).
  const phone = h > w && w <= 700 && !flatMkt;
  const portraitPhone = phone;
  // The 4-wide stacked market costs 2.7 card rows. That's a bargain on a tall
  // phone and a disaster on a short one (it halved the field tiles), so below
  // 700px tall the market keeps the compact 6-col two-row form. The CSS query
  // gating .market's column direction carries the SAME min-height.
  // Portrait TABLETS get the stacked market too: with the 묘지+덱 pile column
  // the field is width-bound there as well, so extra market rows cost the
  // battlefield nothing and soak up height that was otherwise dead air.
  const stackMkt = h > w && w <= 860 && h >= 700 && !flatMkt;

  // reserved gutters: the side rail (right) and the log tab (left) must never
  // sit ON TOP of the board — the board width is what's left between them.
  // On phones the rail chips move beside each player, so the gutter goes away
  // and every reclaimed pixel widens the battlefield.
  const railW = phone ? 8 : w < 620 ? 40 : w < 760 ? 48 : w < 1000 ? 72 : w < 1280 ? 100 : 130;
  const logW = phone ? 12 : w < 700 ? 16 : 26;

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
  const mktRows = flatMkt ? 0.9 : stackMkt ? 2.7 : 1.8;
  // the always-open phone hand is a real row; on short phones it gets a
  // smaller share so the battlefield keeps priority (the user's call).
  const handRows = phone ? (h < 720 ? 1.0 : 1.35) : 0;

  // ---- horizontal budget -----------------------------------------------
  const availH = w - railW - logW - 14;

  // The deck/graveyard piles either stand BESIDE the zones (costing two tiles of
  // field WIDTH) or sit UNDER them (costing a tile of HEIGHT per side plus the
  // END TURN row that moves down with them). Which wins depends on the binding
  // axis, so the CALLER solves both arrangements, measures each, and keeps the
  // one that actually yields a bigger battlefield — the analytic model alone
  // mis-picked (it under-counts the stacked rows by ~20% on a 768x1024 tablet).
  const endRow = underPile ? 40 : 0;
  const byH = (availV - gap * 3 - endRow) / (2.56 + mktRows + handRows + (underPile ? 1.28 : 0));
  const byW = underPile
    ? (availH - gap * 6 - 30) / (7 * 0.64)                    // 7 tiles only
    : (availH - gap * 7 - 34) / (9 * 0.64 + 0.4);             // 7 tiles + pile column

  let cardH = clamp(portraitPhone ? 50 : 44, Math.min(byH, byW), 150);
  const fieldCap = byW;

  // market columns: 4 + 2 side by side (desktop), 8 + 4 in one line (flat),
  // or 4 wide stacked in three rows (phone). Solved separately so a
  // wide-but-short window doesn't starve the field.
  const mktCols = flatMkt ? 12 : stackMkt ? 4 : 6;
  // On compact layouts the timer + END TURN aside shares the market's row and
  // eats real width — leaving it out of the budget pushed the 4th market
  // column past the panel edge on a 390px phone.
  // the aside beside the market holds the clock, and END TURN too until the
  // board narrows enough to move it under my field.
  const asideW = !compact ? 0 : underPile ? 58 : Math.round(clamp(70, w * 0.2, 116)) + 12;
  // the market is CENTRED on screen with the aside beside it, so it must leave
  // room for the aside on BOTH sides — budgeting one side pushed it off-centre.
  const mktCap = (availH - asideW * 2 - (mktCols - 1) * gap - (stackMkt ? 26 : 52)) / (mktCols * 0.64);
  // on phones the market is NOT tied to the (width-bound) field tile — letting
  // it grow past 0.9·cardH is what fills the height the field can't use.
  // Start CONSERVATIVE and let the (revert-guarded) grow pass push these up.
  // Over-allocating here forces the shrink pass to claw height back out of the
  // battlefield — 768x1024 lost 13% of its tile size that way.
  // The ceiling is higher in the stacked regime: there the market is the thing
  // that turns leftover height into readable cards.
  const mktH = clamp(tiny ? 38 : 46, Math.min(stackMkt ? cardH * 1.15 : cardH * 1.0, mktCap), stackMkt ? 190 : 150);

  const handH = clamp(tiny ? 58 : 70, Math.min(cardH * (phone ? 1.6 : 1.3), h * (phone ? (h < 720 ? 0.155 : 0.22) : 0.19)), phone ? 220 : 176);

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
    stackMkt,
    underPile,
    phone,
    capH: Math.max(44, Math.floor(fieldCap)),
    capMkt: Math.max(46, Math.floor(mktCap)),
  };
}

/** Scale the three card sizes by `r`, respecting the width ceilings. */
function scaled(m: BoardMetrics, r: number): BoardMetrics {
  const cardH = clamp(m.tiny ? 34 : 40, Math.round(m.cardH * r), Math.min(150, m.capH));
  const mktH = clamp(m.tiny ? 34 : 42, Math.round(m.mktH * r), Math.min(m.stackMkt ? 190 : 150, m.capMkt));
  const handH = clamp(m.tiny ? 52 : 62, Math.round(m.handH * r), m.phone ? 220 : 176);
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
  r.classList.toggle("board-phone", m.phone);
  r.classList.toggle("board-underpile", m.underPile);
  // the END TURN button has to be REPARENTED for the under-pile arrangement and
  // CSS can't do that — tell the board view which arrangement won.
  window.dispatchEvent(new CustomEvent("lore:layout", { detail: m }));
}

function clear(): void {
  const s = document.documentElement.style;
  for (const p of ["--card-h", "--card-h-mkt", "--card-h-hand", "--field-card-size", "--slot-gap", "--pt", "--rail-w", "--log-w"]) s.removeProperty(p);
  document.documentElement.classList.remove("board-compact", "board-tiny", "board-flatmkt", "board-phone", "board-underpile");
}

/**
 * Start solving on every viewport change. Returns a teardown that restores
 * the pure-CSS defaults (so non-game screens are untouched).
 */
export function startBoardLayout(): () => void {
  let raf = 0;
  let torn = false; // fonts.ready can resolve AFTER teardown — don't re-stamp vars then

  /** Height the five board rows actually want, measured (not guessed). */
  const need = (col: HTMLElement, gap: number): number => {
    const rows = Array.from(col.children) as HTMLElement[];
    if (!rows.length) return 0;
    let s = gap * (rows.length - 1);
    for (const r of rows) s += r.getBoundingClientRect().height;
    return s;
  };

  const SAFE = 8;

  /** Apply `m`, then grow/shrink against MEASURED row heights until it fits. */
  const fitOnce = (m0: BoardMetrics, stage: HTMLElement, col: HTMLElement): BoardMetrics => {
    let m = m0;
    apply(m);
    // phase 1 — GROW into leftover height, capped by width. Steps are small and
    // each is REVERTED if it overshoots, so the shrink pass below never has to
    // claw height back out of the battlefield.
    for (let i = 0; i < 10; i++) {
      const avail = stage.clientHeight, want = need(col, m.gap);
      if (!avail || !want || avail - want <= 26 + SAFE) break;
      if (m.cardH >= m.capH && m.mktH >= m.capMkt && m.handH >= (m.phone ? 220 : 176)) break;
      const prev = m;
      const next = scaled(m, Math.min(1.06, (avail - 14 - SAFE) / want));
      if (next.cardH === prev.cardH && next.mktH === prev.mktH && next.handH === prev.handH) break;
      m = next; apply(m);
      if (need(col, m.gap) + SAFE > stage.clientHeight) { m = prev; apply(m); break; }
    }
    // phase 1.5 — FIELD FIRST. The battlefield is what the player reads and taps,
    // so while it sits below its WIDTH ceiling — leftover margins beside the two
    // 7-slot rows mean the field was height-starved, exactly what the user
    // reported — buy tiles back by giving height up from the market and hand.
    // One tile step costs ~4x its own height (two zone rows + a pile row per
    // side), so the payment has to be taken repeatedly until it fits; a single
    // fixed deduction never covered a step and the trade silently no-opped.
    // Floors are proportional to cardH, so the trade self-limits rather than
    // grinding the market down to nothing.
    for (let i = 0; i < 12; i++) {
      if (m.cardH >= m.capH) break;
      const prev = m;
      const step = Math.min(4, m.capH - m.cardH);
      let cand: BoardMetrics = { ...m, cardH: m.cardH + step, tile: Math.round((m.cardH + step) * 0.64) };
      apply(cand);
      let fits = need(col, cand.gap) + SAFE <= stage.clientHeight;
      for (let j = 0; j < 8 && !fits; j++) {
        const mktFloor = Math.max(cand.tiny ? 42 : 46, Math.round(cand.cardH * 0.78));
        const handFloor = Math.max(cand.tiny ? 56 : 62, Math.round(cand.cardH * 1.15));
        if (cand.mktH <= mktFloor && cand.handH <= handFloor) break;
        cand = {
          ...cand,
          mktH: Math.max(mktFloor, cand.mktH - 3),
          handH: Math.max(handFloor, cand.handH - 3),
        };
        apply(cand);
        fits = need(col, cand.gap) + SAFE <= stage.clientHeight;
      }
      if (!fits) { m = prev; apply(m); break; }
      m = cand;
    }
    // phase 2 — SHRINK until it genuinely fits. The battlefield is paid for
    // LAST: the market and the hand give up height down to floors that track
    // cardH, and only when those bottom out does the field itself scale. The
    // old proportional shrink pulled the field straight back off its width
    // ceiling — which is why 7-slot rows sat in the middle of empty margins.
    for (let i = 0; i < 22; i++) {
      const avail = stage.clientHeight, want = need(col, m.gap);
      if (!avail || !want || want + SAFE <= avail) break;
      const mktFloor = Math.max(m.tiny ? 42 : 46, Math.round(m.cardH * 0.78));
      const handFloor = Math.max(m.tiny ? 56 : 62, Math.round(m.cardH * 1.15));
      if (m.mktH > mktFloor || m.handH > handFloor) {
        m = { ...m, mktH: Math.max(mktFloor, m.mktH - 5), handH: Math.max(handFloor, m.handH - 5) };
        apply(m);
        continue;
      }
      const next = scaled(m, Math.max(0.8, (avail - SAFE) / want));
      if (next.cardH === m.cardH && next.mktH === m.mktH) break;
      m = next; apply(m);
    }
    return m;
  };

  const run = (): void => {
    raf = 0;
    if (torn) return;
    const vv = window.visualViewport;
    // visualViewport tracks the mobile URL bar / on-screen keyboard; fall back
    // to innerWidth/Height where it's missing.
    const w = Math.round(vv?.width ?? window.innerWidth);
    const h = Math.round(vv?.height ?? window.innerHeight);
    if (w < 200 || h < 200) return;

    const stage = document.querySelector(".stage") as HTMLElement | null;
    const col = document.querySelector(".board-col") as HTMLElement | null;
    if (!stage || !col) { apply(solveBoard(w, h, false)); return; }

    // Try BOTH pile arrangements for real and keep the bigger battlefield.
    const beside = fitOnce(solveBoard(w, h, false), stage, col);
    const under = fitOnce(solveBoard(w, h, true), stage, col);
    const best = under.cardH > beside.cardH || (under.cardH === beside.cardH && under.phone)
      ? under : beside;
    apply(best);
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
    torn = true;
    if (raf) cancelAnimationFrame(raf);
    for (const t of timers) clearTimeout(t);
    window.removeEventListener("resize", schedule);
    window.removeEventListener("orientationchange", schedule);
    window.visualViewport?.removeEventListener("resize", schedule);
    clear();
  };
}
