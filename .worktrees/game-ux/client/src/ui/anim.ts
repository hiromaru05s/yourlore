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
export async function revealSpell(card: CardInst, side: ViewSide, dest: "discard" | "field" | "vanish"): Promise<void> {
  const from = handRect(side); const row = rowRect(side);
  if (!from || !row) return;
  const node = floatAt(cardEl(card, { size: "hand" }), from);
  const cx = row.left + row.width / 2 - 50;
  const cy = row.top + row.height / 2 - 78;
  await raf();
  node.style.transition = `left .38s ${EASE}, top .38s ${EASE}, transform .38s ${EASE}`;
  node.style.left = cx + "px"; node.style.top = cy + "px"; node.style.transform = "scale(1.25)";
  await wait(side === "me" ? 650 : 1850); // opponent's card lingers so you can read it
  if (dest === "discard") {
    const to = rectOf("#" + discId(side));
    if (to) { node.style.transition = `left .45s ${EASE}, top .45s ${EASE}, transform .45s ${EASE}, opacity .45s`; node.style.left = to.left + "px"; node.style.top = to.top + "px"; node.style.transform = "scale(.45)"; node.style.opacity = "0"; }
    await wait(460); pileFlash(discId(side));
  } else if (dest === "vanish") {
    node.classList.add("fx-dissolve"); // e.g. Cull: removed from the deck entirely
    await wait(440);
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

/** A trap fired: flip it face-up at the trap zone, hold, then send to discard. */
export async function trapRevealAnim(card: CardInst, side: ViewSide, hold = 2000): Promise<void> {
  const at = trapZoneRect(side); if (!at) return;
  const node = floatAt(cardEl(card, { size: "hand" }), { left: at.left + at.width / 2 - 50, top: at.top - 10 });
  node.classList.add("trap-flip");
  await wait(hold);
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

// ============================================================
// FX layer — sequential event playback helpers.
// Center banners, summon ghosts, random-result popups, mana/HP
// surges and the death sequence. All awaitable, DOM-only.
// ============================================================
import { t as tt } from "../i18n";

/** Center-screen announcement (e.g. "함정 발동!"). */
export async function eventBanner(main: string, sub?: string, kind: "trap" | "info" | "danger" = "info", ms = 1400): Promise<void> {
  const b = document.createElement("div");
  b.className = "fx-banner " + kind;
  b.innerHTML = `<div class="fx-banner-main">${main}</div>` + (sub ? `<div class="fx-banner-sub">${sub}</div>` : "");
  document.body.appendChild(b);
  await wait(ms);
  b.classList.add("out");
  await wait(260);
  b.remove();
}

function monZoneEl(side: ViewSide): HTMLElement | null {
  const row = document.getElementById(side === "me" ? "meRow" : "oppRow");
  const zones = row ? row.querySelectorAll(".zone") : null;
  if (!zones || !zones.length) return null;
  // my monster zone renders first; the opponent's renders last (mirrored board)
  return (side === "me" ? zones[0] : zones[zones.length - 1]) as HTMLElement;
}
function monSlotRect(side: ViewSide, index: number): DOMRect | null {
  const z = monZoneEl(side);
  if (!z) return null;
  const kids = z.children;
  if (!kids.length) return z.getBoundingClientRect();
  return kids[Math.max(0, Math.min(index, kids.length - 1))].getBoundingClientRect();
}

/**
 * Summon shown as a floating ghost card: flies from the hand into the target
 * field slot and STAYS there (the real board re-renders later). Returns the
 * ghost node so a same-batch destroy can kill it visibly.
 */
export async function ghostSummon(card: CardInst, side: ViewSide, slotIndex: number): Promise<HTMLElement | null> {
  const from = handRect(side);
  const slot = monSlotRect(side, slotIndex);
  if (!from || !slot) return null;
  const node = floatAt(cardEl(card, { size: "hand" }), from);
  node.style.transformOrigin = "top left";
  await raf();
  const w = node.getBoundingClientRect().width || 100;
  node.style.transition = `left .34s ${EASE}, top .34s ${EASE}, transform .34s ${EASE}`;
  node.style.left = slot.left + "px";
  node.style.top = slot.top + "px";
  node.style.transform = `scale(${slot.width / w})`;
  await wait(360);
  node.classList.add("fx-ghost-pop");
  return node;
}

/** Kill a summon ghost: death flash then fly a card frame to that side's discard. */
export async function ghostDie(node: HTMLElement, side: ViewSide): Promise<void> {
  const from = node.getBoundingClientRect();
  node.classList.add("mdie");
  await wait(320);
  node.remove();
  flyCardFrame(frameFor("mon"), from, rectOf("#" + discId(side)));
  pileFlash(discId(side));
  await wait(340);
}

/** Destroy a monster that exists on the CURRENT board (pre re-render). */
export async function destroyAnim(uid: string, side: ViewSide): Promise<void> {
  const n = byUid(uid);
  if (!n) return;
  const from = n.getBoundingClientRect();
  n.classList.add("mdie");
  await wait(320);
  (n as HTMLElement).style.visibility = "hidden";
  flyCardFrame(frameFor("mon"), from, rectOf("#" + discId(side)));
  pileFlash(discId(side));
  await wait(340);
}

/** Random-card outcome popup. Big center card for your plays, compact upper popup for the opponent's. */
export async function resultPopup(title: string, lines: string[], mine: boolean, ms = 2400): Promise<void> {
  const p = document.createElement("div");
  p.className = "fx-result" + (mine ? "" : " opp");
  p.innerHTML = `<div class="fx-result-title">🎲 ${title}</div>` + lines.map((l) => `<div class="fx-result-line">${l}</div>`).join("");
  document.body.appendChild(p);
  await Promise.race([wait(ms), new Promise<void>((r) => (p.onclick = () => r()))]); // click to skip
  p.classList.add("out");
  await wait(280);
  p.remove();
}

/** Live HP readout update during sequential playback (board re-renders later). */
export function hpBarSet(side: ViewSide, hp: number, maxHp: number): void {
  const num = document.getElementById("hp-" + side);
  if (num) num.textContent = String(Math.max(0, hp));
  const fill = document.getElementById("hpbar-" + side)?.querySelector("i") as HTMLElement | null;
  if (fill) fill.style.width = Math.max(0, Math.min(100, (Math.max(0, hp) / Math.max(1, maxHp)) * 100)) + "%";
}

function gainLabel(anchor: DOMRect, text: string, cls: string): HTMLElement {
  const lb = document.createElement("div");
  lb.className = "fx-gain-label " + cls;
  lb.textContent = text;
  lb.style.left = anchor.left + anchor.width / 2 + "px";
  lb.style.top = anchor.top - 8 + "px";
  document.body.appendChild(lb);
  return lb;
}

/** Rich "max mana increased" celebration around the mana pips (~2.2s). */
export async function manaSurge(side: ViewSide, amount: number): Promise<void> {
  const bar = document.getElementById("hpbar-" + side)?.closest(".pbar") as HTMLElement | null;
  const anchor = (bar?.querySelector(".pips") as HTMLElement | null) ?? bar;
  if (!anchor) return;
  const r = anchor.getBoundingClientRect();
  const aura = document.createElement("div");
  aura.className = "fx-mana-aura";
  aura.style.left = r.left + r.width / 2 + "px";
  aura.style.top = r.top + r.height / 2 + "px";
  document.body.appendChild(aura);
  for (let i = 0; i < 16; i++) {
    const d = document.createElement("div");
    d.className = "fx-mana-p";
    const ang = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 120;
    d.style.setProperty("--sx", Math.cos(ang) * dist + "px");
    d.style.setProperty("--sy", Math.sin(ang) * dist + "px");
    d.style.left = r.left + r.width / 2 + "px";
    d.style.top = r.top + r.height / 2 + "px";
    d.style.animationDelay = i * 60 + "ms";
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1400 + i * 60);
  }
  anchor.classList.add("fx-pip-wave");
  const lb = gainLabel(r, `◆ ${tt("fx.mana")} +${amount}`, "mana");
  await wait(2100);
  lb.classList.add("out"); aura.classList.add("out");
  await wait(300);
  lb.remove(); aura.remove();
  anchor.classList.remove("fx-pip-wave");
}

/** Rich "max HP increased" celebration around the HP bar (~2s). */
export async function maxHpSurge(side: ViewSide, amount: number): Promise<void> {
  const bar = document.getElementById("hpbar-" + side);
  if (!bar) return;
  const r = bar.getBoundingClientRect();
  bar.classList.add("fx-hp-bloom");
  for (let i = 0; i < 12; i++) {
    const d = document.createElement("div");
    d.className = "fx-hp-p";
    d.textContent = "✚";
    d.style.left = r.left + Math.random() * r.width + "px";
    d.style.top = r.top + r.height / 2 + "px";
    d.style.animationDelay = i * 90 + "ms";
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1600 + i * 90);
  }
  const lb = gainLabel(r, `✚ ${tt("fx.maxhp")} +${amount}`, "hp");
  await wait(2000);
  lb.classList.add("out");
  await wait(300);
  lb.remove();
  bar.classList.remove("fx-hp-bloom");
}

/** Small "-N" feedback on the mana pips when max mana DROPS. */
export function manaDrop(side: ViewSide, amount: number): void {
  const bar = document.getElementById("hpbar-" + side)?.closest(".pbar") as HTMLElement | null;
  const anchor = (bar?.querySelector(".pips") as HTMLElement | null) ?? bar;
  floatNum(anchor, `-${amount} ◆`, "dmg");
}

/**
 * Death sequence (~2.8s): vignette, the loser's HP bar cracks and shatters
 * into shards, screen quake, then a center verdict with the killing cause.
 */
export async function deathShatter(loserSide: ViewSide, won: boolean, cause: string | null): Promise<void> {
  const bar = document.getElementById("hpbar-" + loserSide);
  const r = bar ? bar.getBoundingClientRect() : null;
  const vg = document.createElement("div");
  vg.className = "fx-death-vignette" + (won ? " win" : "");
  document.body.appendChild(vg);
  bar?.classList.add("fx-shatter");
  await wait(420);
  if (r) {
    for (let i = 0; i < 20; i++) {
      const s = document.createElement("div");
      s.className = "fx-shard";
      s.style.left = r.left + Math.random() * r.width + "px";
      s.style.top = r.top + Math.random() * r.height + "px";
      s.style.setProperty("--dx", (Math.random() - 0.5) * 260 + "px");
      s.style.setProperty("--dy", 40 + Math.random() * 160 + "px");
      s.style.setProperty("--rot", (Math.random() - 0.5) * 540 + "deg");
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1300);
    }
  }
  hpBarSet(loserSide, 0, 1);
  document.querySelector(".game")?.classList.add("fx-quake");
  await wait(600);
  const v = document.createElement("div");
  v.className = "fx-verdict " + (won ? "win" : "lose");
  v.innerHTML = `<div class="fx-verdict-main">${won ? t("modal.win") : t("modal.lose")}</div>` +
    (cause ? `<div class="fx-verdict-sub">${won ? "⚔" : "💀"} ${cause}</div>` : "");
  document.body.appendChild(v);
  await wait(1800);
  v.classList.add("out");
  await wait(280);
  v.remove(); vg.remove();
  document.querySelector(".game")?.classList.remove("fx-quake");
  bar?.classList.remove("fx-shatter");
}

/** Floating "결과 보기" button while reviewing the log after the game ends. */
export function reviewFab(onClick: () => void): void {
  removeReviewFab();
  const b = document.createElement("button");
  b.id = "reviewFab";
  b.className = "btn btn-gold fx-review-fab";
  b.textContent = tt("modal.result");
  b.onclick = onClick;
  document.body.appendChild(b);
}
export function removeReviewFab(): void {
  document.getElementById("reviewFab")?.remove();
}
