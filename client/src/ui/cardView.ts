import {passiveIcon} from './passiveIcon';
// ============================================================
// LORE — card DOM builder. One renderer for every card everywhere
// (board / market / hand / pile / zoom) so sizing stays consistent.
// ============================================================
import { artUrl } from "./cardArt";
export { ART_V, artUrl } from "./cardArt";
import type { CardInst, FieldMon, PlayerState, GameState } from "../shared/types";
import { FRAME_BACK, PASSIVES, cardPassives, frameFor, fieldFrameFor } from "../shared/cards";
import { curHp, effAtk, effDef, playCost } from "../shared/engine";
import { cardName, cardText, getLang, t } from "../i18n";
import { parseDiceTable, effectSections } from "../shared/cardText";
import { cardEffectNotes } from "../shared/cardEffectNotes";
import { cardTypeLabel, quickSpellRule, displayPassives, referencedPassives, passiveSearchKeys, decayStateDescription } from '../shared/cardPresentation';

/** Shared resting/flight face: switching from a cast to its spell slot must not
 * replace the artwork or frame at touchdown. Interaction is bound by GameView. */
export function enchantmentTile(c:CardInst,durationUi:string):HTMLDivElement {
  const tile=document.createElement('div');tile.className='buff-icon buff-icon--spell';tile.dataset.uid=c.uid;tile.dataset.cardId=c.id;
  tile.innerHTML=`<span class="buff-frame" style="background-image:url(${fieldFrameFor('spell')})"></span><span class="buff-art" style="background-image:url(${artUrl.full(c.id)})"></span><span class="buff-cost" aria-hidden="true"><span>${c.cost}</span></span>${durationUi}`;
  return tile;
}

/** Same purple quest face in the public rail and its landing animation. */
export function questTile(c:CardInst,progress=0):HTMLDivElement {
  const tile=enchantmentTile(c,'');tile.className='buff-icon buff-icon--quest';
  tile.querySelector<HTMLElement>('.buff-frame')!.style.backgroundImage=`url(${fieldFrameFor('quest')})`;
  const label=document.createElement('span');label.className='quest-progress';label.textContent=`${progress}/${c.quest?.target??0}`;tile.append(label);
  return tile;
}

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
    txt = txt.split(name).join(passiveIcon(k));
  }
  return txt;
}

export interface CardOpts {
  game?: GameState; // live field conditions, including the opponent

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

/** Card names are sized once in card coordinates, never in animated screen
 * coordinates or relative to whichever other cards happen to be visible. */
export function cardNameScale(name:string):number {
 const units=[...name].reduce((n,ch)=>n+(/\s/.test(ch)?.32:ch.codePointAt(0)!>=0x2e80?1:/[MW@]/.test(ch)?.9:/[A-Z0-9]/.test(ch)?.68:/[il.,'!]/.test(ch)?.3:.57),0);
 return Math.min(.073,.69/Math.max(1,units));
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
const GALLERY_SIZES = "(max-width:650px) 118px, 134px";

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
  const src = full ? artUrl.full(cardId) : artUrl.sm(cardId);
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
  if (known === "ok" || (img.complete && img.naturalWidth)) done();
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
    img.srcset = `${artUrl.xs(cardId)} 192w, ${artUrl.sm(cardId)} 384w`;
  }
  img.src = src;
  art.appendChild(img);
  return art;
}

function ruleBlocks(text: string, className: string): HTMLElement {
  const container = el('div', className);
  for (const { heading, body } of effectSections(text)) {
    const section = el('section', 'card-effect-section');
    if (heading) {
      section.setAttribute('aria-label', heading);
      const label = el('h3', 'fx-tag'); label.textContent = heading; section.append(label);
    }
    for (const line of body.split('\n')) {
      const p = el('p', 'card-effect-body'); p.textContent = line; section.append(p);
    }
    container.append(section);
  }
  return container;
}

/** Complete rules, including costs, keyword names and dice tables. Never fitted to card pixels. */
export function cardRulesEl(c: CardInst, onPassiveClick?: (key: string) => void): HTMLElement {
  const pc = playCost(c);
  const rawTxt = cardText(c).trim();
  const table = rawTxt && rawTxt !== "—" ? parseDiceTable(rawTxt) : null;
  const txt = rawTxt;
  const hasCast = c.t !== "starter" && pc !== c.cost;
  const keyChips = displayPassives(c);
  const references = referencedPassives(c).filter(k => !keyChips.includes(k));
  const grants = passiveSearchKeys(c, 'granted');
  if ((txt && txt !== "—") || hasCast || keyChips.length || references.length) {
    const effCls = "card-rules";
    const eff = el("div", effCls);
    eff.lang = getLang();
    if (hasCast) {
      // monsters are SUMMONED, spells/traps are CAST — label the play-cost badge accordingly
      const cast = el("div", "card-cast", `${t(c.t === "mon" ? "card.summon" : "card.cast")} ${pc}`);
      cast.title = t(c.t === "mon" ? "card.summon.tip" : "card.cast.tip");
      eff.appendChild(cast);
    }
    for (const [group, keys] of [
      ['owned', keyChips],
      ['granted', references.filter(k => grants.includes(k))],
      ['references', references.filter(k => !grants.includes(k))],
    ] as const) {
      if (!keys.length) continue;
      const groupLabel = el('div', 'card-key-heading');
      groupLabel.textContent = {
        owned: {ja:'このカードが持つ能力',ko:'이 카드가 가진 능력',en:'Abilities this card has'},
        granted: {ja:'この効果で付与する能力',ko:'이 효과로 부여하는 능력',en:'Abilities granted by this effect'},
        references: {ja:'効果文に出てくる能力',ko:'효과 설명에 나오는 능력',en:'Abilities mentioned in the effect text'},
      }[group][getLang()];
      eff.append(groupLabel);
      const row = el("div", "card-keys" + (txt && txt !== "—" ? "" : " card-keys--only"));
      for (const k of keys) {
        const pd = PASSIVES[k];
        if (!pd) continue;
        const chip = el(onPassiveClick ? 'button' : 'span', 'card-key-label');
        chip.dataset.psv = k;
        chip.dataset.abilityGroup = group;
        if (onPassiveClick) {
          chip.setAttribute('type', 'button');
          const name = pd[getLang()].name;
          chip.setAttribute('aria-label', {ja:`${name}の説明へ`,ko:`${name} 설명으로 이동`,en:`Go to ${name} description`}[getLang()]);
          chip.onclick = e => { e.stopPropagation(); onPassiveClick(k); };
        }
        chip.insertAdjacentHTML('beforeend', passiveIcon(k));
        const name = el('span'); name.textContent = pd[getLang()].name; chip.append(name);
        row.append(chip);
      }
      if (row.childElementCount) eff.appendChild(row);
    }
    // Effect body follows the keyword labels.
    if (table) {
      if (table.head) eff.appendChild(ruleBlocks(table.head, 'card-dice-head'));
      const tb = el("div", "card-dice");
      tb.setAttribute('role', 'table');
      tb.setAttribute('aria-label', {ja:'ダイスの結果',ko:'주사위 결과',en:'Dice results'}[getLang()]);
      for (const [roll, fx] of table.rows) {
        const row = el("div", "dr");
        row.setAttribute('role', 'row');
        const label = el('span', 'dr-roll'); label.textContent = roll; label.setAttribute('role', 'rowheader');
        const body = el('span', 'dr-fx'); body.textContent = fx; body.setAttribute('role', 'cell');
        row.append(label, body);
        tb.appendChild(row);
      }
      eff.appendChild(tb);
    } else if (txt && txt !== "—") {
      eff.appendChild(ruleBlocks(txt, 'card-eff-txt'));
    }
    const notes = cardEffectNotes(c, getLang());
    if (notes.length) {
      const glossary = el("details", "card-rule-notes");
      const summary = el('summary'); summary.textContent = {ja:'用語・共通ルール',ko:'용어·공통 규칙',en:'Terms and shared rules'}[getLang()];
      glossary.append(summary);
      for (const text of notes) { const note = document.createElement('p'); note.textContent = text; glossary.append(note); }
      eff.append(glossary);
    }
    return eff;
  }
  const empty = el("div", "card-rules card-rules--empty");
  empty.textContent = getLang() === 'ja' ? '追加効果なし' : getLang() === 'en' ? 'No additional effect' : '추가 효과 없음';
  return empty;
}

/** Only compositing geometry: the frame, plaque and seals are generated PNG art. */
export function ensureCardCompositing(): void {
  if (document.getElementById('celestial-compositing')) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'celestial-compositing'; svg.setAttribute('aria-hidden','true'); svg.setAttribute('width','0'); svg.setAttribute('height','0');
  svg.style.position = 'absolute'; svg.style.pointerEvents = 'none';
  const baseWindow = 'M .082 .221 Q .082 .177 .134 .202 L .486 .202 L .5 .214 L .514 .202 L .868 .202 Q .925 .177 .922 .221 L .922 .89 Q .928 .932 .878 .94 Q .58 .966 .50 .934 Q .445 .965 .13 .94 Q .077 .933 .082 .887 Z';
  const fieldWindow = 'M .09 .158 Q .085 .088 .47 .054 L .50 .075 L .53 .054 Q .916 .088 .91 .158 L .91 .88 Q .916 .935 .87 .941 Q .59 .968 .50 .941 Q .42 .967 .13 .941 Q .087 .935 .09 .88 Z';
  svg.innerHTML = `<defs>
    <filter id="celestial-matte" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 10 10 10 0 -0.65" result="matte"/><feComposite in="SourceGraphic" in2="matte" operator="in"/></filter>
    <clipPath id="celestial-base-spell" clipPathUnits="objectBoundingBox"><path d="${baseWindow}"/></clipPath>
    <clipPath id="celestial-field-spell" clipPathUnits="objectBoundingBox"><path d="${fieldWindow}"/></clipPath>
  </defs>`;
  document.body.appendChild(svg);
}

export function cardEl(c: CardInst, opt: CardOpts = {}): HTMLElement {
  ensureCardCompositing();
  const typeClass = c.t === "mon" ? "card--mon" : c.t === "trap" ? "card--trap" : c.t === "starter" ? "card--starter" : c.t === "quest" ? "card--quest" : "card--spell";
  const sizeClass = opt.size === "mkt" ? "card--mkt" : opt.size === "hand" ? "card--hand" : "";
  const node = el("div", `card ${typeClass} ${sizeClass}`.trim());
  node.dataset.uid = c.uid;
  node.dataset.cardId = c.id;
  node.dataset.cardType = c.t === "mon" ? "mon" : c.t === "trap" ? "trap" : c.t === "quest" ? "quest" : "spell";
  const typeLabel = cardTypeLabel(c, getLang());

  if (opt.compactField) node.classList.add("card--field");
  // Complete raster face underneath the illustration and live typography.
  // The frame has its name plaque; cost and combat seals are separate raster layers.
  node.appendChild(artEl(c.id, opt.fullArt, lazyFor(opt.lazyArt), opt.lazyArt !== undefined));
  const frameEl = el("div", "card-frame");
  frameEl.style.backgroundImage = `url(${opt.compactField ? fieldFrameFor(c.t) : frameFor(c.t,opt.fullArt)})`;
  node.appendChild(frameEl);

  if (opt.playable) node.classList.add("is-playable");
  if (opt.buyable) node.classList.add("is-buyable");
  if (opt.dim) node.classList.add("is-dim");
  if (opt.attacker) node.classList.add("is-attacker");
  if (opt.targetable) node.classList.add("is-targetable");
  if (opt.exhausted) node.classList.add("is-exhausted");

  const cost = opt.costOverride != null ? opt.costOverride : c.cost;
  const numericSeal = (cls: string, value: number): HTMLElement => {
    const seal = el("div", cls);
    const face = el('span','seal-face'); face.setAttribute('aria-hidden','true');
    seal.appendChild(face);
    const label = el('span','seal-value',String(value));
    if (String(value).length > 3) label.style.fontSize = `${300 / String(value).length}%`;
    seal.appendChild(label);
    return seal;
  };
  node.appendChild(numericSeal("card-cost" + (cost >= 10 ? " card-cost--2d" : ""), cost));
  const nm = cardName(c);
  const nameEl2 = el("div", "card-name" + (nm.length >= 9 ? " card-name--long" : ""), nm);
  if (!opt.compactField) node.appendChild(nameEl2);
  node.setAttribute("aria-label", `${nm} · ${typeLabel} · ${cost}`);

  if (c.t === "mon") {
    const a = opt.field && opt.owner ? effAtk(opt.owner, c as FieldMon, opt.game) : c.atk!;
    // v24 HP-combat: the shield slot shows CURRENT HP — on the field AND in zoom
    // (v29: zoom used to show HP, so a damaged monster read as healthy there).
    // 체력은 몬스터 칩에 표시하지 않는다 (숫자 하나 + 손상 시 빨간색만).
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
    if (!(onField && isEgg)) node.appendChild(numericSeal("ad-atk" + (String(a).length >= 3 ? " ad-num--3d" : ""), a));
    if (!(onField && isEgg)) {
      node.appendChild(numericSeal("ad-def" + (hurt ? " ad-def--hurt" : "") + (String(d).length >= 3 ? " ad-num--3d" : ""), d));
    }
  }
  // ---- 상태 띠 (필드 타일 / 알) ------------------------------------------
  // 예전에는 카운터가 타일 한가운데(top:48%)에 떠서 일러스트를 가리고, 게다가
  // 키워드는 확대해야만 보였다 — 같은 카드인데 필드와 확대에서 읽히는 정보가
  // 달랐다. 이제 키워드 칩과 카운터를 하나의 띠로 묶어 공격/체력 칩 바로 위,
  // 항상 같은 자리에 둔다. 칩 모양은 확대 화면의 키워드 칩과 동일하다.
  {
    const lang0 = getLang();
    const label = (ja:string, en:string, ko:string):string => lang0 === 'ja' ? ja : lang0 === 'en' ? en : ko;
    const band = el("div", "card-status");
    if (c.quick || c.t === "quest") {
      const chip = el("span", "kw", typeLabel);
      chip.title = c.quick ? quickSpellRule(lang0) : label("発動後から条件を数え、達成時に報酬を1回獲得", "Counts progress after activation; earn the reward once", "발동 후 조건을 세고 달성시 보상 1회 획득");
      band.appendChild(chip);
    }
    const fm = c as FieldMon;
    // 1) 키워드 — 카드가 원래 가진 것 + 게임 중 부여된 것 (필드 타일에서만;
    //    손패/마켓/확대는 효과판의 키워드 칩 행이 같은 정보를 이미 보여준다)
    {
      const innate = displayPassives(c);
      const granted = fm.passivesG ?? [];
      for (const k of [...new Set([...innate,...granted,...((fm.guts??0)>0?['guts']:[])])]) {
        const count=k==='guts'?(fm.guts??0):0;
        band.insertAdjacentHTML('beforeend',passiveIcon(k,{count,granted:granted.includes(k)}));
      }
    }
    // 2) 카운터
    if (opt.field && c.aura === "assassinGuild") {
      band.appendChild(el("span", "ec ec-d", `${label('カウント','Count','카운트')} ${(c as { gcount?: number }).gcount ?? 0}/3`));
    }
    if (c.hatchTurns != null) {
      // 알: 필드에서는 실시간 값, 손패/마켓에서는 초기값
      const eggH = (c as { hatch?: number }).hatch ?? c.hatchTurns;
      const eggD = (c as { dur?: number }).dur ?? c.hatchDur ?? 4;
      band.appendChild(el("span", "ec ec-h", `${label('孵化','Hatch','부화')} ${eggH}`));
      band.appendChild(el("span", "ec ec-d", `${label('耐久','Durability','내구')} ${Math.max(0, eggD)}`));
    }
    if ((fm.decayCnt ?? 0) > 0) {
      const status = el('span', 'ec ec-decay-state');
      status.dataset.status = 'decay';
      status.textContent = `${label('腐敗', 'Decay', '부패')} ${fm.decayCnt}/3`;
      status.title = decayStateDescription(fm.decayCnt!, lang0);
      status.setAttribute('aria-label', status.title);
      band.append(status);
    }
    if (band.childElementCount) node.appendChild(band);
  }
  // Keep long names inside their frame using a stable card-local scale.
  if (!opt.compactField) nameEl2.style.fontSize = `calc(var(--cw) * ${cardNameScale(nm).toFixed(5)})`;
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
