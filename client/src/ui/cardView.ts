// ============================================================
// LORE — card DOM builder. One renderer for every card everywhere
// (board / market / hand / pile / zoom) so sizing stays consistent.
// ============================================================
import type { CardInst, FieldMon, PlayerState } from "../shared/types";
import { FRAME_BACK, frameFor, PASSIVES, cardPassives } from "../shared/cards";
import { effAtk, effDef, playCost } from "../shared/engine";
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
  /** 줌 오버레이(카드 폭 400px)에서만 true — 이때만 원본 해상도 아트를 받는다. */
  zoom?: boolean;
}

function el(tag: string, cls?: string, html?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

// ---- 부여 패시브 칩의 즉석 툴팁 (하나를 재사용, body에 fixed로 띄운다) ----
let psvTipEl: HTMLElement | null = null;
function attachPsvTip(chip: HTMLElement): void {
  const show = (): void => {
    const key = chip.dataset.psv!;
    const p = PASSIVES[key];
    if (!p) return;
    const lang = getLang();
    const loc = lang === "ja" ? p.ja : lang === "en" ? p.en : p.ko;
    if (!psvTipEl) { psvTipEl = el("div", "psv-tip"); document.body.appendChild(psvTipEl); }
    psvTipEl.innerHTML = `<b>${loc.name}</b>${loc.desc}`;
    const r = chip.getBoundingClientRect();
    psvTipEl.style.left = Math.max(8, Math.min(window.innerWidth - 228, r.left + r.width / 2 - 110)) + "px";
    psvTipEl.style.top = Math.max(8, r.top - 8) + "px";
    psvTipEl.classList.add("show");
  };
  const hide = (): void => psvTipEl?.classList.remove("show");
  chip.addEventListener("pointerenter", show);
  chip.addEventListener("pointerleave", hide);
  chip.addEventListener("click", (e) => { e.stopPropagation(); psvTipEl?.classList.contains("show") ? hide() : show(); });
}

/**
 * 실측 자동 축소: 요소가 DOM에 붙은 뒤(rAF) 내용이 박스를 넘치면 폰트를 줄여
 * 항상 프레임 안에 들어가게 한다. 카드가 손패/마켓/줌 어느 크기로 렌더되든
 * em 기반이라 같은 비율로 동작 — "효과 텍스트가 프레임을 벗어나는" 문제의 근본 해결.
 * (CSS 클래스 버킷(--small/--tiny)은 1차 근사로 유지, 이 함수가 최종 보정)
 */
const FIT_MIN_PX = 3.5;
const FIT_PASSES = 5;   // ratio-based shrink converges in 2–3; 5 is slack
const FIT_MAX_WAIT = 8; // frames to wait for a box that isn't in the DOM yet

const fitQueue = new Set<HTMLElement>();
let fitScheduled = false;

/**
 * 한 프레임에 모아서 처리: 대기 중인 모든 박스를 "읽기 패스 → 쓰기 패스" 순서로
 * 처리한다. 예전 구현은 박스마다 setTimeout을 하나씩 잡고 그 안에서 읽기
 * (scrollHeight)와 쓰기(style.fontSize)를 최대 10번 번갈아 했다 — 카드 아카이브
 * 화면이면 354장 × 2박스 × 10회 = 7000번의 강제 동기 레이아웃이라 메인 스레드가
 * 수 초간 멈추고, 그동안 이미지 디코드/표시가 밀려 "이미지가 느리게 뜨는" 것처럼
 * 보였다. 이제 배치 전체가 최대 FIT_PASSES번의 레이아웃으로 끝난다.
 */
function flushFits(): void {
  fitScheduled = false;
  let live: HTMLElement[] = [];
  const waiting: HTMLElement[] = [];
  for (const box of fitQueue) {
    if (box.isConnected) { live.push(box); continue; }
    // 아직 fragment 안에 있는 카드 — 다음 프레임에 다시. (영원히 안 붙는 카드
    // 때문에 큐가 계속 도는 일이 없도록 횟수 제한)
    const n = (Number(box.dataset.fitWait) || 0) + 1;
    if (n <= FIT_MAX_WAIT) { box.dataset.fitWait = String(n); waiting.push(box); }
  }
  fitQueue.clear();

  for (let pass = 0; pass < FIT_PASSES && live.length; pass++) {
    // ---- 읽기 패스: 쓰기가 섞이지 않으므로 배치 전체가 레이아웃 1회로 끝난다
    const todo: { box: HTMLElement; size: number }[] = [];
    for (const box of live) {
      const ch = box.clientHeight, cw = box.clientWidth;
      if (!ch || !cw) continue; // display:none 등 — 측정 불가, 건드리지 않는다
      const sh = box.scrollHeight, sw = box.scrollWidth;
      if (sh - ch <= 1 && sw - cw <= 1) continue; // 이미 들어간다
      const cur = parseFloat(getComputedStyle(box).fontSize);
      if (!(cur > FIT_MIN_PX)) continue;
      const next = Math.max(FIT_MIN_PX, cur * Math.min(sh > 0 ? ch / sh : 1, sw > 0 ? cw / sw : 1) * 0.97);
      if (next >= cur) continue;
      todo.push({ box, size: next });
    }
    // ---- 쓰기 패스
    for (const { box, size } of todo) box.style.fontSize = size.toFixed(2) + "px";
    live = todo.map((x) => x.box);
  }

  if (waiting.length) {
    for (const box of waiting) fitQueue.add(box);
    fitScheduled = true;
    setTimeout(flushFits, 16);
  }
}

/**
 * 실측 자동 축소: 요소가 DOM에 붙은 뒤 내용이 박스를 넘치면 폰트를 줄여
 * 항상 프레임 안에 들어가게 한다. 카드가 손패/마켓/줌 어느 크기로 렌더되든
 * em 기반이라 같은 비율로 동작 — "효과 텍스트가 프레임을 벗어나는" 문제의 근본 해결.
 * (CSS 클래스 버킷(--small/--tiny)은 1차 근사로 유지, 이 함수가 최종 보정)
 */
function fitToBox(box: HTMLElement): void {
  // 주의: rAF는 숨겨진 탭에서 영원히 안 불린다(재접속 백그라운드 렌더 등) → setTimeout 사용.
  // 레이아웃 측정(scrollHeight)은 백그라운드에서도 동작한다.
  fitQueue.add(box);
  if (fitScheduled) return;
  fitScheduled = true;
  setTimeout(flushFits, 0);
}

/** 줌 오버레이만 원본이 필요하다. 나머지는 전부 축소본. */
export type CardArtSize = "thumb" | "avatar" | "full";

/**
 * 카드 아트는 3종. 작은 두 개는 `npm run art:optimize`(scripts/optimize-card-art.mjs)가
 * 원본에서 생성한다.
 *   full  = 원본 832x1216 (~165KB) — 줌(카드 폭 400px)에서만 필요
 *   thumb = w384 (~17KB)  — 아카이브/덱/마켓/손패/필드. 아트 창이 최대 150 CSS px라
 *                            2배 DPR에서도 384px면 충분하다
 *   avatar= w128 (~3KB)   — 22~74px 아바타
 * 아카이브 화면 기준 57MB → 6MB.
 */
export function cardArtSrc(cardId: string, size: CardArtSize = "thumb"): string {
  if (size === "full") return `/art/cards/${cardId}.webp`;
  return `/art/cards/${size === "avatar" ? "w128" : "w384"}/${cardId}.webp`;
}

function artEl(cardId: string, size: CardArtSize): HTMLElement {
  const art = el("div", "card-art");
  const img = document.createElement("img");
  // loading/decoding은 src보다 "먼저" 설정해야 한다 — 로드는 src 대입이 예약하고,
  // 그 뒤에 붙인 속성은 그 로드에 반영된다는 보장이 없다(= lazy가 무시될 수 있다).
  img.loading = "lazy";
  img.decoding = "async";
  img.alt = "";
  // 축소본이 없으면 원본으로 한 번만 폴백하고, 그것도 없으면 ◆ 플레이스홀더를 남긴다.
  img.onerror = () => {
    if (size !== "full" && !img.dataset.fellBack) {
      img.dataset.fellBack = "1";
      img.src = cardArtSrc(cardId, "full");
      return;
    }
    img.remove();
  };
  img.src = cardArtSrc(cardId, size);
  art.appendChild(img);
  return art;
}

export function cardEl(c: CardInst, opt: CardOpts = {}): HTMLElement {
  const typeClass = c.t === "mon" ? "card--mon" : c.t === "trap" ? "card--trap" : c.t === "starter" ? "card--starter" : "card--spell";
  const sizeClass = opt.size === "mkt" ? "card--mkt" : opt.size === "hand" ? "card--hand" : "";
  const node = el("div", `card ${typeClass} ${sizeClass}`.trim());
  if (opt.compactField) node.classList.add("card--field");
  // 고코스트(8+) 카드: 홀로그래픽 시머 — 손패/마켓/줌에서만 (필드 썸네일은 성능상 제외)
  if (c.cost >= 8 && !opt.compactField && !opt.field) node.classList.add("card--legend");
  node.dataset.uid = c.uid;
  // Layering: art sits BEHIND the frame (in the transparent art window), the
  // frame PNG overlays on top (its border hugs the art edges), then text/cost
  // render above the frame. (frame's outer + window are transparent.)
  node.appendChild(artEl(c.id, opt.zoom ? "full" : "thumb"));
  const frameEl = el("div", "card-frame");
  frameEl.style.backgroundImage = `url(${frameFor(c.t)})`;
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
    const d = opt.field && opt.owner ? effDef(opt.owner, c as FieldMon) : c.def!;
    // The monster frame already has built-in sword/shield icons — we only place the numbers.
    // Rendered as plain flex-centered divs (same as name/effect) so they never depend on a
    // monospace font or transform being available on the viewer's machine.
    node.appendChild(el("div", "ad-atk", String(a)));
    node.appendChild(el("div", "ad-def", String(d)));
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
    // 부화 직전(다음 턴 시작에 부화): 흔들림 + 균열 글로우 예고
    if (opt.field && eggH <= 1) node.classList.add("egg-soon");
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
        if (p) bits.push(`<span class="ec ec-p" data-psv="${k}">${lang0 === "ja" ? p.ja.name : lang0 === "en" ? p.en.name : p.ko.name}</span>`);
      }
    }
    if (bits.length) {
      const badges = el("div", "egg-cnt", bits.join(""));
      // 부여 패시브 칩: hover/탭 → 즉석 설명 툴팁 (줌까지 안 열어도 뜻을 알 수 있게)
      badges.querySelectorAll<HTMLElement>(".ec-p[data-psv]").forEach((chip) => attachPsvTip(chip));
      node.appendChild(badges);
    }
  }
  // 이름도 실측-축소: 긴 이름(EN 포함)이 프레임 이름판을 벗어나지 않게
  fitToBox(nameEl2);
  // 효과 텍스트: "(시전 N)"/"(소환 N)" 계열 표기는 배지로 대체되므로 제거하고, 구분자를 줄바꿈으로
  let txt = cardText(c)
    .replace(/\s*\((?:시전|Cast|発動|소환|Summon|召喚)\s*\d+\)/g, "")
    .replace(/ · /g, "\n")
    .replace(/ \/ /g, "\n")
    .trim();
  const hasCast = c.t !== "starter" && pc !== c.cost;
  if ((txt && txt !== "—") || hasCast) {
    const effCls = "card-eff" + (txt.length > 140 ? " card-eff--tiny" : txt.length > 80 ? " card-eff--small" : "");
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
    if (txt && txt !== "—") eff.appendChild(el("div", "card-eff-txt", `<span style="white-space:pre-line">${decorateTags(decoratePassives(c, txt))}</span>`));
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
