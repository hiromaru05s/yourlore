import {cardRelations,REFERENCE_CARDS} from '../shared/cardReferences';
import {bindCardReferences} from './cardReferencePreview';
import type {CardInst} from '../shared/types';
import {DB,TRIBES,CHEST_ODDS,PASSIVES} from '../shared/cards';
import {cardTypeLabel,displayPassives,referencedPassives} from '../shared/cardPresentation';
import {cardStateEl} from './cardState';
import {cardEl,cardRulesEl,prefetchZoomArt} from './cardView';
import {t,getLang,cardName} from '../i18n';
import {passiveIcon} from './passiveIcon';
import {keywordRules} from '../shared/cardKeywordText';

// Shared inspection UI has no dependency on duel animation renderers.
/** A scrollable grid of small, clickable card thumbnails (click → zoom that card). */
function miniCardGrid(ids: string[]): HTMLElement {
  const grid = document.createElement("div");
  grid.className = "ztc-grid";
  for (const id of ids) {
    const def = REFERENCE_CARDS[id];
    if (!def) continue;
    const inst = { ...def, uid: `rel_${id}` } as CardInst;
    const mini = cardEl(inst);
    mini.tabIndex = 0; mini.setAttribute('role', 'button');mini.setAttribute('aria-label',cardName(inst));
    mini.onclick = (e) => { e.stopPropagation(); openRelatedCard(inst); };
    bindInspectContext(mini, () => openRelatedCard(inst));
    mini.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mini.click(); } };
    const item=document.createElement('div');item.className='related-card-item';
    const caption=document.createElement('span');caption.textContent=cardName(inst);caption.onclick=()=>mini.click();
    item.append(mini,caption);grid.appendChild(item);
  }
  return grid;
}

type ZoomSnapshot = { overlay: HTMLElement; focus: HTMLElement | null; scroll: {node:HTMLElement;top:number}[] };
const zoomHistory: ZoomSnapshot[] = [];
const closePreviews = new WeakMap<HTMLElement,(restoreFocus?:boolean)=>boolean>();
function closeCurrentPreview(restoreFocus=false):boolean { const ov=document.getElementById('zoomOverlay');return ov?closePreviews.get(ov)?.(restoreFocus)??false:false; }
let zoomOpener: HTMLElement | null = null;
function captureZoom(): ZoomSnapshot | null {
  const overlay = document.getElementById('zoomOverlay');
  return overlay ? { overlay, focus: document.activeElement as HTMLElement | null,
    scroll: Array.from(overlay.querySelectorAll<HTMLElement>('.zoom-wrap,.zoom-details')).map(node=>({node,top:node.scrollTop})) } : null;
}
function openRelatedCard(c: CardInst): void {
  closeCurrentPreview();
  if(document.getElementById('zoomOverlay')?.dataset.cardId===c.id)return;
  const previous = captureZoom();
  if (previous) { zoomHistory.push(previous); previous.overlay.remove(); }
  renderZoom(c);
}
function backToPreviousCard(): void {
  closeCurrentPreview();
  const previous = zoomHistory.pop(); if (!previous) return;
  document.getElementById('zoomOverlay')?.remove(); document.body.append(previous.overlay);
  previous.scroll.forEach(({node,top})=>{node.scrollTop=top;});
  previous.focus?.focus({preventScroll:true});
}

// Public entry starts a new inspection; only related-card navigation keeps history.
export function zoomCard(c: CardInst, hp?: { now: number; max: number; turn?: number }, stateText?: string, effect?:string): void {
  closeZoom();
  zoomOpener = document.activeElement as HTMLElement | null;
  renderZoom(c, hp, stateText, effect);
}
function renderZoom(c: CardInst, hp?: { now: number; max: number; turn?: number }, stateText?: string, effect?:string): void {
  const ov = document.createElement("div");
  ov.className = "zoom-overlay";
  ov.id = "zoomOverlay";
  ov.dataset.cardId=c.id;
  const wrap = document.createElement("div");
  wrap.className = "zoom-wrap";
  ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', cardName(c));
  const heading = document.createElement('header'); heading.className = 'inspect-heading';
  const headingCopy = document.createElement('div'); headingCopy.className = 'inspect-heading-copy';
  const controls = document.createElement('div'); controls.className = 'inspect-controls';
  const title = document.createElement('h1'); title.textContent = cardName(c);
  const type = document.createElement('span'); type.className = 'inspect-type';
  type.textContent = cardTypeLabel(c, getLang());
  const close = document.createElement('button'); close.className = 'inspect-close'; close.textContent = '×';
  close.setAttribute('aria-label', getLang() === 'ja' ? '閉じる' : getLang() === 'en' ? 'Close' : '닫기');
  close.onclick = closeZoom;
  if (zoomHistory.length) {
    const back = document.createElement('button'); back.type='button'; back.className='inspect-back';
    back.textContent={ja:'← 元のカード',ko:'← 이전 카드',en:'← Previous card'}[getLang()];
    back.onclick=e=>{e.stopPropagation();backToPreviousCard();}; controls.append(back);
  }
  const returnToRules = document.createElement('button'); returnToRules.type='button'; returnToRules.className='inspect-return-rules'; returnToRules.hidden=true;
  returnToRules.textContent={ja:'効果本文へ戻る',ko:'효과 본문으로',en:'Back to effect'}[getLang()];
  headingCopy.append(title, type); controls.append(returnToRules, close);
  heading.append(headingCopy, controls); wrap.append(heading);
  heading.onclick=e=>e.stopPropagation();
  const details = document.createElement('section'); details.className = 'zoom-details'; details.tabIndex = 0;
  details.setAttribute('aria-label', getLang() === 'ja' ? 'カード効果と関連情報' : getLang() === 'en' ? 'Card rules and related information' : '카드 효과와 관련 정보');
  const currentState = cardStateEl(c, hp); if (currentState) details.append(currentState);
  if (stateText) { const state = document.createElement('div'); state.className = 'inspect-state'; state.textContent = stateText; details.append(state); }
  details.append(cardRulesEl(c, key => {
    const item = details.querySelector<HTMLElement>(`.zoom-psv .psv-item[data-psv="${key}"]`);
    if (!item) return;
    const from = details.querySelector<HTMLElement>(`.card-key-label[data-psv="${key}"]`);
    const scroll = [wrap, details].map(node=>({node,top:node.scrollTop}));
    returnToRules.hidden=false;
    returnToRules.onclick=e=>{
      e.stopPropagation(); returnToRules.hidden=true;
      scroll.forEach(({node,top})=>{node.scrollTop=top;}); from?.focus({preventScroll:true});
    };
    item.style.scrollMarginTop = `${getComputedStyle(wrap).overflowY === 'auto' ? controls.offsetHeight + 16 : 16}px`;
    item.focus({ preventScroll: true });
    item.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'auto' });
  }));
  details.onclick = e => e.stopPropagation();
  // Reserve space for the cost/ATK/HP seals outside the card face.
  const cardStage = document.createElement('div'); cardStage.className = 'zoom-card-stage';
  cardStage.appendChild(cardEl(c, { fullArt: true, effect, ...(hp ? { hpNow: hp.now, hpMax: hp.max } : {}) }));
  wrap.appendChild(cardStage);
  // 패시브 키워드 패널: 카드가 가진 패시브(부여분 포함)의 이름+설명을 우측에 표시.
  // The rules header links each keyword's name and icon to its own explanation.
  const ownedKeys = displayPassives(c);
  const psvKeys = [...new Set([...ownedKeys, ...referencedPassives(c)])];
  if (psvKeys.length) {
    const lang0 = getLang();
    const panel = document.createElement("div");
    panel.className = "zoom-tribe zoom-psv";
    const panelTitle = {ja:'能力・用語の説明',ko:'능력·용어 설명',en:'Ability and term definitions'}[lang0];
    panel.innerHTML = `<h3>${panelTitle}</h3>` + psvKeys.map((k) => {
      const p = PASSIVES[k];
      if (!p) return "";
      const loc = lang0 === "ja" ? p.ja : lang0 === "en" ? p.en : p.ko;
      return `<div class="psv-item" id="zoom-passive-${k}" data-psv="${k}" tabindex="-1" role="group" aria-labelledby="zoom-passive-name-${k}"><b class="psv-name" id="zoom-passive-name-${k}">${passiveIcon(k)}<span>${loc.name}</span></b><dl class="psv-desc">${keywordRules(k, lang0, ownedKeys.includes(k) ? c : undefined).map(row => `<div class="psv-rule"><dt>${row.label}</dt><dd class="psv-rule-text">${row.text}</dd></div>`).join('')}</dl></div>`;
    }).join("");
    details.appendChild(panel);
    details.querySelectorAll<HTMLElement>(".card-key-label").forEach((sp) => {
      const key = sp.dataset.psv!;
      const item = panel.querySelector<HTMLElement>(`.psv-item[data-psv="${key}"]`);
      if (!item) return;
      sp.setAttribute('aria-controls', item.id);
      sp.addEventListener("pointerenter", () => item.classList.add("hl"));
      sp.addEventListener("pointerleave", () => item.classList.remove("hl"));
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
  const relations=cardRelations(c.id);
  const relationTitles={
    sources:{ja:'このカードを生み出すカード',ko:'이 카드를 생성하는 카드',en:'Cards that create this card'},
    generated:{ja:'このカードが生み出すカード',ko:'이 카드가 생성하는 카드',en:'Cards created by this card'},
    references:{ja:'このカードの関連カード',ko:'이 카드의 관련 카드',en:'Related cards'},
    referencedBy:{ja:'このカードに関連するカード',ko:'이 카드와 관련된 카드',en:'Cards linked to this card'},
  };
  for(const kind of ['sources','generated','references','referencedBy'] as const) {
    if(!relations[kind].length)continue;
    const panel=document.createElement('section');panel.className='zoom-tribe zoom-related';panel.dataset.relation=kind;
    const title=document.createElement('h3');title.textContent=relationTitles[kind][getLang()];panel.append(title,miniCardGrid(relations[kind]));
    if(kind==='sources')details.insertBefore(panel,details.querySelector('.zoom-tribe'));else details.append(panel);
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
  closePreviews.set(ov,bindCardReferences(ov,c,openRelatedCard));
  ov.onkeydown = e => {
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); if(!closeCurrentPreview(true))zoomHistory.length ? backToPreviousCard() : closeZoom(); }
    if (e.key === 'Tab') {
      const focusable = Array.from(ov.querySelectorAll<HTMLElement>('button,summary,[tabindex="0"]')).filter(node=>!node.closest('[hidden]'));
      const first = focusable[0], last = focusable[focusable.length - 1];
      const active = document.activeElement;
      // A keyword jump focuses a description after the last tab stop.
      const afterLast = active && last && !!(last.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_FOLLOWING);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && (active === last || afterLast)) { e.preventDefault(); first?.focus(); }
    }
  };
  close.focus({ preventScroll: true });
}
export function closeZoom(): void {
  closeCurrentPreview();
  document.getElementById("zoomOverlay")?.remove();
  zoomHistory.length=0;
  if (zoomOpener?.isConnected) zoomOpener.focus({preventScroll:true});
  zoomOpener=null;
}

/** Keep inspection gestures from reaching a parent pile or zoom overlay. */
export function bindInspectContext(el: HTMLElement, inspect: () => void): void {
  el.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); inspect(); };
}

/**
 * Bind "enlarge" to an element: right-click on desktop, long-press on touch.
 * A long-press swallows the tap so it does NOT also play/attack with the card.
 */
export function bindZoom(el: HTMLElement, card: CardInst, hp?: { now: number; max: number; turn?: number }, stateText?: string, effect?:string): void {
  bindInspectContext(el, () => zoomCard(card, hp, stateText, effect??el.dataset.cardEffect));
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
    timer = window.setTimeout(() => { fired = true; zoomCard(card, hp, stateText, effect??el.dataset.cardEffect); }, 380);
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
