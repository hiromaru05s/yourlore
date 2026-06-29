// ============================================================
// LORE — animation helpers. Triggered by engine events; never
// touch game state, only the DOM.
// ============================================================
import type { CardInst } from "../shared/types";
import { frameFor, TRIBES, CHEST_ODDS } from "../shared/cards";
import { cardEl } from "./cardView";
import { t, getLang } from "../i18n";

export type ViewSide = "me" | "opp";

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
