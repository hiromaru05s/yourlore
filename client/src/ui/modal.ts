import { buyCost, playCost } from '../shared/engine';
import { automaticCastTargets, targetOwner, type PlayIntent } from '../shared/playIntent';
import {outcomeCrest} from './duelOutcome';
// ============================================================
// LORE — overlays: generic modal, confirm (surrender), win,
// treasure reveal, and the seek/recall card picker.
// ============================================================
import type { CardInst, GameState, Side } from "../shared/types";
import { attachDuelClock } from "./duelClock";
import { cardEl } from "./cardView";
import { bindZoom } from "./anim";
import { TRIBES } from "../shared/cards";
import { t, getLang, cardName, cardText } from "../i18n";

let root: HTMLElement | null = null;
let returnFocus:HTMLElement|null=null;
let releaseFocus:()=>void=()=>{};
let dialogSerial=0;
function getRoot(): HTMLElement {
  if (!root) { root = document.createElement("div"); root.id = "overlayRoot"; document.body.appendChild(root); }
  return root;
}
const notices=new Map<HTMLElement,ReturnType<typeof setTimeout>>();
export function closeTreasureNotices():void {notices.forEach((timer,node)=>{clearTimeout(timer);node.remove();});notices.clear();}
export function closeOverlay(): void {
 releaseFocus();getRoot().innerHTML='';if(returnFocus?.isConnected)returnFocus.focus();returnFocus=null;
}

function mount(node: HTMLElement): void {
  if(!getRoot().children.length)returnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  releaseFocus();
  node.setAttribute('role','dialog');node.setAttribute('aria-modal','true');node.tabIndex=-1;
  const title=node.querySelector('h2');if(title){title.id ||= 'lore-dialog-'+(++dialogSerial);node.setAttribute('aria-labelledby',title.id);}
  const focusables=()=>[...node.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')].filter(el=>el.getClientRects().length>0);
  const focus=()=>{(focusables()[0]??node).focus();};
  const keys=(event:KeyboardEvent)=>{if(event.key!=='Tab')return;const items=focusables(),at=items.indexOf(document.activeElement as HTMLElement);event.preventDefault();(items.length?items[(at+(event.shiftKey?-1:1)+items.length)%items.length]:node).focus();};
  const keepFocus=(event:FocusEvent)=>{if(node.isConnected&&!node.contains(event.target as Node))focus();};
  document.addEventListener('keydown',keys);document.addEventListener('focusin',keepFocus);
  releaseFocus=()=>{document.removeEventListener('keydown',keys);document.removeEventListener('focusin',keepFocus);};
  const ov = document.createElement("div");
  ov.className = "overlay";
  if (!node.classList.contains("outcome-result") && document.querySelector(".game .mp-clock.show")) { node.classList.add("duel-dialog"); attachDuelClock(node); }
  ov.appendChild(node);
  getRoot().innerHTML = "";
  getRoot().appendChild(ov);
  focus();
}

/** YES/NO confirm. Resolves true on confirm. */
export function confirmDialog(opts: { title: string; body?: string; confirm: string; cancel: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    const m = document.createElement("div");
    m.className = "modal";
    m.innerHTML = `<h2>${opts.title}</h2>${opts.body ? `<p>${opts.body}</p>` : ""}<div class="modal-row"></div>`;
    const row = m.querySelector(".modal-row")!;
    const no = document.createElement("button");
    no.className = "btn btn-ghost"; no.textContent = opts.cancel;
    const yes = document.createElement("button");
    yes.className = "btn " + (opts.danger ? "btn-danger" : "btn-primary"); yes.textContent = opts.confirm;
    let obs: MutationObserver | undefined;
    let done = false;
    const settle = (v: boolean): void => { if (done) return; done = true; obs?.disconnect(); resolve(v); };
    no.onclick = () => { settle(false); closeOverlay(); };
    yes.onclick = () => { settle(true); closeOverlay(); };
    m.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();no.click();}});
    row.append(no, yes);
    mount(m);
    // Another modal can EVICT this one (mount() wipes the overlay root — e.g. the
    // win modal appears while the surrender confirm is open). Resolve as
    // "cancelled" instead of leaving the awaiting caller hung forever.
    obs = new MutationObserver(() => { if (!m.isConnected) settle(false); });
    obs.observe(getRoot(), { childList: true });
  });
}

/** won: true=victory, false=defeat, null=draw (60-turn HP tie). */
export function winModal(won: boolean | null, detail: string, onAgain: () => void, onHome: () => void, onReview?: () => void): void {
  const m = document.createElement("div");
  m.className = "modal";
  const title = won == null ? t("modal.draw") : won ? t("modal.win") : t("modal.lose");
  m.className='modal outcome-result '+(won==null?'is-draw':won?'is-victory':'is-defeat');
  const color = "var(--outcome-light)";
  m.innerHTML = `<div class="outcome-eyebrow">BIBLION · ARCHIVE</div>${outcomeCrest(won)}<h2 style="color:${color}">${title}</h2><p id="winDetail" style="color:var(--paper);font-size:14px">${detail}</p><div class="win-rank" id="winRankDelta" style="display:none"></div><p>${t("modal.gameover")}</p><div class="modal-row"></div>`;
  const row = m.querySelector(".modal-row")!;
  const home = document.createElement("button"); home.className = "btn btn-ghost"; home.textContent = t("modal.home");
  home.onclick = () => { closeOverlay(); onHome(); };
  row.append(home);
  if (onReview) {
    const rev = document.createElement("button"); rev.className = "btn btn-ghost"; rev.textContent = t("modal.review");
    rev.onclick = () => { closeOverlay(); onReview(); };
    row.append(rev);
  }
  const again = document.createElement("button"); again.className = "btn btn-gold"; again.textContent = t("modal.again");
  again.onclick = () => { closeOverlay(); onAgain(); };
  row.append(again);
  mount(m);
}

/** Ranked pre-game market preview: study the fixed market before the coin toss.
    Returns handles so the caller can update the countdown (setUntil) and dismiss it (close). */
export function marketPreview(market: CardInst[], onReady: () => void): { setUntil(u: number | null): void; close(): void } {
  const m = document.createElement("div");
  m.className = "modal preview-modal";
  m.innerHTML = `<h2 style="font-size:16px">${t("preview.title")}</h2><p style="color:var(--paper-dim);font-size:13px;margin-bottom:8px">${t("preview.sub")}</p>`
    + `<div class="picker-grid" style="display:flex;gap:9px;flex-wrap:wrap;justify-content:center;margin:10px 0;max-height:52vh;overflow:auto"></div>`
    + `<div class="pv-foot" style="display:flex;align-items:center;justify-content:center;gap:16px;margin-top:10px"><div class="pv-count" id="pvCount" style="font-family:var(--mono);color:var(--brass-hi);font-size:13px;min-width:120px;text-align:right"></div><button class="btn btn-gold" id="pvReady">${t("preview.ready")}</button></div>`;
  const grid = m.querySelector(".picker-grid") as HTMLElement;
  for (const c of market) { const el = cardEl(c, {}); bindZoom(el, c); grid.appendChild(el); }
  const btn = m.querySelector("#pvReady") as HTMLButtonElement;
  const count = m.querySelector("#pvCount") as HTMLElement;
  let until: number | null = null;
  const tick = (): void => {
    if (until == null) { count.textContent = t("preview.waiting"); return; }
    const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
    count.textContent = left > 0 ? `${left}${t("preview.secs")}` : t("preview.starting");
  };
  const timer = window.setInterval(tick, 250);
  btn.onclick = () => { btn.disabled = true; btn.textContent = t("preview.waiting"); onReady(); };
  mount(m);
  tick();
  return {
    setUntil(u: number | null): void { until = u; tick(); },
    close(): void { clearInterval(timer); closeOverlay(); },
  };
}

/** Simple notice with a single button (e.g. disconnect). */
export function noticeModal(title: string, body: string, btn: string, onClick: () => void): void {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `<h2>${title}</h2><p>${body}</p><div class="modal-row"></div>`;
  const b = document.createElement("button"); b.className = "btn btn-primary"; b.textContent = btn;
  b.onclick = () => { closeOverlay(); onClick(); };
  m.querySelector(".modal-row")!.appendChild(b);
  mount(m);
}

/** Informational reward toast: never takes focus, blocks play, or evicts a choice. */
export function treasureModal(kind: string, text: string): void {
  const m=document.createElement('div');m.className='treasure-notice';
  m.setAttribute('role','status');m.setAttribute('aria-live','polite');
  const icon=document.createElement('span');icon.className='treasure-notice-icon';icon.setAttribute('aria-hidden','true');
  icon.textContent=kind==='mana'?'◆':kind==='hp'?'✚':kind==='mimic'?'◇':'♡';
  const body=document.createElement('div'),title=document.createElement('small'),detail=document.createElement('strong');
  title.textContent=t('treasure.title');detail.textContent=text;body.append(title,detail);m.append(icon,body);
  // A later reward replaces the previous visual but does not touch overlayRoot.
  closeTreasureNotices();document.body.append(m);
  notices.set(m,setTimeout(()=>{m.remove();notices.delete(m);},2200));
}

/** Tribe synergy info popup (tap a tribe tag). */
export function showTribeInfo(tribe: string): void {
  const info = TRIBES[tribe]?.[getLang()];
  if (!info) return;
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `<h2>${info.name} ${t("tribe.suffix")}</h2><div style="color:var(--vermil-hi);font-size:12px;margin-bottom:10px">${info.note}</div><div style="text-align:left;color:var(--paper);font-size:13px;line-height:1.8">${info.bonuses.map((b) => "• " + b).join("<br>")}</div><p style="margin-top:8px">${t("tribe.footer")}</p><div class="modal-row"></div>`;
  const ok = document.createElement("button");
  ok.className = "btn btn-gold"; ok.textContent = t("common.confirm"); ok.onclick = () => closeOverlay();
  m.querySelector(".modal-row")!.appendChild(ok);
  mount(m);
}

/** Is this session driven by touch? Decides WHICH control scheme the help panel
 *  describes — a phone gets the tap/drag wording, a desktop gets click/right-click.
 *  (pointer:coarse is the input device, not the window size, so a narrow desktop
 *  window still reads as desktop.) */
export function isTouchInput(): boolean {
  return typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
}

/** In-game "controls" panel. Opened from the ? button parked in a bottom corner. */
export function showControlsHelp(): void {
  const touch = isTouchInput();
  const rows: [string, string[]][] = touch
    ? [
        ["help.h.cards", ["help.t.zoom", "help.t.hand"]],
        ["help.h.play", ["help.t.play"]],
        ["help.h.attack", ["help.t.attack", "help.t.reorder"]],
        ["help.h.market", ["help.t.market"]],
      ]
    : [
        ["help.h.cards", ["help.d.zoom"]],
        ["help.h.play", ["help.d.play"]],
        ["help.h.attack", ["help.d.attack", "help.d.reorder"]],
        ["help.h.market", ["help.d.market"]],
      ];
  const m = document.createElement("div");
  m.className = "modal help-modal";
  m.innerHTML = `<h2>${t("help.title")}</h2>
    <div class="help-body">${rows.map(([h, ks]) => `
      <section><h3>${t(h)}</h3>${ks.map((k) => `<p>${t(k)}</p>`).join("")}</section>`).join("")}
    </div><div class="modal-row"></div>`;
  const ok = document.createElement("button");
  ok.className = "btn btn-gold"; ok.textContent = t("help.close"); ok.onclick = () => closeOverlay();
  m.querySelector(".modal-row")!.appendChild(ok);
  mount(m);
}

/** Seek/Recall picker. Calls onPick with chosen uid (or null on cancel). */
export function cardPicker(title: string, pool: CardInst[], onPick: (uid: string | null) => void, allowCancel = true, opts: { confirm?: boolean; label?: (uid:string)=>string } = {}): void {
  const m = document.createElement("div");
  m.className = "modal picker-modal"; m.style.maxWidth = "720px";
  m.innerHTML = `<h2 style="font-size:14px">${title}</h2><div class="picker-grid" style="display:flex;gap:9px;flex-wrap:wrap;justify-content:center;margin:16px 0;max-height:54vh;overflow:auto"></div><div class="modal-row"></div>`;
  const grid = m.querySelector(".picker-grid")!;
  let selected: string | null = null;
  const ok = document.createElement('button'); ok.className='btn btn-gold'; ok.textContent=t('picker.confirm'); ok.disabled=true;
  ok.onclick=()=>{if(selected){closeOverlay();onPick(selected);}};
  pool.forEach((c, i) => {
    const card = cardEl(c, { playable: true, lazyArt: i });
    card.onclick = () => {
      if(!opts.confirm){closeOverlay();onPick(c.uid);return;}
      selected=c.uid;grid.querySelectorAll('.is-picked').forEach(el=>el.classList.remove('is-picked'));card.classList.add('is-picked');ok.disabled=false;
    };
    if(opts.label){const label=document.createElement('div');label.textContent=opts.label(c.uid);label.className='picker-owner';const wrap=document.createElement('div');wrap.append(label,card);grid.append(wrap);}
    bindZoom(card, c); // 우클릭 / 길게 누르면 확대
    if(!opts.label) grid.appendChild(card);
  });
  if(opts.confirm) m.querySelector(".modal-row")!.appendChild(ok);
  const cancel = document.createElement("button");
  cancel.className = "btn btn-ghost"; cancel.textContent = t("common.cancel");
  cancel.onclick = () => { closeOverlay(); onPick(null); };
  if (allowCancel) { m.querySelector(".modal-row")!.appendChild(cancel); m.addEventListener("keydown",e=>{if(e.key==="Escape")cancel.click();}); }
  mount(m);
}

/**
 * Multi-select picker (대숙청/컬 세례 등): toggle up to `max` cards, then confirm once.
 * onDone receives the selected uids in pick order ([] = cancelled) — the caller
 * submits them to the engine one at a time (the protocol is unchanged).
 */
/** opts.exact (v42 손패 이월): 정확히 max장 골라야 확정 가능 · 취소 버튼 없음 */
export function cardPickerMulti(title: string, pool: CardInst[], max: number, onDone: (uids: string[]) => void, opts: { exact?: boolean; label?: (uid:string)=>string } = {}): void {
  const m = document.createElement("div");
  m.className = "modal picker-modal"; m.style.maxWidth = "720px";
  m.innerHTML =
    `<h2 style="font-size:14px">${title}</h2>` +
    `<div class="picker-grid" style="display:flex;gap:9px;flex-wrap:wrap;justify-content:center;margin:16px 0;max-height:54vh;overflow:auto"></div>` +
    `<div class="picker-count" style="text-align:center;font-size:12px;opacity:.8;margin-bottom:8px"></div>` +
    `<div class="modal-row"></div>`;
  const grid = m.querySelector(".picker-grid")!;
  const count = m.querySelector(".picker-count") as HTMLElement;
  const picked: string[] = [];
  const paint = () => {
    count.textContent = t("picker.count").replace("{n}", String(picked.length)) + (max < 99 ? ` / ${max}` : "");
    ok.disabled = opts.exact ? picked.length < max : picked.length === 0;
    ok.textContent = t("picker.confirm") + (picked.length ? ` (${picked.length})` : "");
  };
  pool.forEach((c, i) => {
    const card = cardEl(c, { playable: true, lazyArt: i });
    card.onclick = () => {
      const i = picked.indexOf(c.uid);
      if (i >= 0) { picked.splice(i, 1); card.classList.remove("is-picked"); }
      else if (picked.length < max) { picked.push(c.uid); card.classList.add("is-picked"); }
      paint();
    };
    bindZoom(card, c); // 우클릭 / 길게 누르면 확대
    if(opts.label){const wrap=document.createElement('div'),label=document.createElement('div');label.textContent=opts.label(c.uid);label.className='picker-owner';wrap.append(label,card);grid.append(wrap);}else grid.appendChild(card);
  });
  const ok = document.createElement("button");
  ok.className = "btn btn-gold";
  ok.onclick = () => { closeOverlay(); onDone(picked); };
  const cancel = document.createElement("button");
  cancel.className = "btn btn-ghost"; cancel.textContent = t("common.cancel");
  cancel.onclick = () => { closeOverlay(); onDone([]); };
  if (opts.exact) m.querySelector(".modal-row")!.append(ok); else m.querySelector(".modal-row")!.append(ok, cancel);
  if(!opts.exact)m.addEventListener("keydown",e=>{if(e.key==="Escape")cancel.click();});
  paint();
  mount(m);
}

/**
 * Browse-only deck viewer with two tabs: the FULL deck composition and the cards
 * still REMAINING in the deck (undrawn). `remaining` is null for the opponent,
 * and `publicOnly` labels that composition as cards revealed during this game.
 */
export function deckViewer(title: string, composition: CardInst[], remaining: CardInst[] | null, publicOnly = false): void {
  const m = document.createElement("div");
  m.className = "modal"; m.style.maxWidth = "760px";
  const two = remaining != null;
  m.innerHTML =
    `<h2 style="font-size:14px">${title}</h2>` +
    (two ? `<div class="dv-tabs">
      <button class="dv-tab is-active" data-v="all">${t("deck.tab.all")} <b>${composition.length}</b></button>
      <button class="dv-tab" data-v="deck">${t("deck.tab.remain")} <b>${remaining!.length}</b></button>
    </div>` : "") +
    `<div class="dv-note" id="dvNote"></div>` +
    `<div class="picker-grid" style="display:flex;gap:9px;flex-wrap:wrap;justify-content:center;margin:12px 0;max-height:54vh;overflow:auto"></div>` +
    `<div class="modal-row"></div>`;
  const grid = m.querySelector(".picker-grid")!;
  const note = m.querySelector("#dvNote") as HTMLElement;
  const render = (pool: CardInst[], isDeck: boolean): void => {
    grid.innerHTML = "";
    note.textContent = isDeck ? t("deck.remain.note") : t(publicOnly ? "deck.public.note" : "deck.all.note");
    if (!pool.length) { grid.innerHTML = `<div style="color:var(--paper-faint);padding:20px">${t("deck.empty")}</div>`; return; }
    pool.forEach((c, i) => { const card = cardEl(c, { lazyArt: i }); bindZoom(card, c); grid.appendChild(card); });
  };
  render(composition, false);
  if (two) {
    m.querySelectorAll(".dv-tab").forEach((b) => {
      (b as HTMLElement).onclick = () => {
        m.querySelectorAll(".dv-tab").forEach((x) => x.classList.remove("is-active"));
        b.classList.add("is-active");
        const deck = (b as HTMLElement).dataset.v === "deck";
        render(deck ? remaining! : composition, deck);
      };
    });
  }
  const close = document.createElement("button");
  close.className = "btn btn-ghost"; close.textContent = t("common.confirm");
  close.onclick = () => closeOverlay();
  m.querySelector(".modal-row")!.appendChild(close);
  mount(m);
}


/** Local pre-cast review. Closing/replacing the dialog is a cancellation, not a
 * game action. Choices are sent together with the cast only after confirmation. */
export function reviewCast(g: GameState, owner: Side, source: CardInst, intent: PlayIntent | null, purchase = false): Promise<string[] | null> {
  return new Promise(resolve => {
    const ja=getLang()==='ja',ko=getLang()==='ko';
    const m=document.createElement('div');m.className='modal picker-modal cast-review';
    Object.assign(m.style,{maxWidth:'720px',width:'min(720px, 94vw)',maxHeight:'90dvh',overflowY:'auto',boxSizing:'border-box'});
    const heading=document.createElement('h2');heading.textContent=cardName(source);
    const rules=document.createElement('p');rules.textContent=cardText(source);rules.style.whiteSpace='pre-line';
    const note=document.createElement('p');note.className='cast-review-note';
    note.textContent=ja?`消費マナ ${purchase?buyCost(g.players[owner],source):playCost(source,g.players[owner])} · 確定するまでカード・マナは消費しません。`
      :ko?`소비 마나 ${purchase?buyCost(g.players[owner],source):playCost(source,g.players[owner])} · 확정 전에는 카드와 마나를 소비하지 않습니다.`
      :`Mana ${purchase?buyCost(g.players[owner],source):playCost(source,g.players[owner])} · No card or mana is spent until you confirm.`;
    const grid=document.createElement('div');grid.className='picker-grid';Object.assign(grid.style,{display:'flex',gap:'9px',flexWrap:'wrap',justifyContent:'center'});
    const caution=document.createElement('p');caution.className='cast-review-caution';caution.setAttribute('aria-live','polite');
    const selection=document.createElement('p');selection.className='cast-review-selection';selection.setAttribute('aria-live','polite');
    const row=document.createElement('div');row.className='modal-row';
    const cancel=document.createElement('button');cancel.className='btn btn-ghost';cancel.textContent=t('common.cancel');
    const ok=document.createElement('button');ok.className='btn btn-gold';ok.textContent=purchase?(ja?'購入して発動':ko?'구매 후 발동':'Buy and cast'):(ja?'発動を確定':ko?'발동 확정':'Confirm cast');
    const picked:string[]=[];let settled=false;let observer:MutationObserver|undefined;
    const settle=(value:string[]|null)=>{if(settled)return;settled=true;observer?.disconnect();resolve(value);};
    const paint=()=>{
      ok.disabled=!!intent && (intent.min>0 && picked.length<intent.min);
      if(intent)ok.textContent=picked.length?(ja?'この対象で発動':ko?'이 대상으로 발동':'Cast on selected targets'):(ja?'対象を選ばず発動':ko?'대상 없이 발동':'Cast without targets');
      selection.textContent=intent?(intent.pool.length?(ja?`対象 ${picked.length} / ${intent.max} · 選び直し・キャンセル可`:ko?`대상 ${picked.length} / ${intent.max} · 재선택 또는 취소 가능`:`Targets ${picked.length} / ${intent.max} · Change selection or cancel`):(ja?'選べる対象がありません。カードは使用されていません。':ko?'선택 가능한 대상이 없습니다. 카드는 사용되지 않았습니다.':'No legal targets. The card has not been played.')):'';
      const harmful=picked.filter(uid=>source.id==='SELECTED_SWORD'?targetOwner(g,uid)!==owner:
        ['destroyMon','destroyEnch','destroyTrap','bloodShower','FIRE_BALL','STABLE','bloodSecret'].includes(intent?.reason??'')&&targetOwner(g,uid)===owner);
      caution.textContent=harmful.length?(source.id==='SELECTED_SWORD'?(ja?'相手のモンスターを強化します。':ko?'상대 몬스터를 강화합니다.':'This will strengthen an opposing monster.'):(ja?'自分のカードまたは自分自身を対象にします。':ko?'자신의 카드 또는 자신을 대상으로 합니다.':'This targets your own card or yourself.')):'';
      grid.querySelectorAll<HTMLElement>('[data-choice]').forEach(el=>{const selected=picked.includes(el.dataset.choice!);el.classList.toggle('is-picked',selected);el.setAttribute('aria-pressed',String(selected));});
    };
    intent?.pool.forEach((c,i)=>{
      const side=targetOwner(g,c.uid),isOwn=side===owner;
      const wrap=document.createElement('div');wrap.className='cast-choice';
      const label=document.createElement('div');label.className='picker-owner';label.textContent=side===null?'':ja?(isOwn?'自分':'相手'):ko?(isOwn?'자신':'상대'):(isOwn?'You':'Opponent');
      const card=cardEl(c,{playable:true,lazyArt:i,...(side!==null&&g.players[side].field.some(m=>m.uid===c.uid)?{field:true,owner:g.players[side],game:g}:{})});
      card.dataset.choice=c.uid;card.setAttribute('role','button');card.setAttribute('aria-label',`${label.textContent} ${cardName(c)}`);card.tabIndex=0;
      const choose=()=>{const at=picked.indexOf(c.uid);if(at>=0)picked.splice(at,1);else if(intent.max===1)picked.splice(0,picked.length,c.uid);else if(picked.length<intent.max)picked.push(c.uid);paint();};
      card.onclick=choose;card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}};bindZoom(card,c);
      wrap.append(label,card);grid.append(wrap);
    });
    if(!intent)for(const c of automaticCastTargets(g,owner,source)) {
      const own=targetOwner(g,c.uid)===owner,wrap=document.createElement('div'),label=document.createElement('p');
      label.textContent=ja?`自動処理の破壊対象（${own?'自分':'相手'}）`:ko?`자동 파괴 대상 (${own?'자신':'상대'})`:`Automatic destruction target (${own?'You':'Opponent'})`;
      wrap.append(label,cardEl(c,{lazyArt:0}));grid.append(wrap);
    }
    cancel.onclick=()=>{settle(null);closeOverlay();};
    ok.onclick=()=>{if(!ok.disabled){settle([...picked]);closeOverlay();}};
    m.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();cancel.click();}});
    row.append(cancel,ok);m.append(heading,rules,note,selection,caution,grid,row);paint();mount(m);
    observer=new MutationObserver(()=>{if(!m.isConnected)settle(null);});observer.observe(getRoot(),{childList:true});
  });
}
