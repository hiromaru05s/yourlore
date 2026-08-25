/* eslint-disable */
// v34 smoke — 마법 대개편: 주요 리워크 + 삭제 + 카지노
import { DB, BALANCE_VERSION, DECK_POOL, BUYABLE_POOL } from "../client/src/shared/cards";
import { createGame, reduce, effMaxMana } from "../client/src/shared/engine";
import { greedyDecide } from "../client/src/shared/bot";
import type { GameState, FieldMon, CardInst } from "../client/src/shared/types";

let pass = 0, fail = 0;
const ok = (c: boolean, n: string, x?: unknown) => { c ? pass++ : (fail++, console.log("  ✗", n, x ?? "")); };

ok(BALANCE_VERSION === "v34", "version v34", BALANCE_VERSION);
for (const id of ["S11", "S9", "PRAYER", "DICE8", "SX6", "GS9_0", "GS10_0", "GS11_0", "GS7_2", "GS8_3"]) ok(!DB[id], `${id} 삭제`);
ok(Object.keys(DB).filter((id) => DB[id].t === "spell" && DB[id].cost >= 9).join(",") === "TIMEWARP", "9코+ 마법은 시공간 조작만");
ok(DB.AMA.cost === 1 && DB.KIN_CALL.cost === 2 && DB.FURNACE.cost === 2, "코스트 버프");
ok(DB.CULL_FARM.play === 1 && DB.HANDRESET.play === 1 && DB.S6.play === 1 && DB.TIMEWARP.play === 10, "시전 버프");
ok(DB.MIMIC2.atk === 12 && DB.MIMIC2.def === 6, "마스터 미믹 12/6");
ok(DB.GOLIATH_HUNT.name === "자이언트 킬링" && DB.GLASS_BAN.name === "전략 변경" && DB.SHATTER.name === "지진" && DB.S6.name === "운명의 실", "이름 변경");
ok(DB.RUNE3.ench === "runeEcho" && DECK_POOL.includes("CASINO"), "룬상급 영구화 + 카지노 스타터");

const mk = (id: string): FieldMon => ({ uid: "t" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id]), exhausted: false, tempAtk: 0, atkMod: 0, defMod: 0, summonedTurn: 0 }) as FieldMon;
const card = (id: string): CardInst => ({ uid: "c" + Math.random().toString(36).slice(2, 8), ...structuredClone(DB[id]) } as CardInst);
const fresh = (seed = 7): GameState => createGame({ seed, mode: "bot", starting: 0, p0: { id: "a", name: "A", isBot: true }, p1: { id: "b", name: "B", isBot: true } } as never).state;
const play0 = (g: GameState, id: string): GameState => {
  g.players[0].hand.unshift(card(id));
  g.players[0].mana = Math.max(g.players[0].mana, 30);
  return reduce(g, { type: "play", idx: 0 }).state;
};

// 대지의 축복: 전 몬스터 완전 회복
{
  let g = fresh();
  const m1 = mk("GM10_0"); m1.dmg = 5;
  const m2 = mk("M5"); m2.dmg = 3;
  g.players[0].field.push(m1); g.players[1].field.push(m2);
  g = play0(g, "S14");
  ok((g.players[0].field[0].dmg ?? 0) === 0 && (g.players[1].field[0].dmg ?? 0) === 0, "대지의 축복: 전 몬스터 회복");
}
// 명상: 최대 마나 게이트 + 완전 회복 + 낙인
{
  let g = fresh();
  g.players[0].maxMana = 12;
  g.players[0].hp -= 10;
  g = play0(g, "MEDITATE");
  ok(g.players[0].hand.some((c) => c.id === "MEDITATE"), "명상: 마나 12는 거부");
  g.players[0].maxMana = 8;
  g = reduce(g, { type: "play", idx: g.players[0].hand.findIndex((c) => c.id === "MEDITATE") }).state;
  ok(g.players[0].hp === g.players[0].maxHp && g.players[0].brand === 1, "명상: 완전 회복 + 낙인 1");
}
// 대학살: 마나 -1 + 상대 전멸
{
  let g = fresh();
  g.players[1].field.push(mk("M5"), mk("GM10_0"));
  g.players[0].maxMana = 10;
  g = play0(g, "MASSACRE");
  ok(g.players[1].field.length === 0 && g.players[0].maxMana === 9, "대학살: 전멸 + 마나 -1");
}
// 룬 학문: 덱 절반 마법 조건 + 중급 +8 + 상급 에코
{
  let g = fresh();
  g.players[0].deck = [card("M1"), card("M1"), card("M1"), card("M1"), card("M1"), card("M1")]; g.players[0].discard = []; g.players[0].hand = [];
  g = play0(g, "RUNE2");
  ok(g.players[0].hand.some((c) => c.id === "RUNE2"), "룬중급: 몬스터 덱이면 거부");
  g.players[0].deck = [card("S13"), card("S13"), card("S13"), card("STARTER_TRASH")];
  g.players[0].maxMana = 10; g.players[0].mana = 10; // normalizeManaCaps가 mana를 effMaxMana로 클램프하므로 재설정
  const mm0 = g.players[0].maxMana;
  g = reduce(g, { type: "play", idx: g.players[0].hand.findIndex((c) => c.id === "RUNE2") }).state;
  ok(g.players[0].maxMana === mm0 + 8, "룬중급: 최대 마나 +8");
  g = play0(g, "RUNE3");
  ok(g.players[0].enchants.some((e) => e.card.ench === "runeEcho"), "룬상급: 영구 설치");
  const hp1 = g.players[1].hp;
  g = play0(g, "S13"); // 11뎀 ×2 (에코)
  ok(g.players[1].hp === hp1 - 22, "룬상급: 마법 2회 발동", hp1 - g.players[1].hp);
}
// 전략 변경: |공-체| ≥ 4 공격 불가
{
  let g = fresh();
  g.players[0].enchants.push({ card: card("GLASS_BAN"), turns: 99 } as never);
  const glass = mk("NGA4"); // 9/1 차 8
  g.players[1].field.push(mk("M5"));
  g.players[0].field.push(glass);
  const hp1 = g.players[1].hp;
  g = reduce(g, { type: "attack", uid: glass.uid }).state;
  ok(!g.pending && g.players[1].hp === hp1, "전략 변경: 차 4+ 공격 불가");
}
// 카지노: 12 카운터 → 카지노 주사위
{
  let g = fresh();
  const cas = mk("CASINO");
  cas.gcount = 11;
  g.players[0].field.push(cas);
  g = play0(g, "SLUM"); // 상회 없음 → 거부돼도 주사위는 안 굴러감 — 대신 S12로 굴린다
  g = play0(g, "S12"); // 주사위 1회 → 카운터 12 → 카지노 발동
  const casNow = g.players[0].field.find((x) => x.aura === "casino");
  ok((casNow?.gcount ?? 99) < 12, "카지노: 12개 소모 후 발동", casNow?.gcount);
}
// 마켓 크래시: 제시 2장 + 갱신 봉쇄
{
  let g = fresh();
  g = play0(g, "S5");
  g = reduce(g, { type: "endTurn" }).state; // → B턴: 제시 축소 + 갱신 봉쇄
  ok(g.players[1].supply.filter(Boolean).length === 2, "마켓 크래시: 제시 2장", g.players[1].supply.filter(Boolean).length);
  const manaB = g.players[1].mana;
  const supplyBefore = g.players[1].supply.map((c) => c?.uid).join(",");
  g = reduce(g, { type: "refresh" }).state;
  ok(g.players[1].supply.map((c) => c?.uid).join(",") === supplyBefore && g.players[1].mana === manaB, "마켓 크래시: 갱신 봉쇄");
}
// 협상: 2턴 함정 봉쇄
{
  let g = fresh();
  g = play0(g, "NEGOTIATE");
  g = reduce(g, { type: "endTurn" }).state; // B턴 1
  g.players[1].mana = 10;
  g.players[1].hand.unshift(card("T13"));
  g = reduce(g, { type: "play", idx: 0 }).state;
  ok(g.players[1].traps.length === 0, "협상: 1턴째 함정 봉쇄");
  g = reduce(g, { type: "endTurn" }).state; g = reduce(g, { type: "endTurn" }).state; // B턴 2
  g.players[1].mana = 10;
  g.players[1].hand.unshift(card("T13"));
  g = reduce(g, { type: "play", idx: 0 }).state;
  ok(g.players[1].traps.length === 0, "협상: 2턴째 함정 봉쇄");
  g = reduce(g, { type: "endTurn" }).state; g = reduce(g, { type: "endTurn" }).state; // B턴 3
  g.players[1].mana = 10;
  g.players[1].hand.unshift(card("T13"));
  g = reduce(g, { type: "play", idx: 0 }).state;
  ok(g.players[1].traps.length === 1, "협상: 3턴째 해제");
}
// 생명의 가호: 양측 소환 반응
{
  let g = fresh();
  g.players[0].enchants.push({ card: card("NHEAL"), turns: 99 } as never);
  const mh0 = g.players[0].maxHp, mh1 = g.players[1].maxHp;
  g = play0(g, "M1");
  ok(g.players[0].maxHp === mh0 + 8 && g.players[1].maxHp === mh1 + 4, "생명의 가호: 자신 +8 / 상대 +4");
}
// 은월포: 상대 덱 지명 제외
{
  let g = fresh();
  const victim = g.players[1].deck[0];
  g = play0(g, "GS8_0");
  ok(g.pending?.reason === "exileOppDeck", "은월포: 픽커 pending");
  g = reduce(g, { type: "chooseTarget", uid: victim.id }).state;
  ok((g.players[1].removed ?? []).some((c) => c.id === victim.id), "은월포: 지명 제외");
}
// 봇 자가대전 (신 스타터/리워크 카드 주입)
{
  let done = 0;
  for (let s = 1; s <= 50; s++) {
    const deck = ["CASINO", "DUNGEON_FLOOR", "GRAPE", "SLUM", "STARTER_TRASH", "STARTER_TRASH", "STARTER_CHEST", "STARTER_CHEST"];
    let st = createGame({ seed: s * 7907, mode: "bot", starting: (s % 2) as 0 | 1,
      p0: { id: "a", name: "A", isBot: true, deck }, p1: { id: "b", name: "B", isBot: true, deck } } as never).state;
    if (s % 3 === 0) st.players[0].enchants.push({ card: card("RUNE3"), turns: 99 } as never);
    if (s % 4 === 0) st.players[1].enchants.push({ card: card("GLASS_BAN"), turns: 99 } as never);
    let steps = 0;
    while (!st.over && steps++ < 3000) st = reduce(st, greedyDecide(st)).state;
    if (st.over) done++;
  }
  ok(done === 50, "봇 자가대전 50판 완주", done);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
