// ============================================================
// LORE — card DOM builder. One renderer for every card everywhere
// (board / market / hand / pile / zoom) so sizing stays consistent.
// ============================================================
import type { CardInst, FieldMon, PlayerState } from "../shared/types";
import { FRAME_BACK, frameFor, fieldFrameFor, PASSIVES, cardPassives } from "../shared/cards";
import { curHp, effAtk, effDef, playCost } from "../shared/engine";
import { cardName, cardText, getLang, t } from "../i18n";

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
function contentSize(box: HTMLElement): { w: number; h: number } {
  let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity;
  const push = (r: DOMRect): void => {
    if (!r.width && !r.height) return;
    top = Math.min(top, r.top); bottom = Math.max(bottom, r.bottom);
    left = Math.min(left, r.left); right = Math.max(right, r.right);
  };
  const rng = document.createRange();
  rng.selectNodeContents(box);
  push(rng.getBoundingClientRect());
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
    const px = Math.min(Math.max(need, base * GROUP_FLOOR), base);
    for (const b of live) {
      b.style.fontSize = px.toFixed(2) + "px";
      const r = b.getBoundingClientRect(), c = contentSize(b);
      b.classList.toggle("is-clipped", c.h > r.height - 0.5 || c.w > r.width - 0.5);
    }
  }
}

function fitToBox(box: HTMLElement, minPx = 3.5): void {
  let tries = 0, lastW = -1, lastH = -1;
  const run = (): void => {
    // 주의: rAF는 숨겨진 탭에서 영원히 안 불린다(재접속 백그라운드 렌더 등) → setTimeout 사용.
    // 레이아웃 측정은 백그라운드에서도 동작한다.
    if (!box.isConnected) { if (tries++ < 8) setTimeout(run, 16 * tries); return; }
    // 카드 크기가 바뀌면(레이아웃 솔버·창 회전·리사이즈) 이전에 맞춰둔 폰트는 무효다.
    // 같은 크기면 재계산 생략, 달라졌으면 CSS 기본값에서 다시 맞춘다(커질 때도 복구).
    const b0 = box.getBoundingClientRect();
    if (Math.abs(b0.width - lastW) < 0.5 && Math.abs(b0.height - lastH) < 0.5) return;
    lastW = b0.width; lastH = b0.height;
    box.style.fontSize = "";
    baseFit.set(box, parseFloat(getComputedStyle(box).fontSize));
    let guard = 0;
    while (guard++ < 14) {
      // 박스도 rect로 재야 한다(줌 등 ancestor transform이 있으면 client*와 단위가 어긋남)
      const b = box.getBoundingClientRect();
      if (!b.width || !b.height) break;
      const c = contentSize(box);
      // 0.5px 여유를 두고 맞춘다: 딱 맞게 재면 글리프의 어센더/디센더가 반 픽셀씩
      // 삐져나와 overflow:hidden에 첫 줄 윗부분이 잘린다(카드명 2줄에서 특히).
      const availH = b.height - 0.5, availW = b.width - 0.5;
      const overH = c.h - availH, overW = c.w - availW;
      if (overH <= 0 && overW <= 0) break;
      const cur = parseFloat(getComputedStyle(box).fontSize);
      if (cur <= minPx) break;
      const rH = c.h > 0 ? availH / c.h : 1;
      const rW = c.w > 0 ? availW / c.w : 1;
      const next = Math.max(minPx, cur * Math.min(rH, rW) * 0.97);
      if (next >= cur) break;
      box.style.fontSize = next.toFixed(2) + "px";
    }
    // 마켓/필드처럼 카드가 아주 작을 땐 최소 폰트로도 안 들어가는 카드가 있다.
    // 그때 내용이 가운데 정렬이면 첫 줄이 "위쪽에서 반쯤 잘려" 나가 아주 어색하다
    // → is-clipped: 위 정렬 + 아래쪽 페이드. 잘림이 항상 문장 끝에서만 일어난다.
    const b2 = box.getBoundingClientRect();
    const c2 = contentSize(box);
    box.classList.toggle("is-clipped", c2.h > b2.height - 0.5 || c2.w > b2.width - 0.5);
    // join (or move to) the size group and let the group settle on one size
    ownFit.set(box, parseFloat(getComputedStyle(box).fontSize));
    const key = groupKey(box, b2.width);
    for (const [k, set] of fitGroups) if (k !== key) set.delete(box);
    if (!fitGroups.has(key)) fitGroups.set(key, new Set());
    fitGroups.get(key)!.add(box);
    queueNormalize();
  };
  setTimeout(run, 0);
  // 카드가 리사이즈되면 다시 맞춘다 (한 번만 맞추면 리사이즈 후 글자가 잘린 채 남는다).
  // 폰트 크기는 박스 크기를 바꾸지 않으므로(높이는 카드 대비 %) 되먹임 루프가 없다.
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => run()).observe(box);
}

function artEl(cardId: string, full = false): HTMLElement {
  // small views load the 384px thumbnail; only the zoom overlay fetches the full-res art
  const art = el("div", "card-art");
  const img = document.createElement("img");
  img.src = `/art/${full ? "cards" : "cards-sm"}/${cardId}.webp`;
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  img.className = "card-art-img";
  if (full) img.style.backgroundImage = `url(/art/cards-sm/${cardId}.webp)`; // thumb as instant placeholder under the full art
  const done = (): void => { img.classList.add("art-loaded"); art.classList.add("art-done"); };
  if (img.complete && img.naturalWidth) done();
  else img.onload = done;
  img.onerror = () => { img.remove(); art.classList.add("art-done"); };
  art.appendChild(img);
  return art;
}

/**
 * Dice/chest cards list "roll → outcome" pairs. Written as one ` / `-joined line
 * they read as a wall of text (rules doc R6), so they render as ROWS instead.
 * Returns null when the text is not a table, so ordinary cards are untouched.
 */
function diceTable(txt: string): { head: string; rows: [string, string][] } | null {
  // split on " / " with real spaces — a bare "10/3" (a monster's stats) is NOT a separator
  const parts = txt.split(/\s+\/\s+/);
  if (parts.length < 3) return null;
  // "2·3: effect" / "6~8: effect" / "①② effect" (circled digits need no colon)
  const ROW = /^\s*([0-9０-９]+(?:\s*[·・,、~〜\-]\s*[0-9０-９]+)*)\s*[:：]\s*(.+?)\s*$/;
  const ROW_CIRCLE = /^\s*([\u2460-\u2473]+)\s*[:：]?\s*(.+?)\s*$/;
  let head = "";
  const rows: [string, string][] = [];
  for (let i = 0; i < parts.length; i++) {
    let seg = parts[i];
    if (i === 0) {
      // the first segment may carry a lead-in: "주사위 2개 합계 — 2·3: …"
      const dash = seg.search(/[—–]/);
      if (dash >= 0) { head = seg.slice(0, dash).trim(); seg = seg.slice(dash + 1).trim(); }
    }
    const r = seg.match(ROW) ?? seg.match(ROW_CIRCLE);
    if (!r) return null;                       // any non-row segment → not a table
    rows.push([r[1].replace(/\s+/g, ""), r[2]]);
  }
  return rows.length >= 3 ? { head, rows } : null;
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
  node.appendChild(artEl(c.id, opt.fullArt));
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
    node.appendChild(el("div", "ad-atk" + (String(a).length >= 3 ? " ad-num--3d" : ""), String(a)));
    // 알은 체력 대신 부화/내구도 배지가 실질 정보 → 체력 칩을 감춘다(장식 숫자 제거)
    if (!(onField && isEgg)) {
      node.appendChild(el("div", "ad-def" + (hurt ? " ad-def--hurt" : "") + (String(d).length >= 3 ? " ad-num--3d" : ""), String(d)));
    }
  }
  // 암살자 길드: 카운트 배지
  if (opt.field && c.aura === "assassinGuild") {
    const gc = (c as { gcount?: number }).gcount ?? 0;
    node.appendChild(el("div", "egg-cnt", `<span class="ec ec-d">⚔${gc}/3</span>`));
  }
  // 알(egg): 부화/내구도 카운터 배지 — 필드에서는 실시간 값, 손패/마켓에서는 초기값
  if (c.hatchTurns != null) {
    const eggH = (c as { hatch?: number }).hatch ?? c.hatchTurns;
    const eggD = (c as { dur?: number }).dur ?? c.hatchDur ?? 4;
    node.appendChild(el("div", "egg-cnt", `<span class="ec ec-h">🥚${eggH}</span><span class="ec ec-d">🛡${Math.max(0, eggD)}</span>`));
  }
  // 기합 토큰 / 부패 카운터 / 부여 패시브 배지 (필드 카드만)
  if (opt.field && c.hatchTurns == null && c.aura !== "assassinGuild") {
    const fm = c as FieldMon;
    const bits: string[] = [];
    if ((fm.guts ?? 0) > 0) bits.push(`<span class="ec ec-g">💢${fm.guts}</span>`);
    if ((fm.decayCnt ?? 0) > 0) bits.push(`<span class="ec ec-x">☠${fm.decayCnt}/3</span>`);
    if (fm.passivesG?.length) {
      const lang0 = getLang();
      for (const k of fm.passivesG) {
        const p = PASSIVES[k];
        if (p) bits.push(`<span class="ec ec-p">${lang0 === "ja" ? p.ja.name : lang0 === "en" ? p.en.name : p.ko.name}</span>`);
      }
    }
    if (bits.length) node.appendChild(el("div", "egg-cnt", bits.join("")));
  }
  // 이름도 실측-축소: 긴 이름(EN 포함)이 프레임 이름판을 벗어나지 않게
  fitToBox(nameEl2);
  // 효과 텍스트: "(시전 N)"/"(소환 N)" 계열 표기는 배지로 대체되므로 제거하고, 구분자를 줄바꿈으로
  const rawTxt = cardText(c).replace(/\s*\((?:시전|Cast|発動|소환|Summon|召喚)\s*\d+\)/g, "").trim();
  // dice/chest cards are detected on the RAW text — the separators become newlines
  // just below, which would destroy the " / " that delimits the outcome rows
  const table = rawTxt && rawTxt !== "—" ? diceTable(rawTxt) : null;
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
  if ((txt && txt !== "—") || hasCast || keyChips.length) {
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
    fitToBox(eff); // 실측 자동 축소 — 어떤 길이의 효과도 항상 프레임 텍스트판 안에
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
