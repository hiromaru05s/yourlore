import {reserveMonster} from './fieldLayout';
import {waitForDuel} from './duelReadiness';
// ============================================================
// LORE — animation helpers. Triggered by engine events; never
// touch game state, only the DOM.
// ============================================================
import type { CardInst } from "../shared/types";
import { frameFor, FRAME_BACK, TRIBES, CHEST_ODDS, DB, relatedCardIds, PASSIVES, cardPassives, enchantHasTurnCountdown } from "../shared/cards";
import { cardEl, cardRulesEl, prefetchZoomArt, enchantmentTile, questTile } from "./cardView";
import { t, getLang, cardText, cardName } from "../i18n";

import { sfx } from "./sound";
import { moveOnBoard } from "./boardMotion";
import { projectedPlacement } from "./boardProjection";
import {playBiblionFx,clearBiblionFx} from './biblionFx';

export type ViewSide = "me" | "opp";

const EASE = "cubic-bezier(.4,0,.2,1)";

// ---- skippable FX time ----------------------------------------------------
// Animations must NEVER block input. When the player acts mid-playback the
// controller flips fast-forward on: every pending wait flushes instantly and
// all subsequent waits resolve immediately, so the stale batch jump-cuts to
// its end state and the player's new action plays fresh.
let fxSkip = false;
const fxWaiters = new Set<() => void>();
/** Turn fast-forward on/off. Turning it on flushes every pending FX wait. */
export function setFxSkip(on: boolean): void {
  fxSkip = on;
  if(on)clearBiblionFx();
  if (on) for (const r of [...fxWaiters]) r();
}
/** Timeout that resolves instantly while fast-forwarding. */
export function fxWait(ms: number): Promise<void> {
  if (fxSkip) return Promise.resolve();
  return new Promise((res) => {
    const done = (): void => { fxWaiters.delete(done); clearTimeout(t); res(); };
    const t = setTimeout(done, ms);
    fxWaiters.add(done);
  });
}
const wait = fxWait;
// raf is also flushable: a hidden tab never fires rAF, so a pending frame
// wait must still resolve the moment the player acts (fast-forward).
const raf = (): Promise<void> => {
  if (fxSkip) return Promise.resolve();
  return new Promise((r) => {
    const done = (): void => { fxWaiters.delete(done); r(); };
    fxWaiters.add(done);
    requestAnimationFrame(() => requestAnimationFrame(done));
  });
};
// ---- drag-play origin -----------------------------------------------------
// When YOU play a card by dragging it, the play FX used to start at the LEFT
// EDGE of the whole #hand element — so dragging the right-most card made the
// card "appear" from the far left and fly back. The hand card's own release
// rect (plus the drag vector) is stashed here on pointerup and consumed by the
// next play animation, so the FX continues exactly where your finger let go
// and keeps travelling in the direction you dragged.
export interface PlayOrigin {
  left: number; top: number; width: number; height: number;
  dx: number; dy: number; // drag vector (press → release)
}
let playOrigin: (PlayOrigin & { at: number }) | null = null;
export function setPlayOrigin(o: PlayOrigin | null): void {
  playOrigin = o ? { ...o, at: Date.now() } : null;
}
/** Consume the stashed drag origin (own side only, one-shot, 5s TTL). */
function takeOrigin(side: ViewSide): (PlayOrigin & { at: number }) | null {
  if (side !== "me") return null;
  const o = playOrigin;
  playOrigin = null;
  return o && Date.now() - o.at < 12000 ? o : null;
}
/** Origin rect for a hand-played card: the dragged card if we have it, else the hand. */
function fromRect(side: ViewSide, org: PlayOrigin | null): DOMRect | null {
  if (org) return new DOMRect(org.left, org.top, org.width, org.height);
  return handRect(side);
}
const handRect = (side: ViewSide): DOMRect | null => rectOf(side === "me" ? "#hand" : "#oppHand");
const rowRect = (side: ViewSide): DOMRect | null => rectOf(side === "me" ? "#meRow" : "#oppRow");
const discId = (side: ViewSide): string => (side === "me" ? "pile-myDisc" : "pile-oppDisc");
function trapZoneRect(side: ViewSide): DOMRect | null {
  const row = document.getElementById(side === "me" ? "meRow" : "oppRow");
  return (row?.querySelector(".zone-st .slot") ?? row?.querySelector(".zone-st .buff-icon"))?.getBoundingClientRect() ?? rowRect(side);
}
/** Place a node as a fixed-position floating overlay at a rect (top-left). */
function floatAt(node: HTMLElement, rect: { left: number; top: number }): HTMLElement {
  node.classList.add("fx-card-flight");
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
function backEl(side: ViewSide = "me"): HTMLElement {
  const d = document.createElement("div");
  d.className = "card card--back";
  const pile = document.querySelector(side === "me" ? "#pile-myDeck .pile-card" : "#pile-oppDeck .pile-card");
  d.style.backgroundImage = pile ? getComputedStyle(pile).backgroundImage : `url(${FRAME_BACK})`;
  d.style.width = "var(--card-w-hand)";
  d.style.height = "var(--card-h-hand)";
  return d;
}

/** The card takes focus across the screen, then returns to its destination.
 * All waits use the existing fast-forward mechanism; the overlay never takes input. */
async function focusCard(node: HTMLElement, side: ViewSide): Promise<void> {
  if (fxSkip) return;
  const veil = document.createElement("div"); veil.className = "cast-veil";
  document.body.appendChild(veil);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const w = node.offsetWidth || 100;
  const h = node.offsetHeight || 156;
  const scale = Math.min(innerHeight * .62 / h, innerWidth * .58 / w, 3.4);
  // Rasterize at the reveal's final CSS size before animating. Upscaling a
  // hand-sized compositing layer makes the entire frame and its text blurry.
  const revealW=w*scale,revealH=h*scale;
  node.style.width=`${revealW}px`;node.style.height=`${revealH}px`;
  node.style.setProperty('--cw',`${revealW}px`);node.style.setProperty('--ch',`${revealH}px`);
  node.querySelectorAll<HTMLElement>('[style]').forEach(el=>{if(el.style.fontSize.endsWith('px'))el.style.fontSize=`${parseFloat(el.style.fontSize)*scale}px`;});
  node.style.transformOrigin = "top left";
  node.classList.add("cast-reveal");
  node.style.transform = reduced ? "none" : `perspective(1400px) rotateX(12deg) rotateY(-18deg) scale(${.9/scale})`;
  node.classList.toggle("fx-opp-cast", side === "opp");
  try {
    await raf();
    node.style.transition = reduced ? "none" : `left .42s cubic-bezier(.16,1,.3,1), top .42s cubic-bezier(.16,1,.3,1), transform .5s cubic-bezier(.16,1,.3,1)`;
    node.style.left = `${(innerWidth - w * scale) / 2}px`;
    node.style.top = `${(innerHeight - h * scale) / 2}px`;
    node.style.transform = "perspective(1400px) rotateX(0deg) rotateY(0deg) scale(1)";
    await wait(reduced ? 120 : side === "opp" ? 1050 : 780);
  } finally { veil.remove(); node.classList.remove("cast-reveal"); }
}
function summonDust(rect: DOMRect): void {
  if (fxSkip || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  window.dispatchEvent(new CustomEvent("lore:summon-dust", { detail: rect }));
}
async function landCard(node: HTMLElement, to: DOMRect, fade = false): Promise<void> {
  const scale = to.width / (node.offsetWidth || 100);
  node.style.transition = `left .3s ${EASE}, top .3s ${EASE}, transform .3s ${EASE}, opacity .3s`;
  node.style.left = `${to.left}px`; node.style.top = `${to.top}px`;
  node.style.transform = `perspective(1400px) rotateX(8deg) rotateY(0deg) scale(${scale})`;
  if (fade) node.style.opacity = "0";
  await wait(310);
}
/** Exact transformed slot in screen coordinates, including the row's perspective
 * and frame aspect correction. No bounding-box-only approximation at landing. */
export const fieldPlacement = projectedPlacement;
/** Morph the reveal into its actual field face during one continuous flight.
 * The landing face stays until the controller replaces it with the same DOM. */
async function flyIntoSlot(reveal:HTMLElement,target:HTMLElement,face:HTMLElement,heavy=false):Promise<HTMLElement> {
  if(!target.isConnected || !reveal.isConnected)return face;
  const from=reveal.getBoundingClientRect();
  const w=target.offsetWidth,h=target.offsetHeight;
  floatAt(face,{left:0,top:0});face.classList.add('fx-field-ghost');
  face.style.visibility='visible';
  face.style.width=`${w}px`;face.style.height=`${h}px`;face.style.setProperty('--cw',`${w}px`);face.style.setProperty('--ch',`${h}px`);
  face.style.transformOrigin='0 0';
  const start=new DOMMatrix().translate(from.left,from.top).scale(from.width/w,from.height/h);
  const end=fieldPlacement(target,w,h);
  const rw=reveal.offsetWidth,rh=reveal.offsetHeight;
  reveal.getAnimations().forEach(a=>a.cancel());reveal.style.transition='none';reveal.style.left='0';reveal.style.top='0';reveal.style.transformOrigin='0 0';
  const oldStart=new DOMMatrix().translate(from.left,from.top).scale(from.width/rw,from.height/rh);
  const oldEnd=fieldPlacement(target,rw,rh);
  face.style.transform=end.toString();face.style.opacity='1';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration=reduced?120:heavy?960:620;
  const options:KeyframeAnimationOptions={duration,easing:'linear',fill:'both'};
  const hover=new DOMMatrix().translate(0,-Math.min(innerHeight*.18,w*1.35)).multiply(end).scale(1.06);
  const oldHover=new DOMMatrix().translate(0,-Math.min(innerHeight*.18,w*1.35)).multiply(oldEnd).scale(1.06);
  if(heavy&&!reduced&&!fxSkip)playBiblionFx('summon-charge',target);
  const moving=face.animate(heavy&&!reduced?[
    {transform:start.toString(),opacity:0,easing:'cubic-bezier(.16,.8,.25,1)'},
    {transform:hover.toString(),opacity:1,offset:.4},
    {transform:hover.toString(),opacity:1,offset:.6,easing:'cubic-bezier(.7,0,1,.4)'},
    {transform:end.toString(),opacity:1},
  ]:[{transform:start.toString(),opacity:0},{transform:end.toString(),opacity:1}],options);
  const old=reveal.animate(heavy&&!reduced?[
    {transform:oldStart.toString(),opacity:1,easing:'cubic-bezier(.16,.8,.25,1)'},
    {transform:oldHover.toString(),opacity:0,offset:.4},
    {transform:oldEnd.toString(),opacity:0},
  ]:[{transform:oldStart.toString(),opacity:1},{transform:oldEnd.toString(),opacity:0}],options);
  await wait(duration);
  moving.cancel();old.cancel();reveal.remove();face.style.transform=fieldPlacement(target,w,h).toString();
  if(!fxSkip){
    if(heavy&&!reduced){sfx('impact');playBiblionFx('summon-impact',face.getBoundingClientRect());
      window.dispatchEvent(new CustomEvent('lore:summon-impact',{detail:face.getBoundingClientRect()}));
      const objects=[face];
      const shakes=objects.map(el=>el.animate([{translate:'0 0'},{translate:'0 3px',offset:.12},{translate:'-1px -2px',offset:.3},{translate:'1px 1px',offset:.55},{translate:'0 0'}],{duration:240,easing:'ease-out'}));
      await wait(240);shakes.forEach(a=>a.cancel());
    }else summonDust(face.getBoundingClientRect());
  }
  return face;
}
export async function revealSpell(card: CardInst, side: ViewSide, dest: "discard" | "field" | "vanish",slotIndex?:number): Promise<HTMLElement|null> {
  const from = fromRect(side, takeOrigin(side)); if (!from) return null;
  const node = floatAt(cardEl(card, {size:"hand"}), from);
  try {
    await focusCard(node, side);
    const to = dest === "discard" ? rectOf("#" + discId(side)) : trapZoneRect(side);
    if (to && dest === "field" && (card.ench || card.t === "quest")) {
      const zone=document.querySelector(side==='me'?'#meRow .zone-st':'#oppRow .zone-st');
      const target=(slotIndex==null?zone?.querySelector('.slot'):zone?.children[Math.min(slotIndex,zone.children.length-1)]) as HTMLElement|null;
      if(target){
        const duration=enchantHasTurnCountdown(card)?`<span class="buff-duration"><span>${getLang()==='ja'?'残り':''}${card.val??1}</span></span>`:'<img class="buff-infinity" src="/art/biblion/modular/infinity.png" alt="">';
        const face=await flyIntoSlot(node,target,card.t==='quest'?questTile(card):enchantmentTile(card,duration));
        if(!fxSkip)playBiblionFx(card.t==='quest'?'quest':'enchant',face);
        return face;
      }
    } else if (dest === "discard") await landOnShelf(node,side,true);
    else if(dest === "vanish") await absorbIntoRift(node,side);
    else if (to) await landCard(node, to, true);
    if (dest === "discard") pileFlash(discId(side));
  } finally { node.remove(); }
  return null;
}
export async function summonFromHand(card: CardInst, uid: string, side: ViewSide): Promise<void> {
  const from = fromRect(side, takeOrigin(side)); const target = byUid(uid); const to = rectOf(target);
  if (!from || !to || !target) { summonIn(uid); return; }
  const ghost = floatAt(cardEl(card, {size:"hand"}), from); target.style.visibility = "hidden";
  let face:HTMLElement|undefined;
  try { await focusCard(ghost, side); face=await flyIntoSlot(ghost,target,target.cloneNode(true) as HTMLElement,true); }
  finally { ghost.remove(); face?.remove(); target.style.visibility = ""; }
}
/** Public hand-to-shelf movement, including the end-turn overflow picker. */
export async function discardFromHand(card:CardInst,side:ViewSide):Promise<void>{
  if(fxSkip)return;
  const source=document.querySelector<HTMLElement>(`${side==='me'?'#hand .card':'#oppHand .card--back'}[data-uid="${card.uid}"]`);
  const from=source?.getBoundingClientRect()||handRect(side);if(!from)return;
  const node=floatAt(cardEl(card,{size:'hand'}),from);node.dataset.discardFlight=card.uid;
  node.style.width=`${from.width}px`;node.style.height=`${from.height}px`;node.style.setProperty('--cw',`${from.width}px`);node.style.setProperty('--ch',`${from.height}px`);
  if(source)source.style.visibility='hidden';
  try{await landOnShelf(node,side);}finally{node.remove();}
}

/** Face-down plays reveal only the sleeve, never a trap's identity. */
export async function trapSetAnim(side: ViewSide): Promise<void> {
  const from = fromRect(side, takeOrigin(side));
  const zone = document.querySelector(side === "me" ? "#meRow .zone-st" : "#oppRow .zone-st");
  const to = zone?.querySelector(".slot")?.getBoundingClientRect() ?? trapZoneRect(side);
  if (!from || !to) return;
  const node = floatAt(backEl(side), from);
  try {
    await focusCard(node, side);
    const size = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--field-card-size")) || 60;
    await landCard(node, new DOMRect(to.left, to.top, size, size * .7), true);
  } finally { node.remove(); }
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
export async function buyReveal(card: CardInst, side: ViewSide, src: DOMRect | null, source?:HTMLElement|null, remaining=0): Promise<void> {
  if(fxSkip)return;
  const destination = card.quick ? (side === "me" ? "rift-me" : "rift-opp") : discId(side);
  const to = rectOf("#" + destination);
  if (!src || !to) { pileFlash(destination); return; }
  if(source){
    // Remove the last-stock face before any texture work or lift. Keep its slot
    // geometry stable until the authoritative board render replaces the market.
    source.classList.remove('is-armed');source.dataset.purchaseSource='true';
    if(remaining<=0){source.style.visibility='hidden';source.style.pointerEvents='none';source.setAttribute('aria-hidden','true');}
    else {const stock=source.querySelector('.mkt-stock');if(stock)stock.textContent=`×${remaining}`;}
    if(!card.quick){
      const target=document.getElementById(destination),print=cardEl(card,{size:'mkt'});
      try {if(target&&await boardMotionScope(signal=>moveOnBoard({kind:'purchase',source,target,card:print,signal}),3500))return;}
      catch { /* The projected fallback keeps the purchase pipeline alive. */ }
      if(fxSkip)return;
    }
  }
  const node = floatAt(cardEl(card, { size: "mkt" }), src);
  const pose=source?fieldPlacement(source,node.offsetWidth,node.offsetHeight):new DOMMatrix().translate(src.left,src.top);
  node.style.left='0';node.style.top='0';node.style.transformOrigin='0 0';node.style.transform=pose.toString();
  await raf();
  node.style.transition = `transform .26s ${EASE}`; node.style.transform = new DOMMatrix().translate(0,-22).multiply(pose).scale(1.08).toString();
  if(card.quick&&!fxSkip)playBiblionFx('quick',node);
  await wait(320);
  try { if(card.quick)await absorbIntoRift(node,side);else await landOnShelf(node,side); }
  finally {node.remove();}

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
  if (kind === "dmg" && amount > 0) {
    const portrait = document.getElementById(side === "me" ? "portraitMe" : "portraitOpp");
    portrait?.classList.remove("is-hurt");
    if (portrait) { void portrait.offsetWidth; portrait.classList.add("is-hurt"); setTimeout(() => portrait.classList.remove("is-hurt"), 680); }
  }
  const bar = document.getElementById("hpbar-" + side);
  const num = document.getElementById("hp-" + side);
  if(kind==='heal'&&amount>0&&!fxSkip)playBiblionFx('heal',()=>document.getElementById(side==='me'?'portraitMe':'portraitOpp')?.getBoundingClientRect()??null);
  if (bar && kind==='dmg') { bar.classList.add("shake"); setTimeout(() => bar.classList.remove("shake"), 400); }
  if (num) { num.classList.add(kind === "dmg" ? "hp-hit" : "hp-heal"); setTimeout(() => num.classList.remove("hp-hit", "hp-heal"), 450); }
  if(kind==='dmg')floatNum(bar || num, "-" + amount, kind);
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

/**
 * Hearthstone-style attack: the attacker card winds up, CHARGES into its
 * target (an enemy monster, or the defending player's HP bar on a direct
 * attack), slams with an impact burst + screen shake, then snaps back.
 * `onImpact` fires exactly at the moment of contact (e.g. to shake the victim).
 */
export async function attackStrike(uid: string, targetUid: string | null, defender: ViewSide, onImpact?: () => void): Promise<void> {
  const n = byUid(uid);
  if (!n) return;
  const direct = !targetUid;
  const tEl: Element | null = targetUid ? byUid(targetUid) : document.querySelector(defender === "me" ? "#portraitMe .avatar" : "#portraitOpp .avatar");
  const to = tEl ? tEl.getBoundingClientRect() : null;
  const from = n.getBoundingClientRect();
  if (!to) { lunge(uid, defender === "opp" ? "up" : "down"); await wait(460); onImpact?.(); return; }

  const cx = to.left + to.width / 2 - (from.left + from.width / 2);
  const cy = to.top + to.height / 2 - (from.top + from.height / 2);
  // stop just short of the target center so the card's edge visually slams it
  const k = direct ? 0.94 : 0.82;
  const dx = cx * k, dy = cy * k;
  const dur = direct ? 660 : 570;

  n.classList.add("striking");
  const moving=floatAt(n.cloneNode(true) as HTMLElement,{left:0,top:0});moving.removeAttribute('data-uid');moving.classList.add('attack-flight');
  const w=n.offsetWidth,h=n.offsetHeight,start=fieldPlacement(n,w,h);
  moving.style.width=`${w}px`;moving.style.height=`${h}px`;moving.style.setProperty('--cw',`${w}px`);moving.style.setProperty('--ch',`${h}px`);moving.style.transformOrigin='0 0';
  const pose=(x:number,y:number)=>new DOMMatrix().translate(x,y).multiply(start).toString();
  n.style.visibility='hidden';moving.style.visibility='visible';
  const anim = moving.animate([
    { transform:pose(0,0), easing:"cubic-bezier(.5,0,.8,.4)" },
    { transform:pose(-cx*.1,-cy*.1), offset:.32, easing:"cubic-bezier(.7,0,.85,.4)" },
    { transform:pose(dx,dy),offset:.6 },
    { transform:pose(dx*.96,dy*.96),offset:.7,easing:"cubic-bezier(.2,.6,.4,1)" },
    { transform:pose(0,0) },
  ], {duration:dur,easing:'linear',fill:'none'});

  await wait(dur * 0.6); // ...until the moment of contact
  impactBurst(to.left + to.width / 2, to.top + to.height / 2, direct);
  boardShake(direct ? "hard" : "soft");
  onImpact?.();
  // the return travel is decorative — wait skippably instead of on anim.finished
  await wait(dur * 0.4);
  anim.cancel();moving.remove();n.style.visibility='';n.classList.remove('striking');
}

/** Radial flash + flying sparks at the point of impact. */
function impactBurst(x: number, y: number, big: boolean): void {
  const b = document.createElement("div");
  b.className = "impact-burst" + (big ? " big" : "");
  b.style.left = x + "px";
  b.style.top = y + "px";
  const shards = big ? 12 : 8;
  for (let i = 0; i < shards; i++) {
    const s = document.createElement("i");
    const a = (Math.PI * 2 * i) / shards + Math.random() * 0.6;
    const d = (big ? 64 : 42) + Math.random() * 34;
    s.style.setProperty("--tx", Math.cos(a) * d + "px");
    s.style.setProperty("--ty", Math.sin(a) * d + "px");
    b.appendChild(s);
  }
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 520);
}

/** Shake the whole board — soft for monster trades, hard for face hits. */
function boardShake(kind: "soft" | "hard"): void {
  // Shake the common parent of the DOM board and WebGL canvas. Transforming
  // only .game creates a stacking context below the opaque table canvas.
  const el = document.querySelector(".game")?.parentElement;
  if (!el) return;
  el.classList.remove("shake-soft", "shake-hard");
  void el.offsetWidth; // restart the animation if one is mid-flight
  el.classList.add("shake-" + kind);
  setTimeout(() => el.classList.remove("shake-" + kind), kind === "hard" ? 450 : 340);
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

/** Public reshuffle event drives the rack-to-deck flight, before draw playback. */
export async function animateReshuffle(side:ViewSide,count:number):Promise<void> {
  const prefix=side==='me'?'pile-my':'pile-opp';
  const shelf=document.getElementById(prefix+'Disc'),deck=document.getElementById(prefix+'Deck');
  if(!shelf||!deck||count<=0||fxSkip||document.hidden||typeof WebGL2RenderingContext==='undefined'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const abort=new AbortController(),cancel=()=>abort.abort();
  const cancelled=new Promise<void>(resolve=>abort.signal.addEventListener('abort',()=>resolve(),{once:true}));
  fxWaiters.add(cancel);window.addEventListener('resize',cancel,{once:true});document.addEventListener('visibilitychange',cancel,{once:true});
  const deadline=setTimeout(cancel,4300);
  try {
    await Promise.race([cancelled,moveOnBoard({kind:'shuffle',source:shelf,target:deck,count,signal:abort.signal})]);
  } catch { /* Keep the state pipeline alive on an unavailable GPU/module. */ }
  finally {
    clearTimeout(deadline);cancel();fxWaiters.delete(cancel);
    window.removeEventListener('resize',cancel);document.removeEventListener('visibilitychange',cancel);
    // Presentation only. The authoritative post-action snapshot follows next.
    deck.dataset.count=String(count);shelf.dataset.count='0';
    const dc=deck.querySelector('.pile-count'),sc=shelf.querySelector('.pile-count');
    if(dc)dc.textContent=String(count);if(sc)sc.textContent='0';
  }
}

/** Real paper geometry during travel; DOM remains the accessible resting card. */
export async function animateDraw(handEl: HTMLElement | null, count: number, side: ViewSide = "me"): Promise<void> {
  const deck = document.getElementById(side === "me" ? "pile-myDeck" : "pile-oppDeck");
  if (!handEl || !deck || count <= 0 || fxSkip || document.hidden ||
      typeof WebGL2RenderingContext === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cards = Array.from(handEl.querySelectorAll<HTMLElement>(side === "me" ? ".card" : ".card--back"));
  const incoming = cards.slice(-Math.min(count, 6)).filter(n => n.getBoundingClientRect().width > 0);
  const origin = (deck.querySelector('.pile-draw-anchor') || deck.querySelector('.pile-card') || deck).getBoundingClientRect();
  if (!origin.width || !incoming.length) return;
  const abort = new AbortController();
  const cancel = (): void => abort.abort();
  const cancelled = new Promise<void>(resolve => abort.signal.addEventListener('abort', () => resolve(), { once: true }));
  const visibility = new Map(incoming.map(node => [node, node.style.visibility]));
  const restore = (node: HTMLElement): void => { node.style.visibility = visibility.get(node) ?? ''; };
  fxWaiters.add(cancel);
  window.addEventListener('resize', cancel, { once: true });
  document.addEventListener('visibilitychange', cancel, { once: true });
  incoming.forEach(node => { node.style.visibility = 'hidden'; });
  pileFlash(deck.id);
  const deadline = setTimeout(cancel, 4200);
  try {
    await Promise.race([cancelled, import('./paperDraw').then(async ({ drawPaperCards }) => {
      if (abort.signal.aborted || fxSkip || !handEl.isConnected) return;
      await drawPaperCards({ cards: incoming, origin, sleeve: deck.dataset.sleeve || FRAME_BACK,
        reveal: side === 'me', signal: abort.signal, onLand: node=>{restore(node);if(deck.dataset.openingCount!=null){deck.dataset.count=String(Math.max(Number(deck.dataset.openingCount),Number(deck.dataset.count)-1));const c=deck.querySelector('.pile-count');if(c)c.textContent=deck.dataset.count;}} });
    })]);
  } catch { /* Unsupported GPU or unavailable module: reveal the resting cards. */ }
  finally {
    clearTimeout(deadline); cancel(); fxWaiters.delete(cancel);
    window.removeEventListener('resize', cancel);
    document.removeEventListener('visibilitychange', cancel);
    incoming.forEach(restore);
    if(deck.dataset.openingCount!=null){deck.dataset.count=deck.dataset.openingCount;delete deck.dataset.openingCount;const c=deck.querySelector('.pile-count');if(c)c.textContent=deck.dataset.count;}
  }
}

/** A scrollable grid of small, clickable card thumbnails (click → zoom that card). */
function miniCardGrid(ids: string[]): HTMLElement {
  const grid = document.createElement("div");
  grid.className = "ztc-grid";
  for (const id of ids) {
    const def = DB[id];
    if (!def) continue;
    const inst = { ...def, uid: `rel_${id}` } as CardInst;
    const mini = cardEl(inst);
    mini.onclick = (e) => { e.stopPropagation(); zoomCard(inst); };
    grid.appendChild(mini);
  }
  return grid;
}

// right-click to enlarge any card
export function zoomCard(c: CardInst, hp?: { now: number; max: number }, stateText?: string): void {
  closeZoom();
  const ov = document.createElement("div");
  ov.className = "zoom-overlay";
  ov.id = "zoomOverlay";
  const wrap = document.createElement("div");
  wrap.className = "zoom-wrap";
  ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', cardName(c));
  const heading = document.createElement('header'); heading.className = 'inspect-heading';
  const title = document.createElement('h1'); title.textContent = cardName(c);
  const type = document.createElement('span'); type.className = 'inspect-type';
  const labels = getLang() === 'ja' ? ['モンスター','魔法','罠'] : getLang() === 'en' ? ['Monster','Spell','Trap'] : ['몬스터','마법','함정'];
  type.textContent = labels[c.t === 'mon' ? 0 : c.t === 'trap' ? 2 : 1];
  const close = document.createElement('button'); close.className = 'inspect-close'; close.textContent = '×';
  close.setAttribute('aria-label', getLang() === 'ja' ? '閉じる' : getLang() === 'en' ? 'Close' : '닫기');
  close.onclick = closeZoom;
  heading.append(title, type, close); wrap.append(heading);
  const details = document.createElement('section'); details.className = 'zoom-details'; details.tabIndex = 0;
  details.setAttribute('aria-label', getLang() === 'ja' ? 'カード効果と関連情報' : getLang() === 'en' ? 'Card rules and related information' : '카드 효과와 관련 정보');
  if (stateText) { const state = document.createElement('div'); state.className = 'inspect-state'; state.textContent = stateText; details.append(state); }
  details.append(cardRulesEl(c));
  details.onclick = e => e.stopPropagation();
  wrap.appendChild(cardEl(c, { fullArt: true, ...(hp ? { hpNow: hp.now, hpMax: hp.max } : {}) }));
  // "(지속)" 스탯 변화 카드: 필드에 있는 동안만 유지된다는 각주
  if (/\((?:지속|持続|lasting)\)/.test(cardText(c))) {
    const note = document.createElement("div");
    note.className = "zoom-note";
    note.textContent = t("card.dur.note");
    details.appendChild(note);
  }
  // 패시브 키워드 패널: 카드가 가진 패시브(부여분 포함)의 이름+설명을 우측에 표시.
  // 카드 텍스트의 키워드명을 hover(터치: 탭)하면 해당 설명이 하이라이트된다.
  const psvKeys = [...new Set([...cardPassives(c), ...(((c as { passivesG?: string[] }).passivesG) ?? [])])];
  if (psvKeys.length) {
    const lang0 = getLang();
    const panel = document.createElement("div");
    panel.className = "zoom-tribe zoom-psv";
    panel.innerHTML = `<h3>${t("psv.title")}</h3>` + psvKeys.map((k) => {
      const p = PASSIVES[k];
      if (!p) return "";
      const loc = lang0 === "ja" ? p.ja : lang0 === "en" ? p.en : p.ko;
      return `<div class="psv-item" data-psv="${k}"><b class="psv-name">${loc.name}</b><div class="psv-desc">${loc.desc}</div></div>`;
    }).join("");
    details.appendChild(panel);
    // hover/탭 → 우측 설명 하이라이트 (카드 텍스트 안의 .psv 스팬과 연결)
    details.querySelectorAll<HTMLElement>(".psv").forEach((sp) => {
      const key = sp.dataset.psv!;
      const item = panel.querySelector<HTMLElement>(`.psv-item[data-psv="${key}"]`);
      if (!item) return;
      sp.addEventListener("pointerenter", () => item.classList.add("hl"));
      sp.addEventListener("pointerleave", () => item.classList.remove("hl"));
      sp.addEventListener("click", (e) => { e.stopPropagation(); item.classList.toggle("hl"); });
    });
  }
  if (c.tribe && TRIBES[c.tribe]) {
    const info = TRIBES[c.tribe][getLang()];
    const panel = document.createElement("div");
    panel.className = "zoom-tribe";
    panel.innerHTML = `<h3>${info.name} ${t("tribe.suffix")}</h3><div class="note">${info.note}</div>` + info.bonuses.map((b) => `<div class="b">• ${b}</div>`).join("");
    // the OTHER cards of this tribe as clickable thumbnails, so you know what to collect
    const members = Object.values(DB).filter((x) => x.t === "mon" && x.tribe === c.tribe && x.id !== c.id).map((x) => x.id);
    if (members.length) {
      const box = document.createElement("div");
      box.className = "zoom-tribe-cards";
      box.innerHTML = `<div class="ztc-head">${t("tribe.others")}</div>`;
      box.appendChild(miniCardGrid(members));
      panel.appendChild(box);
    }
    details.appendChild(panel);
  }
  // cards that SUMMON or REFERENCE other specific cards → show those cards
  const related = relatedCardIds(c.id);
  if (related.length) {
    const panel = document.createElement("div");
    panel.className = "zoom-tribe zoom-related";
    panel.innerHTML = `<h3>${t("card.related")}</h3><div class="ztc-head" style="margin-top:2px">${t("card.related.sub")}</div>`;
    panel.appendChild(miniCardGrid(related));
    details.appendChild(panel);
  }
  if (c.star === "chest") {
    const odds = CHEST_ODDS[getLang()];
    const panel = document.createElement("div");
    panel.className = "zoom-tribe";
    panel.innerHTML = `<h3>${odds.title}</h3>` + odds.rows.map((r) => `<div class="b">• ${r}</div>`).join("");
    details.appendChild(panel);
  }
  wrap.append(details);
  ov.appendChild(wrap);
  ov.onclick = closeZoom;
  ov.oncontextmenu = (e) => { e.preventDefault(); closeZoom(); };
  document.body.appendChild(ov);
  ov.onkeydown = e => {
    if (e.key === 'Escape') { e.stopPropagation(); closeZoom(); }
    if (e.key === 'Tab') {
      const focusable = Array.from(ov.querySelectorAll<HTMLElement>('button,[tabindex="0"]'));
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  };
  close.focus({ preventScroll: true });
}
export function closeZoom(): void {
  document.getElementById("zoomOverlay")?.remove();
}

/**
 * Bind "enlarge" to an element: right-click on desktop, long-press on touch.
 * A long-press swallows the tap so it does NOT also play/attack with the card.
 */
export function bindZoom(el: HTMLElement, card: CardInst, hp?: { now: number; max: number }, stateText?: string): void {
  el.oncontextmenu = (e) => { e.preventDefault(); zoomCard(card, hp, stateText); };
  // Intent, not speculation: by the time a pointer is resting on a card, a
  // right-click or a 380ms long-press is at most a few hundred ms away. Start
  // the full-resolution art then, so the overlay has it by the time it opens.
  // (`prefetchZoomArt` de-dupes, so the repeated hovers cost nothing.)
  const warm = (): void => prefetchZoomArt(card.id, true);
  el.addEventListener("pointerenter", warm);
  let timer = 0, sx = 0, sy = 0, fired = false;
  el.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    warm();                       // 380ms of head start before the long-press fires
    fired = false;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    clearTimeout(timer);
    timer = window.setTimeout(() => { fired = true; zoomCard(card, hp, stateText); }, 380);
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
/** Turn-start banner: a slim ribbon sweeping across mid-screen ("자신의 턴" / "상대 턴"). */
export function turnBanner(mine: boolean, turn?: number): void {
  document.querySelectorAll(".fx-turnbanner").forEach((n) => n.remove());
  const b = document.createElement("div");
  b.className = "fx-turnbanner" + (mine ? " mine" : " opp");
  b.setAttribute('role', 'status'); b.setAttribute('aria-live', 'polite');
  b.innerHTML = `<span>${mine ? t("fx.yourturn") : t("fx.oppturn")}</span>${turn == null ? "" : `<small>TURN ${turn}</small>`}`;
  document.body.appendChild(b);
  setTimeout(() => { b.classList.add("out"); setTimeout(() => b.remove(), 320); }, mine ? 1900 : 1500);
}

/** One-shot pill above a field monster ("💢 기합 발동!") — state changes the board can't show. */
export function flashBadge(uid: string, text: string, kind: "good" | "bad" = "good"): void {
  const n = byUid(uid);
  if (!n) return;
  const r = n.getBoundingClientRect();
  const b = document.createElement("div");
  b.className = "fx-psv-flash " + kind;
  b.textContent = text;
  b.style.left = r.left + r.width / 2 + "px";
  b.style.top = r.top + 4 + "px";
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 1150);
}

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

/**
 * Summon shown as a floating ghost card: flies from the hand into the target
 * field slot and STAYS there (the real board re-renders later). Returns the
 * ghost node so a same-batch destroy can kill it visibly.
 */
export async function ghostSummon(card: CardInst, side: ViewSide, _slotIndex: number): Promise<HTMLElement | null> {
  const from = fromRect(side, takeOrigin(side)); const zone=monZoneEl(side);
  if(!from||!zone)return null;
  const target=reserveMonster(zone,card.uid);
  if (!target) return null;
  const node = floatAt(cardEl(card, { size: "hand", fullArt:true }), from);
  try {
    await focusCard(node, side);
    const face=await flyIntoSlot(node,target,cardEl(card,{field:true}),true);
    // Hand the exact landing face to the lane before another summon opens space.
    face.removeAttribute('style');face.classList.remove('fx-field-ghost','fx-card-flight');
    target.replaceWith(face);return face;
  } finally { node.remove(); }
}

/** Kill a summon ghost: death flash then fly a card frame to that side's discard. */
export async function ghostDie(node: HTMLElement, side: ViewSide): Promise<void> {
  const from = node.getBoundingClientRect();
  node.classList.add("mdie");
  await wait(320);
  if(node.closest(".zone-mon"))node.style.visibility="hidden";else node.remove();
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
  const meter = document.getElementById("hpbar-" + side);
  meter?.setAttribute("aria-valuenow", String(Math.max(0, hp)));
  meter?.setAttribute("aria-valuemax", String(maxHp));
  const max = document.querySelector(`#portrait${side === "me" ? "Me" : "Opp"} .pt-hp-max`);
  if (max) max.textContent = `/${maxHp}`;
  const fill = meter?.querySelector("i") as HTMLElement | null;
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
  if(amount<=0||fxSkip)return;
  playBiblionFx('mana',()=>{const cluster=document.getElementById('hpbar-'+side)?.closest('.pcluster');return (cluster?.querySelector('.pips')||cluster?.querySelector('.mana-group'))?.getBoundingClientRect()??null;});
  await wait(1850);
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
  const bar = document.getElementById("hpbar-" + side)?.closest(".pcluster") as HTMLElement | null;
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
  document.querySelector(".game")?.parentElement?.classList.add("fx-quake");
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
  document.querySelector(".game")?.parentElement?.classList.remove("fx-quake");
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

/** Every temporary renderer has one cancellation path, including tab/viewport changes. */
async function boardMotionScope(run:(signal:AbortSignal)=>Promise<boolean>,deadline=5000):Promise<boolean>{
  const abort=new AbortController(),cancel=()=>abort.abort();fxWaiters.add(cancel);
  window.addEventListener('resize',cancel);document.addEventListener('visibilitychange',cancel);
  const timer=setTimeout(cancel,deadline);
  try{return await Promise.race([run(abort.signal),new Promise<boolean>(r=>abort.signal.addEventListener('abort',()=>r(false),{once:true}))]);}
  finally{clearTimeout(timer);cancel();fxWaiters.delete(cancel);window.removeEventListener('resize',cancel);document.removeEventListener('visibilitychange',cancel);}
}
async function landOnShelf(node:HTMLElement,side:ViewSide,spell=false):Promise<void>{
  const target=document.getElementById(discId(side));if(!target||fxSkip)return;
  let current:DOMRect|null=null,started=false;
  const moved=await boardMotionScope(signal=>moveOnBoard({kind:'arrival',target,card:node,signal,onFrame:spell?r=>{current=r;if(!started&&!fxSkip){started=true;playBiblionFx('spell',()=>current);}}:undefined}));
  if(!moved&&!fxSkip){
    const r=(target.querySelector('.pile-card')||target).getBoundingClientRect();if(spell&&!fxSkip)playBiblionFx('spell',node);await landCard(node,r);
    // Fallback stays visible until the authoritative board replaces it.
    const copy=node.cloneNode(true) as HTMLElement;copy.classList.add('pile-arrival-fallback');document.body.append(copy);
    const observer=new MutationObserver(()=>{if(!target.isConnected){copy.remove();observer.disconnect();}});
    observer.observe(document.body,{subtree:true,childList:true});setTimeout(()=>{copy.remove();observer.disconnect();},5000);
  }
}
export async function absorbIntoRift(node:HTMLElement,side:ViewSide):Promise<void>{
  const target=document.getElementById(side==='me'?'rift-me':'rift-opp');if(!target||fxSkip)return;
  const a=node.getBoundingClientRect(),b=target.getBoundingClientRect();
  const x=b.left+b.width/2,y=b.top+b.height/2;
  target.classList.add('is-absorbing');
  const w=node.offsetWidth||a.width,h=node.offsetHeight||a.height;
  const start=node.style.transform.startsWith('matrix')?new DOMMatrix(node.style.transform):new DOMMatrix().translate(a.left,a.top).scale(a.width/w,a.height/h);
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  let started=false;
  try{
    if(!reduced&&typeof WebGL2RenderingContext!=='undefined'){
      try{const {swallowRiftCard}=await import('./riftScene');
        await boardMotionScope(async signal=>{await swallowRiftCard(node,target,start,signal,()=>{started=true;});return true;},5000);
      }catch{ /* Preserve a complete pull into the aperture without GPU. */ }
      if(started||fxSkip)return;
    }
    node.style.left='0';node.style.top='0';node.style.transformOrigin='0 0';node.style.transition='none';
    const end=new DOMMatrix().translate(x,y).scale(0);
    const duration=reduced?100:900;
    const motion=node.animate([{transform:start.toString()},{transform:end.toString()}],{duration,easing:'cubic-bezier(.55,.02,.6,1)',fill:'forwards'});
    try{await wait(duration);}finally{motion.cancel();}
  }finally{target.classList.remove('is-absorbing');}
}
export async function exileCard(card:CardInst,side:ViewSide,source?:HTMLElement|null):Promise<void>{
  const r=source?.getBoundingClientRect()||rectOf('#'+discId(side));if(!r)return;
  const node=floatAt(source?source.cloneNode(true) as HTMLElement:cardEl(card,{size:'hand'}),r);node.style.visibility='visible';if(source){node.style.width=`${source.offsetWidth}px`;node.style.height=`${source.offsetHeight}px`;node.style.left='0';node.style.top='0';node.style.transformOrigin='0 0';node.style.transform=fieldPlacement(source,source.offsetWidth,source.offsetHeight).toString();source.style.visibility='hidden';}
  try{await absorbIntoRift(node,side);}finally{node.remove();} // The old source stays hidden until the authoritative board render.
}
export async function openingBoard():Promise<void>{
  const root=document.querySelector<HTMLElement>('.game')?.parentElement;
  if(root)await waitForDuel(root);
  if(fxSkip||typeof WebGL2RenderingContext==='undefined'||!root?.isConnected)return;
  await boardMotionScope(signal=>moveOnBoard({kind:'opening',signal}),7500);
}

/** Pulse the exact public source, not every remaining spell on the board. */
export function enchantActivation(uid:string):void{if(fxSkip)return;const source=document.querySelector<HTMLElement>(`.buff-icon[data-uid="${CSS.escape(uid)}"]`);if(source)playBiblionFx('enchant',source);}
