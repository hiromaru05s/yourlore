// v11 대규모 패치 스모크 테스트 — npx tsx tmp/smoke_v11.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createGame, reduce, effAtk, effDef, cullExiled, MAX_TURNS } from "../client/src/shared/engine";
import { DB, STARTERS, hasPassive, cardPassives, BALANCE_VERSION, DECK_POOL, sanitizeDeck } from "../client/src/shared/cards";
import type { CardInst, FieldMon, GameState } from "../client/src/shared/types";

let pass = 0, fail = 0;
function ok(cond: boolean, name: string, extra?: unknown): void {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`, extra ?? ""); }
}
function mk(seed = 1): GameState {
  return createGame({ seed, mode: "bot", p0: { id: "a", name: "A" }, p1: { id: "b", name: "B" } }).state;
}
function inst(g: GameState, id: string): CardInst {
  g.uidSeq++;
  const def = DB[id] ?? STARTERS[id];
  return { uid: "t" + g.uidSeq, ...structuredClone(def) };
}
function mon(g: GameState, id: string, extra: Partial<FieldMon> = {}): FieldMon {
  const m = { ...inst(g, id), exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: 0, attacksUsed: 0, ...extra } as FieldMon;
  if (hasPassive(m, "guts") && m.guts == null) m.guts = 1;
  return m;
}
function red(g: GameState, a: any): GameState { return reduce(g, a).state; }

// ---------- 1) 패시브 유도/사전 ----------
console.log("1) PASSIVES / cardPassives");
ok(cardPassives(DB.GM9_2).includes("dual"), "GM9_2 → 이도류");
ok(cardPassives(DB.ASSASSIN1).includes("ambush"), "암살자 → 암습");
ok(cardPassives(DB.DIVINE).includes("aura") && cardPassives(DB.DIVINE).includes("void"), "신수 → 아우라+공허");
ok(cardPassives(DB.VAMP5).includes("trapmaster") && cardPassives(DB.VAMP5).includes("void"), "특급 흡혈귀 → 트랩마스터+공허");
ok(cardPassives(DB.D_RED).includes("aura") && DB.D_RED.aura === "spellAmp", "적룡 → 아우라(+기존 spellAmp 유지)");
ok(cardPassives(DB.GM7_1).includes("taunt") && cardPassives(DB.GM8_1).includes("taunt"), "피의/신성한 성벽 → 도발");
ok(cardPassives(DB.GOLEM1).includes("guts"), "병사 골램 → 기합");
ok(cardPassives(DB.CHOSEN_ARCHER).includes("evade") && cardPassives(DB.CHOSEN_ARCHER).includes("ambush"), "궁수 → 회피+암습");
ok(DB.FORESIGHT.cost === 3, "선견지명 시전 3");
ok(DB.DRAGON_EGG.hatchDur === 6 && DB.BEAST_EGG.hatchDur === 7, "알 내구 6/7");
ok(DB.DRAGON_EGG.aura === "ward" && DB.BEAST_EGG.aura === "ward", "알 아우라");
ok(DB.EGG_MASTER.def === 2 && DB.EGG_MASTER.val === 3, "부화 마스터 0/2 · +3");
ok(DB.EGG_HUNTER.val === 4, "에그헌터 4소모");
ok(DB.EXILE_NUKE1.play === 4 && DB.EXILE_NUKE2.play === 10, "공허 포격/대붕괴 시전 4/10");
ok(BALANCE_VERSION === "v11", "BALANCE_VERSION v11");
ok(["RUST_SHROOM", "CHOSEN_AREA", "TRIAL_AREA", "ANCIENT_CIV"].every((id) => DECK_POOL.includes(id)), "신규 스타팅 4종 DECK_POOL 포함");
ok(sanitizeDeck(["RUST_SHROOM", "CHOSEN_AREA", "TRIAL_AREA", "ANCIENT_CIV"]).slice(0, 4).join() === "RUST_SHROOM,CHOSEN_AREA,TRIAL_AREA,ANCIENT_CIV", "sanitizeDeck 통과");

// ---------- 2) 기합 ----------
console.log("2) 기합 (guts)");
{
  let g = mk(2);
  const me = g.players[0], op = g.players[1];
  me.hand = [inst(g, "GOLEM1")]; me.mana = 9;
  g = red(g, { type: "play", idx: 0 });
  const golem = g.players[0].field[0];
  ok(golem?.id === "GOLEM1" && golem.guts === 1, "소환시 기합 토큰 1", golem);
  // 상대 대형 몬스터로 공격
  g.players[1].field = [mon(g, "GM10_0")]; // 24/8
  g = red(g, { type: "endTurn" });
  const hpBefore = g.players[0].hp;
  g = red(g, { type: "attack", uid: g.players[1].field[0].uid });
  g = red(g, { type: "chooseTarget", uid: g.players[0].field[0]?.uid ?? null });
  const after = g.players[0].field[0];
  ok(!!after && after.id === "GOLEM1" && after.guts === 0, "전투 파괴 무효 + 토큰 소모", after);
  ok(g.players[0].hp < hpBefore, "관통 데미지는 적용", { hpBefore, hp: g.players[0].hp });
  // 두 번째 공격(다음 턴)에는 파괴
  g = red(g, { type: "endTurn" }); g = red(g, { type: "endTurn" });
  g = red(g, { type: "attack", uid: g.players[1].field[0].uid });
  g = red(g, { type: "chooseTarget", uid: g.players[0].field[0]?.uid ?? null });
  ok(g.players[0].field.length === 0, "기합 소진 후엔 파괴");
}

// ---------- 3) 도발 ----------
console.log("3) 도발 (taunt)");
{
  let redirects = 0, directs = 0;
  for (let seed = 1; seed <= 40; seed++) {
    let g = mk(seed * 7);
    g.players[1].field = [mon(g, "GM7_1"), mon(g, "TOKEN00")]; // 도발벽 + 허수아비
    g.players[0].field = [mon(g, "GM10_0")]; // 24/8
    const scarecrowUid = g.players[1].field[1].uid;
    g = red(g, { type: "attack", uid: g.players[0].field[0].uid });
    g = red(g, { type: "chooseTarget", uid: scarecrowUid });
    const scarecrowAlive = g.players[1].field.some((m) => m.uid === scarecrowUid);
    if (scarecrowAlive) redirects++; else directs++;
  }
  ok(redirects > 5 && directs > 5, `50% 리다이렉트 동작 (${redirects} 대신맞음 / ${directs} 관통)`);
}

// ---------- 4) 회피 ----------
console.log("4) 회피 (evade)");
{
  let evaded = 0, hit = 0;
  for (let seed = 1; seed <= 40; seed++) {
    let g = mk(seed * 13);
    g.players[1].field = [mon(g, "CHOSEN_ROGUE")]; // 0/0 회피
    g.players[0].field = [mon(g, "GM10_0")];
    const rogueUid = g.players[1].field[0].uid;
    g = red(g, { type: "attack", uid: g.players[0].field[0].uid });
    g = red(g, { type: "chooseTarget", uid: rogueUid });
    if (g.players[1].field.some((m) => m.uid === rogueUid)) evaded++; else hit++;
  }
  ok(evaded > 5 && hit > 5, `회피 주사위 동작 (${evaded} 회피 / ${hit} 적중)`);
}

// ---------- 5) 부패 ----------
console.log("5) 부패 (decay)");
{
  let g = mk(5);
  g.players[0].field = [mon(g, "RUST_SHROOM")];
  g.players[1].field = [mon(g, "GM10_1", { decayCnt: 2 })]; // 10/25 — 전투로 안 죽는 벽, 카운터 2
  const oppHp = g.players[1].hp;
  g = red(g, { type: "attack", uid: g.players[0].field[0].uid });
  g = red(g, { type: "chooseTarget", uid: g.players[1].field[0].uid });
  ok(g.players[1].field.length === 0, "부패 3스택 → 파괴");
  ok(g.players[1].hp === oppHp - 3, "주인에게 3 데미지", { oppHp, now: g.players[1].hp });
}
{ // 러스트캡 슬러그 소환 마킹
  let g = mk(6);
  const me = g.players[0];
  g.players[1].field = [mon(g, "GM10_1")];
  me.hand = [inst(g, "RUST_SLUG")]; me.mana = 9;
  g = red(g, { type: "play", idx: 0 });
  ok(g.pending?.reason === "decayMark", "슬러그 소환 → decayMark pending");
  g = red(g, { type: "chooseTarget", uid: g.players[1].field[0].uid });
  ok(g.players[1].field[0].decayCnt === 1, "부패 카운터 1 부여");
}
{ // 암기 제작
  let g = mk(7);
  const me = g.players[0];
  me.field = [mon(g, "TOKEN00"), mon(g, "SOLDIER2")];
  me.hand = [inst(g, "DECAY_CRAFT")]; me.mana = 9;
  g = red(g, { type: "play", idx: 0 });
  ok(g.pending?.reason === "grantDecay", "암기 제작 → grantDecay pending");
  g = red(g, { type: "chooseTarget", uid: g.players[0].field[0].uid });
  ok(g.pending?.reason === "grantDecay", "2체째 선택 대기");
  g = red(g, { type: "chooseTarget", uid: g.players[0].field[1].uid });
  ok(g.players[0].field.every((m) => hasPassive(m, "decay")), "2체 모두 부패 부여");
}

// ---------- 6) 위엄 ----------
console.log("6) 위엄 (majesty)");
{
  let g = mk(8);
  const me = g.players[0];
  g.players[1].field = [mon(g, "GM10_1", { passivesG: ["majesty"] })];
  me.hand = [inst(g, "NGA3")]; me.mana = 9; // 유리 대포
  g = red(g, { type: "play", idx: 0 });
  const atkUid = g.players[0].field[0].uid;
  g = red(g, { type: "attack", uid: atkUid });
  ok(!g.pending, "위엄: 소환 턴 공격 차단 (pending 없음)");
  // 다음 내 턴에는 공격 가능
  g = red(g, { type: "endTurn" }); g = red(g, { type: "endTurn" });
  g = red(g, { type: "attack", uid: atkUid });
  ok(g.pending?.reason === "attack", "다음 턴에는 공격 가능");
}
{ // 각인 비술
  let g = mk(9);
  const me = g.players[0];
  me.field = [mon(g, "SOLDIER2")];
  me.hand = [inst(g, "MAJESTY_RITE")]; me.mana = 9; me.hp = 30; me.maxMana = 8;
  g = red(g, { type: "play", idx: 0 });
  ok(g.players[0].hp === 23 && g.players[0].maxMana === 7, "7 자해 + 최대마나 -1", { hp: g.players[0].hp, mm: g.players[0].maxMana });
  ok(g.pending?.reason === "grantMajesty", "grantMajesty pending");
  g = red(g, { type: "chooseTarget", uid: g.players[0].field[0].uid });
  ok(hasPassive(g.players[0].field[0], "majesty"), "위엄 부여됨");
}

// ---------- 7) 골램 킹 ----------
console.log("7) 골램 킹");
{
  let g = mk(10);
  const me = g.players[0];
  me.hand = [inst(g, "GOLEM3")]; me.mana = 9; me.deck = []; me.discard = []; me.field = [];
  g = red(g, { type: "play", idx: 0 });
  const king = g.players[0].field[0];
  ok(effAtk(g.players[0], king) === 2 && effDef(g.players[0], king) === 4, "골램 부재 → 2/4", { a: effAtk(g.players[0], king), d: effDef(g.players[0], king) });
}
{
  let g = mk(11);
  const me = g.players[0];
  me.hand = [inst(g, "GOLEM3")]; me.mana = 9; me.deck = [inst(g, "GOLEM1")]; me.discard = []; me.field = [];
  g = red(g, { type: "play", idx: 0 });
  const king = g.players[0].field[0];
  ok(effAtk(g.players[0], king) === 6 && effDef(g.players[0], king) === 8, "골램 있음 → 6/8 유지");
}

// ---------- 8) 컬 아키타입 ----------
console.log("8) 컬 아키타입");
{ // 선택의 기로
  let g = mk(12);
  const me = g.players[0];
  me.hand = [inst(g, "CROSSROADS")]; me.mana = 9;
  const before = me.discard.length;
  g = red(g, { type: "play", idx: 0 });
  const culls = g.players[0].discard.filter((c) => c.star === "trash").length;
  ok(g.players[0].discard.length === before + 3 && culls >= 2, "묘지에 컬 2장 추가 (+본체)");
}
{ // 선택받은 영역 — 조건 미달 / 충족
  let g = mk(13);
  let me = g.players[0];
  me.removed = Array.from({ length: 19 }, () => inst(g, "STARTER_TRASH"));
  me.hand = [inst(g, "CHOSEN_AREA")]; me.mana = 9;
  g = red(g, { type: "play", idx: 0 });
  ok(!g.over && g.players[0].hand.length === 1, "컬 19장 → 발동 불가");
  me = g.players[0];
  me.removed!.push(inst(g, "STARTER_TRASH"));
  me.maxMana = 9; me.mana = 9; // normalizeManaCaps가 mana를 최대치로 클램프하므로 재설정
  g = red(g, { type: "play", idx: 0 });
  ok(g.over && g.winner === 0, "컬 20장 → 즉시 승리");
}
{ // 선택받은 검사/궁수/도적 스케일링 + 검사 컬 수급
  let g = mk(14);
  const me = g.players[0];
  me.removed = Array.from({ length: 5 }, () => inst(g, "STARTER_TRASH"));
  me.field = [mon(g, "CHOSEN_KNIGHT"), mon(g, "CHOSEN_ARCHER"), mon(g, "CHOSEN_ROGUE")];
  ok(cullExiled(me) === 5, "cullExiled=5");
  ok(effAtk(me, me.field[0]) === 5 && effDef(me, me.field[0]) === 5, "검사 +5/+5");
  ok(effAtk(me, me.field[1]) === 10, "궁수 공격 +10");
  ok(effAtk(me, me.field[2]) === 5, "도적 공격 +5");
  g.players[1].field = [];
  const dBefore = me.discard.filter((c) => c.star === "trash").length;
  g = red(g, { type: "attack", uid: me.field[0].uid }); // 직접 공격
  const dAfter = g.players[0].discard.filter((c) => c.star === "trash").length;
  ok(dAfter === dBefore + 1, "검사: 플레이어 타격 → 묘지에 컬 +1");
}
{ // 선택받은 마법사 턴시작 프롬프트
  let g = mk(15);
  g.players[1].field = [mon(g, "CHOSEN_MAGE")];
  g.players[1].removed = [inst(g, "STARTER_TRASH")];
  const oppHp0 = g.players[0].hp;
  g = red(g, { type: "endTurn" }); // → P1 턴 시작
  ok(g.pending?.reason === "chosenMage", "턴 시작 chosenMage pending");
  g = red(g, { type: "chooseTarget", uid: g.players[1].field[0].uid });
  ok(g.players[0].hp === oppHp0 - 6, "발동 → 상대 6뎀");
  ok((g.players[1].removed ?? []).filter((c) => c.star === "trash").length === 0 && g.players[1].discard.some((c) => c.star === "trash"), "제외 컬 1장 → 묘지 복귀");
  // 취소 경로
  let g2 = mk(16);
  g2.players[1].field = [mon(g2, "CHOSEN_MAGE")];
  g2.players[1].removed = [inst(g2, "STARTER_TRASH")];
  g2 = red(g2, { type: "endTurn" });
  g2 = red(g2, { type: "chooseTarget", uid: null });
  ok(!g2.pending, "취소 가능");
}
{ // 공허 포격 너프
  let g = mk(17);
  const me = g.players[0];
  me.removed = Array.from({ length: 5 }, () => inst(g, "STARTER_TRASH"));
  me.hand = [inst(g, "EXILE_NUKE1")]; me.mana = 9;
  const hp0 = g.players[1].hp;
  g = red(g, { type: "play", idx: 0 });
  ok(g.players[1].hp === hp0 - 5, "포격: 제외 5장 → 5뎀 (제외당 1)");
}

// ---------- 9) 시련의 영역 / 고대 문명 / 혈귀술 / 선견지명 ----------
console.log("9) 영역·문명·너프");
{ // 시련의 영역
  let g = mk(18);
  const me = g.players[0];
  me.hand = [inst(g, "TRIAL_AREA")]; me.mana = 9; me.hp = 30;
  g = red(g, { type: "play", idx: 0 });
  ok(g.players[0].hp === 24, "시전시 6 자해");
  ok(g.players[0].enchants.some((e) => e.card.ench === "trialArea"), "영구마법 설치");
  g = red(g, { type: "endTurn" }); g = red(g, { type: "endTurn" }); // 내 턴 재시작
  ok(g.pending?.reason === "trialExile" && g.pending?.data?.zone === "discard", "턴 시작: 묘지 제외 pending");
  const cullInDisc = g.players[0].discard.find((c) => c.star === "trash");
  ok(!!cullInDisc, "묘지에 컬 1장 획득");
  const rmBefore = (g.players[0].removed ?? []).length;
  g = red(g, { type: "pick", uid: cullInDisc!.uid });
  ok((g.players[0].removed ?? []).length === rmBefore + 1, "묘지에서 제외 1장");
  g = red(g, { type: "pick", uid: null }); // 2장째는 취소
  ok(!g.pending, "취소로 종료");
}
{ // 고대 문명
  let g = mk(19);
  const me = g.players[0];
  me.hand = [inst(g, "ANCIENT_CIV")]; me.mana = 9; me.maxMana = 8;
  g = red(g, { type: "play", idx: 0 });
  ok(g.players[0].enchants.some((e) => e.card.ench === "ancientCiv"), "고대 문명 설치");
  const born = g.turn;
  let guard = 0;
  while (g.turn < born + 13 && guard++ < 40) {
    if (g.pending) g = red(g, { type: "pick", uid: null });
    g = red(g, { type: "endTurn" });
  }
  // born+13 도달 후 자신의 턴 시작(짝수/홀수에 따라 1턴 더)
  if (!g.pending || g.pending.reason !== "civChoice") { g = red(g, { type: "endTurn" }); }
  if (!g.pending || (g.pending.reason !== "civChoice")) { g = red(g, { type: "endTurn" }); }
  ok(g.pending?.reason === "civChoice", "13턴 후 civChoice pending", { turn: g.turn, pend: g.pending?.reason });
  const mmBefore = g.players[0].maxMana;
  g = red(g, { type: "pick", uid: "DRAGON_EGG" });
  ok(g.players[0].hand.some((c) => c.id === "DRAGON_EGG"), "드래곤의 알 패에 추가");
  ok(!g.players[0].enchants.some((e) => e.card.ench === "ancientCiv"), "고대 문명 파괴됨");
  ok(g.players[0].discard.some((c) => c.id === "ANCIENT_CIV"), "묘지로 이동(공허 아님)");
  void mmBefore;
}
{ // 혈귀술 14턴 만료
  let g = mk(20);
  const me = g.players[0];
  me.hand = [inst(g, "BLOOD_RITE")]; me.mana = 9;
  g = red(g, { type: "play", idx: 0 });
  ok(g.players[0].enchants.some((e) => e.card.ench === "spellHeal"), "혈귀술 설치");
  const born = g.turn;
  let guard = 0;
  while (g.turn < born + 14 && guard++ < 40) {
    if (g.pending) g = red(g, { type: "pick", uid: null });
    g = red(g, { type: "endTurn" });
  }
  if (g.players[0].enchants.some((e) => e.card.ench === "spellHeal")) g = red(g, { type: "endTurn" });
  ok(!g.players[0].enchants.some((e) => e.card.ench === "spellHeal"), "14턴 후 자동 파괴");
  ok((g.players[0].removed ?? []).some((c) => c.id === "BLOOD_RITE"), "공허 → 게임에서 제외");
}
{ // 선견지명 중복 금지
  let g = mk(21);
  const me = g.players[0];
  me.hand = [inst(g, "FORESIGHT"), inst(g, "FORESIGHT")]; me.mana = 9; me.maxMana = 5;
  g = red(g, { type: "play", idx: 0 });
  ok(g.players[0].enchants.filter((e) => e.card.ench === "foresight").length === 1, "1장째 설치");
  g = red(g, { type: "play", idx: 0 });
  ok(g.players[0].enchants.filter((e) => e.card.ench === "foresight").length === 1 && g.players[0].hand.length === 1, "2장째 발동 불가");
}

// ---------- 10) 알 아우라 / 에그헌터 / 부화 마스터 ----------
console.log("10) 알 버프");
{
  let g = mk(22);
  const me = g.players[0];
  g.players[1].field = [mon(g, "DRAGON_EGG", { hatch: 8, dur: 6 })];
  me.hand = [inst(g, "S15")]; me.mana = 9; // 룬 파열 (destroyMon)
  g = red(g, { type: "play", idx: 0 });
  ok(g.pending?.reason === "destroyMon", "파괴 스펠 pending");
  g = red(g, { type: "chooseTarget", uid: g.players[1].field[0].uid });
  ok(g.players[1].field.length === 1, "알 아우라: 파괴 대상 지정 무효");
  // 에그헌터 4소모
  g.pending = null;
  g.players[0].field = [mon(g, "EGG_HUNTER")];
  g = red(g, { type: "attack", uid: g.players[0].field[0].uid });
  g = red(g, { type: "chooseTarget", uid: g.players[1].field[0].uid });
  ok(g.players[1].field[0].dur === 2, "에그헌터: 내구도 -4", g.players[1].field[0].dur);
}
{
  let g = mk(23);
  const me = g.players[0];
  me.field = [mon(g, "DRAGON_EGG", { hatch: 8, dur: 6 })];
  me.hand = [inst(g, "EGG_MASTER")]; me.mana = 9;
  g = red(g, { type: "play", idx: 0 });
  ok(g.players[0].field[0].dur === 9, "부화 마스터: 내구 +3", g.players[0].field[0].dur);
}

// ---------- 11) 봇 자동진행 (풀 게임 2판 — 신규 pending에서 안 멈추는지) ----------
console.log("11) 봇 풀 게임");
import("../client/src/shared/bot").then(async ({ botDecide }) => {
  for (const seed of [101, 202]) {
    let g = createGame({ seed, mode: "bot", p0: { id: "b1", name: "B1", isBot: true, deck: ["RUST_SHROOM", "CHOSEN_AREA", "TRIAL_AREA", "ANCIENT_CIV", "STARTER_TRASH", "STARTER_TRASH", "STARTER_CHEST", "STARTER_CHEST"] }, p1: { id: "b2", name: "B2", isBot: true } }).state;
    let steps = 0, stuck = 0;
    while (!g.over && steps++ < 6000) {
      const a = botDecide(g);
      const next = reduce(g, a).state;
      if (JSON.stringify(next.pending) === JSON.stringify(g.pending) && next.turn === g.turn && a.type !== "endTurn" && next.pending) {
        if (++stuck > 20) break; // pending에서 진전 없음 = 멈춤
      } else stuck = 0;
      g = next;
    }
    ok(g.over || g.turn >= MAX_TURNS - 1, `seed ${seed}: 게임 정상 종료 (턴 ${g.turn}, over=${g.over}, steps=${steps}, stuck=${stuck})`);
  }
  console.log(`\n==== ${pass} passed / ${fail} failed ====`);
  if (fail > 0) process.exit(1);
});
