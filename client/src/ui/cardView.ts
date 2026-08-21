// ============================================================
// LORE — card DOM builder. One renderer for every card everywhere
// (board / market / hand / pile / zoom) so sizing stays consistent.
// ============================================================
import type { CardInst, FieldMon, PlayerState } from "../shared/types";
import { FRAME_BACK, frameFor, fieldFrameFor, PASSIVES, cardPassives } from "../shared/cards";
import { curHp, effAtk, effDef, playCost } from "../shared/engine";
import { cardName, cardText, getLang, t } from "../i18n";
import { parseDiceTable } from "../shared/cardText";

/**
 * 카드 효과 텍스트 안의 패시브 키워드명을 <span class="psv" data-psv="key">로 감싼다.
 * 그 카드가 실제로 가진 패시브의 이름만 래핑 — 다른 문장 속 우연한 일치는 건드리지 않는다.
 * (줌 화면에서 hover 시 우측 패시브 설명 패널이 하이라이트된다)
 */
/** 【발동조건 태그】 → 강조 칩. 표기 규칙: docs/card-text-style.md (shared/cardText.ts) */
export function decorateTags(txt: string): string {
  return txt.replace(/【([^】]{1,24})】/g, '<span class="fx-tag">$1</span>');
}

export function decoratePassives(c: CardInst, txt: string): string {
  const keys = cardPassives(c);
  if (!keys.length) return txt;
  const lang = getLang();
  for (const k of keys) {
    const p = PASSIVES[k];
    if (!p) continue;
    const name = lang === "ja" ? p.ja.name : lang === "en" ? p.en.name : p.ko.name;
    if (!name || !txt.includes(name)) continue;
    txt = txt.split(name).join(`<span class="psv" data-psv="${k}">${name}</span>`);
  }
  return txt;
}

export interface CardOpts {
  size?: "board" | "mkt" | "hand";
  fullArt?: boolean; // zoom overlay: load the full-resolution art (default: 384px thumb)
  /** Gallery grids (card list / deck pool / pickers) render hundreds of cards —
   *  those defer their art. Screens with a bounded, all-visible set (board,
   *  hand, market, zoom) must NOT: see artEl().
   *  Pass the card's index instead of `true` and the first screenful stays
   *  eager — those cards are what the player is looking at right now, and
   *  deferring them is the whole "the art shows up a second later" complaint. */
  lazyArt?: boolean | number;
  field?: boolean;
  compactField?: boolean;
  owner?: PlayerState;
  playable?: boolean;
  buyable?: boolean;
  dim?: boolean;
  attacker?: boolean;
  targetable?: boolean;
  exhausted?: boolean;
  costOverride?: number;
  badge?: string;
  hpNow?: number; // 확대(줌)용 — 필드 몬스터의 현재 체력 (hpMax와 함께 넘기면 "현재/최대"로 표시)
  hpMax?: number;
}

function el(tag: string, cls?: string, html?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

/**
 * 실측 자동 축소: 요소가 DOM에 붙은 뒤 내용이 박스를 넘치면 폰트를 줄여 항상
 * 프레임 안에 들어가게 한다. 카드가 손패/마켓/줌 어느 크기로 렌더되든 em 기반이라
 * 같은 비율로 동작 — "효과 텍스트가 프레임을 벗어나는" 문제의 근본 해결.
 * (CSS 클래스 버킷(--small/--tiny)은 1차 근사로 유지, 이 함수가 최종 보정)
 *
 * ⚠ scrollWidth/scrollHeight로는 못 잰다: .card-name/.card-eff는 내용을 flex로
 * 가운데 정렬하므로 넘친 내용이 위/아래(좌/우)로 "반씩" 삐져나가는데, scroll*는
 * 시작 모서리 방향 넘침을 세지 않는다 → 절반만 보고 "맞았다"고 판단해 글자가
 * 잘린 채로 남았다(마켓 카드에서 카드명·효과문 상단이 잘리던 원인).
 * 그래서 Range + 자식 rect의 합집합으로 내용의 실제 바운딩 박스를 잰다.
 */
// One reused Range: creating one per measurement was itself measurable when a
// gallery measures hundreds of boxes in a single pass.
const measureRange = document.createRange();

function contentSize(box: HTMLElement): { w: number; h: number } {
  let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity;
  const push = (r: DOMRect): void => {
    if (!r.width && !r.height) return;
    top = Math.min(top, r.top); bottom = Math.max(bottom, r.bottom);
    left = Math.min(left, r.left); right = Math.max(right, r.right);
  };
  measureRange.selectNodeContents(box);
  push(measureRange.getBoundingClientRect());
  for (const c of Array.from(box.children)) push((c as HTMLElement).getBoundingClientRect());
  if (top === Infinity) return { w: 0, h: 0 };
  return { w: right - left, h: bottom - top };
}

// ---- one text size per screen -------------------------------------------------
// Fitting each card on its own made every card a different size ("テキストサイズが
// バラバラ"). Boxes of the SAME role and the SAME rendered width now form a group
// and all adopt the group's smallest fit, so a whole hand / market / gallery row
// reads at one size. A relative floor keeps one wordy card from crushing the rest —
// those get .is-clipped (top-aligned + bottom fade) instead.
const GROUP_FLOOR = 0.62;                                   // never below 62% of the group's design size
// Absolute readability floor. The relative floor alone let hand cards land at
// ~3.5px — text that nobody can read, which is worse than showing less of it.
// Below this we stop shrinking and let .is-clipped fade the tail instead; the
// full text is one tap away in the zoom view.
const MIN_READABLE_PX = 6.5;
// The zoom overlay is the "read the whole card" view, so it is allowed to go
// smaller than the on-board floor rather than hide its tail behind the fade.
const ZOOM_MIN_PX = 9;
const fitGroups = new Map<string, Set<HTMLElement>>();
const ownFit = new WeakMap<HTMLElement, number>();          // px this box needs on its own
const baseFit = new WeakMap<HTMLElement, number>();         // px the CSS asks for (unshrunk)
let normQueued = false;

function groupKey(box: HTMLElement, w: number): string {
  const role = box.classList.contains("card-name") ? "name" : "eff";
  return `${role}:${Math.round(w)}`;
}
function queueNormalize(): void {
  if (normQueued) return;
  normQueued = true;
  setTimeout(() => { normQueued = false; normalizeFitGroups(); }, 0);
}
function normalizeFitGroups(): void {
  // Collect every write first, apply them together, and only then read back —
  // interleaving a write and a read per box forced one layout per box.
  const writes: { box: HTMLElement; px: string }[] = [];
  for (const [key, set] of fitGroups) {
    const live: HTMLElement[] = [];
    let need = Infinity, base = 0;
    for (const b of set) {
      if (!b.isConnected) { set.delete(b); continue; }
      const f = ownFit.get(b);
      if (f == null) continue;
      live.push(b);
      if (f < need) need = f;
      base = Math.max(base, baseFit.get(b) ?? 0);
    }
    if (!live.length) { fitGroups.delete(key); continue; }
    if (!isFinite(need)) continue;
    // ONE size for the whole group. Cards that would need less than the floor are
    // NOT shrunk below it — they render at the group size and lose their tail to
    // the .is-clipped fade instead. Shrinking them further was what made the sizes
    // look random, and those cards were unreadable at that size anyway.
    // Readability wins over completeness. `base` (the CSS design size) is itself
    // under ~5px on market/hand cards, so capping at it guaranteed unreadable
    // text; the floor is allowed to exceed it and the overflow becomes the
    // .is-clipped fade — the full text is one tap away in the zoom view.
    const px = Math.max(Math.min(Math.max(need, base * GROUP_FLOOR), base), MIN_READABLE_PX);
    const val = px.toFixed(2) + "px";
    // A box already at the group size needs neither the write nor the re-measure;
    // its .is-clipped flag is still the right one. (Reading an inline style costs
    // no layout, unlike getComputedStyle.)
    for (const b of live) if (b.style.fontSize !== val) writes.push({ box: b, px: val });
  }
  if (!writes.length) return;
  for (const w of writes) w.box.style.fontSize = w.px;          // all writes
  // Decide first, apply after. Toggling .is-clipped changes justify-content,
  // word-break and the mask, so it INVALIDATES LAYOUT — doing it inside the
  // read loop forced a fresh layout for every single box (660 of them in the
  // card gallery, measured at ~330ms).
  const clip: boolean[] = [];
  for (const w of writes) {                                     // then all reads
    const r = w.box.getBoundingClientRect(), c = contentSize(w.box);
    clip.push(c.h > r.height + 0.5 || c.w > r.width + 1);
  }
  writes.forEach((w, i) => w.box.classList.toggle("is-clipped", clip[i]));
}

// ---- batched fitting ----------------------------------------------------------
// This used to run per box: each box looped up to 14 times, and every iteration
// read a rect and then wrote a font size, so the next read forced a fresh layout.
// The 330-card gallery is 660 boxes — thousands of forced layouts, measured as
// ~4s of blocked main thread. Now every pending box is measured in ONE read pass
// and updated in ONE write pass, so a screen costs a handful of layouts however
// many cards it holds. Each box still converges to the same size as before.
const FIT_PASSES = 8;   // ratio-based shrink converges in 2–3; 8 is slack
const FIT_MAX_WAIT = 8; // flushes to wait for a box that isn't in the DOM yet
interface FitState { solo: boolean; minPx: number; lastW: number; lastH: number; waits: number; }
const fitState = new WeakMap<HTMLElement, FitState>();
const fitPending = new Set<HTMLElement>();
let fitQueued = false;

// One shared observer instead of one per box: the gallery was allocating ~660
// ResizeObserver instances, which cost more than the measuring did.
let sharedRO: ResizeObserver | null = null;
function observeBox(box: HTMLElement): void {
  if (typeof ResizeObserver === "undefined") return;
  if (!sharedRO) {
    sharedRO = new ResizeObserver((entries) => {
      let any = false;
      for (const e of entries) {
        const st = fitState.get(e.target as HTMLElement);
        if (!st) continue;
        st.lastW = -1; st.lastH = -1;   // size changed → refit from the CSS default
        fitPending.add(e.target as HTMLElement);
        any = true;
      }
      if (any) queueFit();
    });
  }
  sharedRO.observe(box);
}

function queueFit(): void {
  if (fitQueued) return;
  fitQueued = true;
  // 주의: rAF는 숨겨진 탭에서 영원히 안 불린다(재접속 백그라운드 렌더 등) → setTimeout.
  // 레이아웃 측정은 백그라운드에서도 동작한다.
  setTimeout(flushFits, 0);
}

function flushFits(): void {
  fitQueued = false;
  const boxes: HTMLElement[] = [];
  const waiting: HTMLElement[] = [];
  for (const box of fitPending) {
    const st = fitState.get(box);
    if (!st) continue;
    if (box.isConnected) boxes.push(box);
    else if (st.waits++ < FIT_MAX_WAIT) waiting.push(box);   // still in a fragment
  }
  fitPending.clear();

  if (boxes.length) {
    // ---- read: which boxes actually changed size since we last fitted them? ----
    const rects = boxes.map((b) => b.getBoundingClientRect());
    const changed: HTMLElement[] = [];
    boxes.forEach((b, i) => {
      const st = fitState.get(b)!;
      const r = rects[i];
      // 같은 크기면 재계산 생략, 달라졌으면 CSS 기본값에서 다시 맞춘다(커질 때도 복구).
      if (Math.abs(r.width - st.lastW) < 0.5 && Math.abs(r.height - st.lastH) < 0.5) return;
      st.lastW = r.width; st.lastH = r.height;
      changed.push(b);
    });

    if (changed.length) {
      for (const b of changed) b.style.fontSize = "";                                  // write
      for (const b of changed) baseFit.set(b, parseFloat(getComputedStyle(b).fontSize)); // read

      let live = changed;
      for (let pass = 0; pass < FIT_PASSES && live.length; pass++) {
        const next: { box: HTMLElement; px: number }[] = [];
        for (const b of live) {                                   // ---- read pass ----
          const st = fitState.get(b)!;
          // 박스도 rect로 재야 한다(줌 등 ancestor transform이 있으면 client*와 단위가 어긋남)
          const r = b.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          const c = contentSize(b);
          // 0.5px 여유: 딱 맞게 재면 글리프의 어센더/디센더가 반 픽셀씩 삐져나와
          // overflow:hidden에 첫 줄 윗부분이 잘린다(카드명 2줄에서 특히).
          // Width must NOT get a negative slack: a full-width child — the dice
          // table is width:100% — measures exactly the box width, and that read
          // as overflow forever, shrinking text that actually fit.
          const availH = r.height - 0.5, availW = r.width + 0.5;
          if (c.h - availH <= 0 && c.w - availW <= 0) continue;
          const cur = parseFloat(getComputedStyle(b).fontSize);
          if (cur <= st.minPx) continue;
          const rH = c.h > 0 ? availH / c.h : 1;
          const rW = c.w > 0 ? availW / c.w : 1;
          const px = Math.max(st.minPx, cur * Math.min(rH, rW) * 0.97);
          if (px >= cur) continue;
          next.push({ box: b, px });
        }
        for (const n of next) n.box.style.fontSize = n.px.toFixed(2) + "px";  // ---- write pass ----
        live = next.map((n) => n.box);
      }

      // ---- final read pass: clip flag, own fit, group membership ----
      // 최소 폰트로도 안 들어가는 카드는 위 정렬 + 아래 페이드로 "문장이 이어진다"고
      // 읽히게 한다 — 잘림이 항상 문장 끝에서만 일어난다.
      const joins: { box: HTMLElement; key: string }[] = [];
      const clips: { box: HTMLElement; on: boolean }[] = [];
      for (const b of changed) {                                 // read only
        const st = fitState.get(b)!;
        const r = b.getBoundingClientRect();
        const c = contentSize(b);
        clips.push({ box: b, on: c.h > r.height + 0.5 || c.w > r.width + 1 });
        if (st.solo) continue;   // the zoom card is alone on screen — keep its own size
        ownFit.set(b, parseFloat(getComputedStyle(b).fontSize));
        joins.push({ box: b, key: groupKey(b, r.width) });
      }
      for (const cl of clips) cl.box.classList.toggle("is-clipped", cl.on);  // write after
      if (joins.length) {
        for (const j of joins) {
          for (const [k, set] of fitGroups) if (k !== j.key) set.delete(j.box);
          if (!fitGroups.has(j.key)) fitGroups.set(j.key, new Set());
          fitGroups.get(j.key)!.add(j.box);
        }
        queueNormalize();
      }
    }
  }

  if (waiting.length) {
    for (const b of waiting) fitPending.add(b);
    fitQueued = true;
    setTimeout(flushFits, 16);
  }
}

/**
 * 실측 자동 축소: 요소가 DOM에 붙은 뒤 내용이 박스를 넘치면 폰트를 줄여 항상
 * 프레임 안에 들어가게 한다. 카드가 손패/마켓/줌 어느 크기로 렌더되든 em 기반이라
 * 같은 비율로 동작 — "효과 텍스트가 프레임을 벗어나는" 문제의 근본 해결.
 *
 * ⚠ scrollWidth/scrollHeight로는 못 잰다: .card-name/.card-eff는 내용을 flex로
 * 가운데 정렬하므로 넘친 내용이 위/아래(좌/우)로 "반씩" 삐져나가는데, scroll*는
 * 시작 모서리 방향 넘침을 세지 않는다 → 절반만 보고 "맞았다"고 판단해 글자가
 * 잘린 채로 남았다. 그래서 contentSize()가 Range + 자식 rect로 실제 바운딩을 잰다.
 *
 * @param solo  the zoom overlay — one card, alone, whose whole job is to be read.
 *              It never joins a size group (there is nothing to be consistent
 *              WITH) and never gets clipped: it shrinks until everything fits.
 */
function fitToBox(box: HTMLElement, { solo = false } = {}): void {
  fitState.set(box, { solo, minPx: solo ? ZOOM_MIN_PX : MIN_READABLE_PX, lastW: -1, lastH: -1, waits: 0 });
  fitPending.add(box);
  queueFit();
  // 카드가 리사이즈되면 다시 맞춘다 (한 번만 맞추면 리사이즈 후 글자가 잘린 채 남는다).
  // 폰트 크기는 박스 크기를 바꾸지 않으므로(높이는 카드 대비 %) 되먹임 루프가 없다.
  observeBox(box);
}

// ---- art state memo -----------------------------------------------------------
// Galleries rebuild every card on every tab switch, so the same art is created
// again and again. Two things follow from that:
//   · art that ALREADY loaded is sitting in the browser cache, but a fresh
//     loading="lazy" image is still deferred behind a layout + intersection
//     pass — which is why re-entering a tab took about a second to show art it
//     had already fetched. Known-good art is created eager.
//   · art that has no file (a card whose illustration was never generated)
//     otherwise costs a request AND the retry delay on every single render.
//     Known-bad art renders the placeholder immediately, no request at all.
// The bad memo expires so a transient failure heals itself. Keys are
// "<id>:<variant>" rather than a URL because a srcset image picks its own.
const ART_FAIL_TTL = 60_000;
const artOk = new Set<string>();
const artFail = new Map<string, number>();
function artStatus(key: string): "ok" | "fail" | "unknown" {
  if (artOk.has(key)) return "ok";
  const at = artFail.get(key);
  if (at == null) return "unknown";
  if (Date.now() - at < ART_FAIL_TTL) return "fail";
  artFail.delete(key);            // give it another chance
  return "unknown";
}

// ---- zoom art prefetch -------------------------------------------------------
// Tapping a card used to be the FIRST time its full-resolution art was ever
// requested, so the player watched it arrive. Two things fix that: the 384px
// thumbnail (already on screen) is painted underneath immediately, and the full
// art is fetched before the tap wherever we can see the tap coming.
export const artUrl = {
  xs: (id: string) => `/art/cards-xs/${id}.webp`,
  sm: (id: string) => `/art/cards-sm/${id}.webp`,
  full: (id: string) => `/art/cards/${id}.webp`,
};

const prefetched = new Set<string>();
let inFlight = 0;
const prefetchQueue: string[] = [];
const PREFETCH_PARALLEL = 2;

/** Skip speculative loading when the player is paying for it or barely connected.
 *  Only genuinely bad links are excluded — effectiveType is a rough estimate and
 *  reports plenty of healthy connections as "3g", so gating on "4g" would turn
 *  prefetching off for a large share of real players. */
function prefetchAllowed(): boolean {
  const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!c) return true;                                    // no information — assume it is fine
  if (c.saveData) return false;
  return c.effectiveType !== "slow-2g" && c.effectiveType !== "2g";
}

// setTimeout, not requestIdleCallback: idle callbacks are not run at all while
// the tab is hidden, and a board rendered in a background tab (waiting out
// matchmaking) is exactly when there is time to spare. The delay keeps the
// prefetch behind the art that is actually on screen.
const idle = (cb: () => void): void => { setTimeout(cb, 400); };

function pumpPrefetch(): void {
  while (inFlight < PREFETCH_PARALLEL) {
    const id = prefetchQueue.shift();
    if (!id) return;
    const url = artUrl.full(id);
    inFlight++;
    const img = new Image();
    const fin = (): void => { inFlight--; pumpPrefetch(); };
    img.onload = fin;
    img.onerror = fin;
    // decoded off the critical path; the browser caches it either way
    img.decoding = "async";
    img.setAttribute("fetchpriority", "low");
    img.src = url;
  }
}

/**
 * Warm the full-resolution art for a card the player is likely to enlarge.
 * `now` jumps the queue — used when a pointer is already on the card, where the
 * tap is at most a few hundred ms away.
 */
export function prefetchZoomArt(cardId: string, now = false): void {
  if (prefetched.has(cardId)) return;
  if (!now && !prefetchAllowed()) return;                 // speculative work only on a good link
  prefetched.add(cardId);
  if (now) { prefetchQueue.unshift(cardId); pumpPrefetch(); return; }
  prefetchQueue.push(cardId);
  idle(pumpPrefetch);
}

// ---- art sizes ----------------------------------------------------------------
// Every card view except the zoom overlay renders art far smaller than the 384px
// thumbnail: the gallery grid shows it at ~92 CSS px on a desktop. Decoding and
// rasterising 384x561 for a 92px box costs about four times what it needs to,
// and the browser does that work one image at a time — which is why the LAST
// cards in a grid appeared a few hundred ms after the first ones. Measured over
// 336 warm images: p90 504ms -> 175ms when the source is 192px.
//
// `sizes` mirrors the .cards-grid breakpoints in screens.css (art window is
// ~86% of the card, card width = (min(1040px,96vw) - 8px - 8px*(cols-1)) / cols),
// so a 3x phone still picks the 384px file and stays sharp.
// Zoom art window ≈ 86.6% of the card: 346px at the 400px desktop size, 84vw*0.866
// on phones.
const ZOOM_SIZES = "(max-width: 860px) 73vw, 346px";
const GALLERY_SIZES = [
  "(max-width: 340px) 39vw",
  "(max-width: 480px) 26vw",
  "(max-width: 700px) 20vw",
  "(max-width: 820px) 13vw",
  "(max-width: 1000px) 11vw",
  "92px",
].join(", ");

/** Cards past this index in a gallery grid defer their art; the ones before it
 *  are (roughly) the first screenful and load immediately. */
const EAGER_HEAD = 40;
function lazyFor(v: boolean | number | undefined): boolean {
  return typeof v === "number" ? v >= EAGER_HEAD : !!v;
}

function artEl(cardId: string, full = false, lazy = false, gallery = false): HTMLElement {
  const art = el("div", "card-art");
  const variant = full ? "full" : gallery ? "gal" : "sm";
  const key = `${cardId}:${variant}`;
  const known = artStatus(key);
  if (known === "fail") {
    // no <img> at all — the ◆ placeholder is the final answer for this card
    art.classList.add("art-done");
    return art;
  }
  const src = `/art/${full ? "cards" : "cards-sm"}/${cardId}.webp`;
  const img = document.createElement("img");
  img.alt = "";
  img.className = "card-art-img";
  // ⚠ Attributes MUST be set before `src`/`srcset`. Assigning them is what queues
  // the fetch, and the loading/priority hints have to be in place by then.
  img.decoding = "async";
  if (lazy && known !== "ok") {
    // Only for galleries that render hundreds of cards at once, and only for art
    // we have not already fetched. Everywhere else lazy is actively harmful: the
    // board shows ~17 cards that are ALL on screen and are the point of the
    // screen, yet lazy images are Low priority AND are not fetched until the
    // browser decides they are near the viewport. Measured: 20 lazy images in a
    // backgrounded tab issued ZERO requests in 3s, while the same 20 without it
    // finished in well under a second.
    img.loading = "lazy";
  } else {
    img.loading = "eager";
    img.setAttribute("fetchpriority", full ? "high" : "auto");
  }
  if (full) {
    // The thumbnail is already decoded (the card was on screen a moment ago), so
    // paint it behind the full art straight away — the zoom opens filled in
    // instead of empty. It goes on the CONTAINER: the <img> itself starts at
    // opacity 0 for the cross-fade, which used to hide this placeholder too, so
    // it never actually showed.
    art.style.backgroundImage = `url(${artUrl.sm(cardId)})`;
    art.classList.add("has-thumb");
    // 1x screens need ~346px for a 400px card — the 384px thumb already covers
    // that, so they never fetch the master at all.
    img.sizes = ZOOM_SIZES;
    img.srcset = `${artUrl.sm(cardId)} 384w, ${artUrl.full(cardId)} 832w`;
  }
  const done = (): void => {
    artOk.add(key);
    img.classList.add("art-loaded");
    art.classList.add("art-done");
  };
  if (img.complete && img.naturalWidth) done();
  else img.onload = done;
  // One quick retry before giving up. The old handler removed the <img> on the
  // first error, so a single transient failure blanked that card for the rest of
  // the session with no way back.
  let tries = 0;
  img.onerror = () => {
    if (tries++ === 0) {
      setTimeout(() => { img.removeAttribute("srcset"); img.src = `${src}?retry=1`; }, 150);
      return;
    }
    artFail.set(key, Date.now());
    img.remove();
    art.classList.add("art-done");
  };
  if (gallery) {
    // let the browser pick 192px or 384px by its own pixel density
    img.sizes = GALLERY_SIZES;
    img.srcset = `/art/cards-xs/${cardId}.webp 192w, /art/cards-sm/${cardId}.webp 384w`;
  }
  img.src = src;
  art.appendChild(img);
  return art;
}

export function cardEl(c: CardInst, opt: CardOpts = {}): HTMLElement {
  const typeClass = c.t === "mon" ? "card--mon" : c.t === "trap" ? "card--trap" : c.t === "starter" ? "card--starter" : "card--spell";
  const sizeClass = opt.size === "mkt" ? "card--mkt" : opt.size === "hand" ? "card--hand" : "";
  const node = el("div", `card ${typeClass} ${sizeClass}`.trim());
  node.dataset.uid = c.uid;
  if (opt.compactField) node.classList.add("card--field");
  // Layering: art sits BEHIND the frame (in the transparent art window), the
  // frame PNG overlays on top (its border hugs the art edges), then text/cost
  // render above the frame. (frame's outer + window are transparent.)
  node.appendChild(artEl(c.id, opt.fullArt, lazyFor(opt.lazyArt), opt.lazyArt !== undefined));
  const frameEl = el("div", "card-frame");
  // square field tiles use the dedicated 1254 square frames; everything else
  // (hand / market / zoom / deck-builder) keeps the vertical card frames
  frameEl.style.backgroundImage = `url(${opt.compactField ? fieldFrameFor(c.t) : frameFor(c.t)})`;
  node.appendChild(frameEl);

  if (opt.playable) node.classList.add("is-playable");
  if (opt.buyable) node.classList.add("is-buyable");
  if (opt.dim) node.classList.add("is-dim");
  if (opt.attacker) node.classList.add("is-attacker");
  if (opt.targetable) node.classList.add("is-targetable");
  if (opt.exhausted) node.classList.add("is-exhausted");

  const cost = opt.costOverride != null ? opt.costOverride : c.cost;
  node.appendChild(el("div", "card-cost" + (cost >= 10 ? " card-cost--2d" : ""), String(cost)));
  const pc = playCost(c);
  const nm = cardName(c);
  const nameEl2 = el("div", "card-name" + (nm.length >= 9 ? " card-name--long" : ""), nm);
  node.appendChild(nameEl2);

  if (c.t === "mon") {
    const a = opt.field && opt.owner ? effAtk(opt.owner, c as FieldMon) : c.atk!;
    // v24 HP-combat: the shield slot shows CURRENT HP — on the field AND in zoom
    // (v29: zoom used to show max HP, so a damaged monster read as healthy there).
    // 최대 체력은 몬스터 칩에 표시하지 않는다 (숫자 하나 + 손상 시 빨간색만).
    const fm = c as FieldMon;
    const onField = !!(opt.field && opt.owner);
    const isEgg = fm.hatch != null;
    let d: number, hurt = false;
    if (onField) {
      d = isEgg ? effDef(opt.owner!, fm) : curHp(opt.owner!, fm);
      hurt = !isEgg && (fm.dmg || 0) > 0;
    } else if (opt.hpNow != null) {
      d = opt.hpNow;
      hurt = opt.hpMax != null && opt.hpMax > d;
    } else d = c.def!;
    // 알은 공격도 체력도 하지 않는다 — 부화/내구도 배지가 그 자리의 실질 정보다.
    // (0/0 칩이 남아 있으면 "약한 몬스터"로 잘못 읽힌다)
    if (!(onField && isEgg)) node.appendChild(el("div", "ad-atk" + (String(a).length >= 3 ? " ad-num--3d" : ""), String(a)));
    if (!(onField && isEgg)) {
      node.appendChild(el("div", "ad-def" + (hurt ? " ad-def--hurt" : "") + (String(d).length >= 3 ? " ad-num--3d" : ""), String(d)));
    }
  }
  // ---- 상태 띠 (필드 타일 / 알) ------------------------------------------
  // 예전에는 카운터가 타일 한가운데(top:48%)에 떠서 일러스트를 가리고, 게다가
  // 키워드는 확대해야만 보였다 — 같은 카드인데 필드와 확대에서 읽히는 정보가
  // 달랐다. 이제 키워드 칩과 카운터를 하나의 띠로 묶어 공격/체력 칩 바로 위,
  // 항상 같은 자리에 둔다. 칩 모양은 확대 화면의 키워드 칩과 동일하다.
  {
    const lang0 = getLang();
    const psvName = (k: string): string | null => {
      const pd = PASSIVES[k];
      return pd ? (lang0 === "ja" ? pd.ja.name : lang0 === "en" ? pd.en.name : pd.ko.name) : null;
    };
    const band = el("div", "card-status");
    const fm = c as FieldMon;
    // 1) 키워드 — 카드가 원래 가진 것 + 게임 중 부여된 것 (필드 타일에서만;
    //    손패/마켓/확대는 효과판의 키워드 칩 행이 같은 정보를 이미 보여준다)
    if (opt.compactField) {
      const innate = cardPassives(c);
      const granted = fm.passivesG ?? [];
      for (const k of [...innate, ...granted.filter((g) => !innate.includes(g))]) {
        const nm = psvName(k);
        if (!nm) continue;
        const chip = el("span", "kw" + (granted.includes(k) ? " kw--granted" : ""), nm);
        chip.dataset.psv = k;
        band.appendChild(chip);
      }
    } else if (opt.field && fm.passivesG?.length) {
      for (const k of fm.passivesG) {
        const nm = psvName(k);
        if (nm) band.appendChild(el("span", "ec ec-p", nm));
      }
    }
    // 2) 카운터
    if (opt.field && c.aura === "assassinGuild") {
      band.appendChild(el("span", "ec ec-d", `⚔${(c as { gcount?: number }).gcount ?? 0}/3`));
    }
    if (c.hatchTurns != null) {
      // 알: 필드에서는 실시간 값, 손패/마켓에서는 초기값
      const eggH = (c as { hatch?: number }).hatch ?? c.hatchTurns;
      const eggD = (c as { dur?: number }).dur ?? c.hatchDur ?? 4;
      band.appendChild(el("span", "ec ec-h", `🥚${eggH}`));
      band.appendChild(el("span", "ec ec-d", `🛡${Math.max(0, eggD)}`));
    } else if (opt.field && c.aura !== "assassinGuild") {
      if ((fm.guts ?? 0) > 0) band.appendChild(el("span", "ec ec-g", `💢${fm.guts}`));
      if ((fm.decayCnt ?? 0) > 0) band.appendChild(el("span", "ec ec-x", `☠${fm.decayCnt}/3`));
    }
    if (band.childElementCount) node.appendChild(band);
  }
  // 이름도 실측-축소: 긴 이름(EN 포함)이 프레임 이름판을 벗어나지 않게
  fitToBox(nameEl2, { solo: !!opt.fullArt });
  // 효과 텍스트: "(시전 N)"/"(소환 N)" 계열 표기는 배지로 대체되므로 제거하고, 구분자를 줄바꿈으로
  const rawTxt = cardText(c).replace(/\s*\((?:시전|Cast|発動|소환|Summon|召喚)\s*\d+\)/g, "").trim();
  // dice/chest cards are detected on the RAW text — the separators become newlines
  // just below, which would destroy the " / " that delimits the outcome rows
  const table = rawTxt && rawTxt !== "—" ? parseDiceTable(rawTxt) : null;
  let txt = rawTxt
    .replace(/ · /g, "\n")
    .replace(/ \/ /g, "\n")
    .trim();
  const hasCast = c.t !== "starter" && pc !== c.cost;
  // Passive keywords live on their own chip row instead of being buried in the
  // sentence (rule R3). The row is a CHILD of .card-eff on purpose: that box is
  // already clipped to the frame's text plate and already auto-fitted, so adding
  // keywords can never push anything outside the card art.
  const keyChips = cardPassives(c);
  // The square field tile has no text plate (CSS hides it) — building one anyway
  // put zero-sized boxes into the shared size groups and skewed the group size
  // for every real card on screen.
  if (!opt.compactField && ((txt && txt !== "—") || hasCast || keyChips.length)) {
    // No length buckets: every effect plate starts at the SAME CSS size and
    // fitToBox + the size-group pass decide the final one. The old --small/--tiny
    // buckets gave cards different starting sizes, so the "one size per screen"
    // pass could never actually land on one size.
    const effCls = "card-eff";
    const eff = el("div", effCls);
    if (hasCast) {
      // monsters are SUMMONED, spells/traps are CAST — label the play-cost badge accordingly
      const cast = el("div", "card-cast", `<span class="cc-ico">⚡</span>${t(c.t === "mon" ? "card.summon" : "card.cast")} ${pc}`);
      // instant tooltip anchored to the card (not inside the clipped .card-eff)
      const tip = el("div", "cast-tip", t(c.t === "mon" ? "card.summon.tip" : "card.cast.tip"));
      node.appendChild(tip);
      cast.addEventListener("pointerenter", () => tip.classList.add("show"));
      cast.addEventListener("pointerleave", () => tip.classList.remove("show"));
      eff.appendChild(cast);
    }
    if (keyChips.length) {
      const lang2 = getLang();
      const row = el("div", "card-keys" + (txt && txt !== "—" ? "" : " card-keys--only"));
      for (const k of keyChips) {
        const pd = PASSIVES[k];
        if (!pd) continue;
        // data-psv keeps the zoom view's keyword panel highlight working
        row.appendChild(el("span", "kw psv", lang2 === "ja" ? pd.ja.name : lang2 === "en" ? pd.en.name : pd.ko.name)).setAttribute("data-psv", k);
      }
      if (row.childElementCount) eff.appendChild(row);
    }
    // effect text LAST: keywords are labels and must survive the .is-clipped fade,
    // which always eats the tail of the plate
    if (table) {
      if (table.head) eff.appendChild(el("div", "card-dice-head", decorateTags(table.head)));
      const tb = el("div", "card-dice");
      for (const [roll, fx] of table.rows) {
        const row = el("div", "dr");
        row.appendChild(el("span", "dr-roll", roll));
        row.appendChild(el("span", "dr-fx", decorateTags(fx)));
        tb.appendChild(row);
      }
      eff.appendChild(tb);
    } else if (txt && txt !== "—") {
      eff.appendChild(el("div", "card-eff-txt", `<span style="white-space:pre-line">${decorateTags(decoratePassives(c, txt))}</span>`));
    }
    fitToBox(eff, { solo: !!opt.fullArt }); // 실측 자동 축소 — 어떤 길이의 효과도 항상 프레임 텍스트판 안에
    node.appendChild(eff);
  }
  if (opt.badge) node.appendChild(el("span", "badge", opt.badge));
  // tribe info is shown BESIDE the card in the zoom view (see anim.zoomCard),
  // so no on-art tribe button here (keeps the art clean).
  return node;
}

export function backEl(w?: number, h?: number): HTMLElement {
  const node = el("div", "card card--back");
  node.style.backgroundImage = `url(${FRAME_BACK})`;
  if (w) node.style.width = w + "px";
  if (h) node.style.height = h + "px";
  return node;
}
