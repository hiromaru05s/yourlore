// ============================================================
// LORE — animation helpers. Triggered by engine events; never
// touch game state, only the DOM.
// ============================================================
import type { CardInst } from "../shared/types";
import { frameFor, FRAME_BACK, TRIBES, CHEST_ODDS } from "../shared/cards";
import { cardEl } from "./cardView";
import { t, getLang } from "../i18n";

export type ViewSide = "me" | "opp";

const EASE = "cubic-bezier(.4,0,.2,1)";
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const raf = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
const handRect = (side: ViewSide): DOMRect | null => rectOf(side === "me" ? "#hand" : "#oppHand");
const rowRect = (side: ViewSide): DOMRect | null => rectOf(side === "me" ? "#meRow" : "#oppRow");
const discId = (side: ViewSide): string => (side === "me" ? "pile-myDisc" : "pile-oppDisc");
function trapZoneRect(side: ViewSide): DOMRect | null {
  const row = document.getElementById(side === "me" ? "meRow" : "oppRow");
  const zones = row ? row.querySelectorAll(".zone") : null;
  return zones && zones[1] ? (zones[1] as Element).getBoundingClientRect() : rowRect(side);
}
/** Place a node as a fixed-position floating overlay at a rect (top-left). */
function floatAt(node: HTMLElement, rect: { left: number; top: number }): HTMLElement {
  node.style.position = "fixed";
  node.style.left = rect.left + "px";
  node.style.top = rect.top + "px";
  node.style.margin = "0";
  node.style.zIndex = "125";
  node.style.pointerEvents = "none";
  node.style.transition = "none";
  document.body.appendChild(node);
  return node;
}
function backEl(): HTMLElement {
  const d = document.createElement("div");
  d.className = "card card--back";
  d.style.backgroundImage = `url(${FRAME_BACK})`;
  d.style.width = "var(--card-w-hand)";
  d.style.height = "var(--card-h-hand)";
  return d;
}

/** Opponent (or you) played a SPELL: reveal it from hand, hold face-up, then send to discard (or fade into field). */
export async function revealSpell(card: CardInst, side: ViewSide, dest: "discard" | "field"): Promise<void> {
  const from = handRect(side); const row = rowRect(side);
  if (!from || !row) return;
  const node = floatAt(cardEl(card, { size: "hand" }), from);
  const cx = row.left + row.width / 2 - 50;
  const cy = row.top + row.height / 2 - 78;
  await raf();
  node.style.transition = `left .38s ${EASE}, top .38s ${EASE}, transform .38s ${EASE}`;
  node.style.left = cx + "px"; node.style.top = cy + "px"; node.style.transform = "scale(1.25)";
  await wait(side === "me" ? 650 : 1850); // opponent's spell lingers so you can read it
  if (dest === "discard") {
    const to = rectOf("#" + discId(side));
    if (to) { node.style.transition = `left .45s ${EASE}, top .45s ${EASE}, transform .45s ${EASE}, opacity .45s`; node.style.left = to.left + "px"; node.style.top = to.top + "px"; node.style.transform = "scale(.45)"; node.style.opacity = "0"; }
    await wait(460); pileFlash(discId(side));
  } else {
    node.style.transition = `transform .3s ${EASE}, opacity .3s`; node.style.transform = "scale(.9)"; node.style.opacity = "0";
    await wait(320);
  }
  node.remove();
}

/** Opponent (or you) SUMMONED a monster: fly the card from hand to its field slot, then a lively pop. */
export async function summonFromHand(card: CardInst, uid: string, side: ViewSide): Promise<void> {
  const from = handRect(side); const node = byUid(uid); const to = rectOf(node);
  if (!from || !to || !node) { summonIn(uid); return; }
  node.style.visibility = "hidden";
  const ghost = floatAt(cardEl(card, { size: "hand" }), from);
  await raf();
  ghost.style.transition = `left .32s ${EASE}, top .32s ${EASE}, transform .32s ${EASE}`;
  ghost.style.left = to.left + "px"; ghost.style.top = to.top + "px"; ghost.style.transform = "scale(.82)";
  await wait(330);
  ghost.remove();
  node.style.visibility = "";
  node.classList.add("summon-pop");
  setTimeout(() => node.classList.remove("summon-pop"), 560);
}

/** A face-down trap was set: slide a card-back from hand into the trap zone. */
export async function trapSetAnim(side: ViewSide): Promise<void> {
  const from = handRect(side); const to = trapZoneRect(side);
  if (!from || !to) return;
  const back = floatAt(backEl(), from);
  await raf();
  back.style.transition = `left .34s ${EASE}, top .34s ${EASE}, transform .34s ${EASE}`;
  back.style.left = (to.left + to.width / 2 - 24) + "px"; back.style.top = to.top + "px"; back.style.transform = "scale(.7)";
  await wait(360);
  back.classList.add("trap-land");
  await wait(260);
  back.remove();
}

/** A trap fired: flip it face-up at the trap zone, hold ~2s, then send to discard. */
export async function trapRevealAnim(card: CardInst, side: ViewSide): Promise<void> {
  const at = trapZoneRect(side); if (!at) return;
  const node = floatAt(cardEl(card, { size: "hand" }), { left: at.left + at.width / 2 - 50, top: at.top - 10 });
  node.classList.add("trap-flip");
  await wait(2000);
  const to = rectOf("#" + discId(side));
  if (to) { node.style.transition = `left .45s ${EASE}, top .45s ${EASE}, transform .45s ${EASE}, opacity .45s`; node.style.left = to.left + "px"; node.style.top = to.top + "px"; node.style.transform = "scale(.45)"; node.style.opacity = "0"; }
  await wait(460); pileFlash(discId(side)); node.remove();
}

/** A card was bought: pop the card UI at the market, then fly it to that player's discard. */
export async function buyReveal(card: CardInst, side: ViewSide, src: DOMRect | null): Promise<void> {
  const to = rectOf("#" + discId(side));
  if (!src || !to) { pileFlash(discId(side)); return; }
  const node = floatAt(cardEl(card, { size: "mkt" }), src);
  await raf();
  node.style.transition = `transform .26s ${EASE}`; node.style.transform = "scale(1.4)";
  await wait(320);
  node.style.transition = `left .5s ${EASE}, top .5s ${EASE}, transform .5s ${EASE}, opacity .5s`;
  node.style.left = to.left + "px"; node.style.top = to.top + "px"; node.style.transform = "scale(.45)"; node.style.opacity = "0";
  await wait(520); pileFlash(discId(side)); node.remove();
}

function byUid(uid: string): HTMLElement | null {
  return document.querySelector(`.card[data-uid="${uid}"]`);
}
function rectOf(t: Element | string | null): DOMRect | null {
  const e = typeof t === "string" ? document.querySelector(t) : t;
  return e ? (e as Element).getBoundingClientRect() : null;
}

export function floatNum(anchor: Element | null, text: string, kind: "dmg" | "heal"): void {
  if (!anchor) return;
  const r = anchor.getBoundingClientRect();
  const f = document.createElement("div");
  f.className = "floater " + kind;
  f.textContent = text;
  f.style.left = r.left + r.width / 2 - 12 + "px";
  f.style.top = r.top + r.height / 2 - 16 + "px";
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 1100);
}

export function hpFeedback(side: ViewSide, kind: "dmg" | "heal", amount: number): void {
  const bar = document.getElementById("hpbar-" + side);
  const num = document.getElementById("hp-" + side);
  if (bar) { bar.classList.add("shake"); setTimeout(() => bar.classList.remove("shake"), 400); }
  if (num) { num.classList.add(kind === "dmg" ? "hp-hit" : "hp-heal"); setTimeout(() => num.classList.remove("hp-hit", "hp-heal"), 450); }
  floatNum(bar || num, (kind === "dmg" ? "-" : "+") + amount, kind);
}

export function pileFlash(id: string): void {
  const el = document.getElementById(id);
  if (el) { el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 500); }
}

export function summonIn(uid: string): void {
  const n = byUid(uid);
  if (n) { n.classList.add("summon-in"); setTimeout(() => n.classList.remove("summon-in"), 430); }
}

export function lunge(uid: string, dir: "up" | "down"): void {
  const n = byUid(uid);
  if (n) { const c = "lunge-" + dir; n.classList.add(c); setTimeout(() => n.classList.remove(c), 460); }
}

export function monHit(uid: string): void {
  const n = byUid(uid);
  if (n) { n.classList.add("mhit"); setTimeout(() => n.classList.remove("mhit"), 400); }
}

export function monDie(uid: string, discardId: string): void {
  const n = byUid(uid);
  const from = rectOf(n);
  if (n) n.classList.add("mdie");
  setTimeout(() => { flyCardFrame(frameFor("mon"), from, rectOf("#" + discardId)); pileFlash(discardId); }, 200);
}

export function flyCardFrame(frame: string, from: DOMRect | null, to: DOMRect | null, dur = 420): void {
  if (!from || !to) return;
  const fly = document.createElement("div");
  fly.className = "flycard";
  fly.style.backgroundImage = `url(${frame})`;
  fly.style.width = "70px";
  fly.style.height = 70 * 1.6 + "px";
  fly.style.left = from.left + "px";
  fly.style.top = from.top + "px";
  document.body.appendChild(fly);
  requestAnimationFrame(() => {
    fly.style.transition = `left ${dur}ms cubic-bezier(.4,0,.2,1), top ${dur}ms cubic-bezier(.4,0,.2,1), opacity ${dur}ms`;
    fly.style.left = to.left + "px";
    fly.style.top = to.top + "px";
    fly.style.opacity = ".3";
  });
  setTimeout(() => fly.remove(), dur + 40);
}

export function animateDraw(handEl: HTMLElement, count: number): void {
  const cards = handEl.querySelectorAll(".card");
  const start = Math.max(0, cards.length - count);
  for (let i = start; i < cards.length; i++) {
    const node = cards[i] as HTMLElement;
    setTimeout(() => { node.classList.add("drawing"); setTimeout(() => node.classList.remove("drawing"), 430); }, (i - start) * 110);
  }
  pileFlash("pile-myDeck");
}

// right-click to enlarge any card
export function zoomCard(c: CardInst): void {
  closeZoom();
  const ov = document.createElement("div");
  ov.className = "zoom-overlay";
  ov.id = "zoomOverlay";
  const wrap = document.createElement("div");
  wrap.className = "zoom-wrap";
  wrap.appendChild(cardEl(c));
  if (c.tribe && TRIBES[c.tribe]) {
    const info = TRIBES[c.tribe][getLang()];
    const panel = document.createElement("div");
    panel.className = "zoom-tribe";
    panel.innerHTML = `<h3>${info.name} ${t("tribe.suffix")}</h3><div class="note">${info.note}</div>` + info.bonuses.map((b) => `<div class="b">• ${b}</div>`).join("");
    wrap.appendChild(panel);
  }
  if (c.star === "chest") {
    const odds = CHEST_ODDS[getLang()];
    const panel = document.createElement("div");
    panel.className = "zoom-tribe";
    panel.innerHTML = `<h3>${odds.title}</h3>` + odds.rows.map((r) => `<div class="b">• ${r}</div>`).join("");
    wrap.appendChild(panel);
  }
  ov.appendChild(wrap);
  ov.onclick = closeZoom;
  ov.oncontextmenu = (e) => { e.preventDefault(); closeZoom(); };
  document.body.appendChild(ov);
}
export function closeZoom(): void {
  document.getElementById("zoomOverlay")?.remove();
}

/**
 * Bind "enlarge" to an element: right-click on desktop, long-press on touch.
 * A long-press swallows the tap so it does NOT also play/attack with the card.
 */
export function bindZoom(el: HTMLElement, card: CardInst): void {
  el.oncontextmenu = (e) => { e.preventDefault(); zoomCard(card); };
  let timer = 0, sx = 0, sy = 0, fired = false;
  el.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    fired = false;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    clearTimeout(timer);
    timer = window.setTimeout(() => { fired = true; zoomCard(card); }, 380);
  }, { passive: true });
  const cancel = () => clearTimeout(timer);
  el.addEventListener("touchmove", (e) => {
    const tt = e.touches[0]; if (!tt) return;
    if (Math.abs(tt.clientX - sx) > 12 || Math.abs(tt.clientY - sy) > 12) cancel();
  }, { passive: true });
  el.addEventListener("touchend", (e) => {
    cancel();
    if (fired) { e.preventDefault(); e.stopPropagation(); } // swallow the tap that would play/attack
  });
  el.addEventListener("touchcancel", cancel);
}
