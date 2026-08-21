// 카드별 완전 수동 오버라이드 (자동 규칙이 어색한 소수 카드)
const OVERRIDE = {
    MIMIC_PARTY: {
        ko: "【보물상자 반응】상대 필드에 미믹 1마리, 자신 필드에 미믹 2마리 소환",
        ja: "【宝箱に反応】相手の場にミミック1体、自分の場にミミック2体召喚",
        en: "【On Enemy Chest】Summon 1 Mimic to their field and 2 Mimics to yours",
    },
};
// 발동 후 N턴이 지나면 사라지는 "기한부" 영구마법 (turns=99지만 bornTurn 기준 만료)
// boardView가 남은 턴 배지 표시에도 사용한다.
export const ENCH_TURN_LIMITS = { spellHeal: 14, ancientCiv: 13 };
// 태그는 문장 어디에 있어도 "이미 태그가 붙은 것"으로 본다
// ([시초] 처럼 종족 접두가 먼저 오는 카드에서 태그가 두 번 붙던 버그 방지)
const hasTag = (s) => s.includes("【");
/** act:"destroyMon" 이지만 엔진이 '적 필드에서 자동 선정'하는 카드 — (양측) 마커 대상 아님 */
const AUTO_PICK_DESTROY = new Set(["SNIPE1", "SNIPE2", "WALLBREAK1", "WALLBREAK2", "RUNE1"]);
const twoSidedDestroy = (c) => c.act === "destroyMon" && !AUTO_PICK_DESTROY.has(c.id);
/** 마커를 문미(단, 뒤따르는 "(시전 N)"류 앞)에 붙인다 */
function mark(s, marker) {
    const m = s.match(/^(.*?)(\s*\((?:시전|発動|Cast|소환|召喚|Summon)\s*\d+\))$/);
    if (m)
        return m[1] + marker + m[2];
    return s + marker;
}
/** 조건절("…일 때만 발동 가능")에 조건 태그를 붙인다 — 이미 태그가 있으면 그대로. */
function tagRequires(s, cond, tag) {
    return s.split(" · ").map((seg) => (cond.test(seg) && !seg.includes("【") ? tag + seg : seg)).join(" · ");
}
function stdKo(c, s0) {
    let s = s0;
    // ---- 라벨 → 태그 (전역) ----
    s = s.replace(/영구마법[:：]\s*/g, "【영구】")
        .replace(/영구[:：]\s*/g, "【영구】")
        .replace(/상시[:：]\s*/g, "【상시】")
        .replace(/소환시[:：]\s*/g, "【소환시】")
        .replace(/(^|\s|·)소환시\s*(?=[-\d])/g, "$1【소환시】"); // "소환시 30%로 …" / "소환시 -4/-4"
    // ---- 파괴 선택 = 양쪽 필드 ----
    if (twoSidedDestroy(c))
        s = mark(s.replace(/적 몬스터/g, "몬스터"), "(양측)");
    if ((c.act === "destroyTrap" && (c.val ?? 1) < 99) || c.onSummon === "breaktrap")
        s = mark(s.replace(/상대의 세트 함정/g, "세트 함정"), "(양측)");
    if (c.act === "destroyEnch")
        s = mark(s.replace(/상대(의)? 영구마법/g, "영구마법"), "(양측)");
    if (c.id === "DIVINE")
        s = s.replace("상대 필드의 카드 3장 선택 파괴(몬스터·세트 함정·영구마법)", "카드 3장 선택 파괴(양측 · 몬스터·세트 함정·영구마법)");
    if (c.id === "BLOOD2")
        s = s.replace("상대의 영구마법 또는 세트 함정 2장을 선택해 파괴", "영구마법·세트 함정 2장을 선택해 파괴(양측)");
    // ---- 함정 트리거 ----
    if (c.t === "trap" && c.react) {
        if (c.react === "nullspell")
            s = "【마법 반응】" + s;
        else if (c.react === "pitfall")
            s = "【소환 반응】" + s;
        else if (!hasTag(s))
            s = "【피격시】" + s.replace(/^공격을 받으면\s*/, "").replace(/^공격을 받았을 때\s*/, "");
    }
    // ---- 영구마법 ----
    if (c.ench) {
        s = s.replace(/^(\d+)턴 동안\s*/, "【지속 $1턴】")
            .replace(/^자신의 (\d+)턴 동안\s*/, "【지속 $1턴】");
        const lim = ENCH_TURN_LIMITS[c.ench];
        if (lim)
            s = s.replace(/^【영구】/, `【지속 ${lim}턴】`);
        if (!hasTag(s))
            s = "【영구】" + s;
    }
    // ---- 매턴 (turnFx) ----
    if (c.turnFx && !hasTag(s)) {
        s = s.replace(/^매 턴 시작 시\s*/, "").replace(/^자신의 턴 시작시[:：]?\s*/, "").replace(/^매 턴\s+/, "");
        s = "【매턴】" + s;
    }
    // ---- 상시 (aura/condAtk — 소환시 등 태그가 이미 앞에 있으면 그대로) ----
    if ((c.aura || c.condAtk) && !hasTag(s) && !c.hatchTurns) {
        s = s.replace(/^필드에 있는 동안\s*/, "")
            .replace(/^이 카드가 필드에 있는 한\s*/, "")
            .replace(/^이 카드가 필드에 있는 동안\s*/, "")
            .replace(/^이 카드가 필드에 존재하는 동안\s*/, "");
        s = "【상시】" + s;
    }
    // ---- 소환 조건: 해당 절 앞에 【조건】 ----
    s = s.replace(/】[:：]\s*/g, "】");
    if (c.summonReq)
        s = s.split(" · ").map((seg) => (seg.includes("소환 가능") && !seg.startsWith("【") ? "【조건】" + seg : seg)).join(" · ");
    // 마법·함정의 "…할 때만 발동/사용 가능" 절도 같은 조건 태그를 붙인다
    // (en은 이미 【Requires】를 쓰고 있어 ko/ja만 태그가 없던 카드들)
    s = tagRequires(s, /(?:때|경우)만\s*(?:발동|사용|시전)?\s*가능/, "【조건】");
    return s;
}
function stdJa(c, s0) {
    let s = s0;
    s = s.replace(/永続魔法[:：]\s*/g, "【永続】")
        .replace(/永続[:：]\s*/g, "【永続】")
        .replace(/常時[:：]\s*/g, "【常時】")
        .replace(/召喚時[:：]\s*/g, "【召喚時】")
        .replace(/召喚時(?=[-\d])/g, "【召喚時】");
    if (twoSidedDestroy(c))
        s = mark(s.replace(/敵モンスター/g, "モンスター"), "(両方の場)");
    if ((c.act === "destroyTrap" && (c.val ?? 1) < 99) || c.onSummon === "breaktrap")
        s = mark(s.replace(/相手のセット(トラップ|罠)/g, "セット$1"), "(両方の場)");
    if (c.act === "destroyEnch")
        s = mark(s.replace(/相手の永続魔法/g, "永続魔法"), "(両方の場)");
    if (c.id === "DIVINE")
        s = s.replace("相手の場のカード3枚を選んで破壊(モンスター・セットトラップ・永続魔法)", "カード3枚を選んで破壊(両方の場 · モンスター・セットトラップ・永続魔法)");
    if (c.id === "BLOOD2")
        s = s.replace("相手の永続魔法またはセットトラップを2枚選んで破壊", "永続魔法・セットトラップを2枚選んで破壊(両方の場)");
    if (c.t === "trap" && c.react) {
        if (c.react === "nullspell")
            s = "【魔法に反応】" + s;
        else if (c.react === "pitfall")
            s = "【召喚に反応】" + s;
        else if (!hasTag(s))
            s = "【攻撃された時】" + s.replace(/^攻撃を受けると\s*/, "").replace(/^攻撃を受けたら\s*/, "");
    }
    if (c.ench) {
        s = s.replace(/^(\d+)ターンの間\s*/, "【持続$1ターン】")
            .replace(/^自分の(\d+)ターンの間\s*/, "【持続$1ターン】");
        const lim = ENCH_TURN_LIMITS[c.ench];
        if (lim)
            s = s.replace(/^【永続】/, `【持続${lim}ターン】`);
        if (!hasTag(s))
            s = "【永続】" + s;
    }
    if (c.turnFx && !hasTag(s)) {
        s = s.replace(/^毎ターン開始時\s*/, "").replace(/^自分のターン開始時[:：]?\s*/, "").replace(/^毎ターン\s+/, "");
        s = "【毎ターン】" + s;
    }
    if ((c.aura || c.condAtk) && !hasTag(s) && !c.hatchTurns) {
        s = s.replace(/^場にいる間、?\s*/, "")
            .replace(/^このカードが場に(ある|いる)限り、?\s*/, "")
            .replace(/^このカードが場に存在する間、?\s*/, "");
        s = "【常時】" + s;
    }
    s = s.replace(/】[:：]\s*/g, "】");
    if (c.summonReq)
        s = s.split(" · ").map((seg) => (/召喚可能/.test(seg) && !seg.startsWith("【") ? "【条件】" + seg : seg)).join(" · ");
    s = tagRequires(s, /(?:場合|時)のみ\s*(?:発動|使用)?\s*可能/, "【条件】");
    return s;
}
function stdEn(c, s0) {
    let s = s0;
    // v17: 함정 시전(세트) 코스트는 전부 1로 통일 → ko/ja처럼 EN에서도 (Cast N) 표기를 제거
    if (c.t === "trap")
        s = s.replace(/\s*\(Cast \d+\)/, "");
    s = s.replace(/On summon[:：]\s*/gi, "【On Summon】")
        .replace(/Enchantment[:：]\s*/g, "【Permanent】")
        .replace(/Permanent[:：]\s*/g, "【Permanent】")
        .replace(/Aura[:：]\s*/g, "【Passive】")
        .replace(/Passive[:：]\s*/g, "【Passive】");
    if (twoSidedDestroy(c))
        s = mark(s.replace(/enemy (monsters?)/g, "$1"), " (either side)");
    if ((c.act === "destroyTrap" && (c.val ?? 1) < 99) || c.onSummon === "breaktrap")
        s = mark(s.replace(/enemy (set traps?)/g, "$1"), " (either side)");
    if (c.act === "destroyEnch")
        s = mark(s.replace(/enemy (enchantments?)/g, "$1"), " (either side)");
    if (c.id === "DIVINE")
        s = s.replace("Choose and destroy 3 of the opponent's cards (monsters, set traps, enchantments)", "Choose and destroy 3 cards (either side; monsters, set traps, enchantments)");
    if (c.id === "BLOOD2")
        s = s.replace("Choose and destroy 2 of your opponent's enchantments or set traps", "Choose and destroy 2 enchantments/set traps (either side)");
    if (c.t === "trap" && c.react) {
        if (c.react === "nullspell")
            s = "【On Enemy Spell】" + s;
        else if (c.react === "pitfall")
            s = "【On Enemy Summon】" + s;
        else if (!hasTag(s))
            s = "【When Attacked】" + s.replace(/^When attacked[:,]?\s*/i, "");
    }
    if (c.ench) {
        s = s.replace(/^For (\d+) turns?,?\s*/i, "【Lasts $1 Turns】")
            .replace(/^For your next (\d+) turns?,?\s*/i, "【Lasts $1 Turns】");
        const lim = ENCH_TURN_LIMITS[c.ench];
        if (lim)
            s = s.replace(/^【Permanent】/, `【Lasts ${lim} Turns】`);
        if (!hasTag(s))
            s = "【Permanent】" + s;
    }
    if (c.turnFx && !hasTag(s)) {
        s = s.replace(/^At the start of (each|your) turn[:,]?\s*/i, "").replace(/^Each turn,?\s*/i, "");
        s = "【Each Turn】" + s;
    }
    if ((c.aura || c.condAtk) && !hasTag(s) && !c.hatchTurns) {
        s = s.replace(/^While (on the field|this card is on the field)[:,]?\s*/i, "")
            .replace(/^While this card is on the field,?\s*/i, "");
        s = "【Passive】" + s;
    }
    s = s.replace(/】[:：]\s*/g, "】");
    if (c.summonReq)
        s = s.split(" · ").map((seg) => (/Summonable|to summon\b|Requires/.test(seg) && !seg.startsWith("【") ? "【Requires】" + seg.replace(/^Requires\s+/, "") : seg)).join(" · ");
    return s;
}
/**
 * 패시브 키워드는 효과 문장에서 빼내 카드 하단의 키워드 칩 행으로 보낸다.
 * (`【소환시】상대에게 15 데미지 · 아우라 · 공허` 처럼 효과와 키워드가 한 줄에 섞여
 *  "어디까지가 효과인지" 안 읽히던 문제 — 룰 R3)
 * 안전장치: 그 카드의 cardPassives()에 실제로 들어있는 키워드만 제거한다.
 * 칩으로 반드시 다시 표시되므로 정보가 사라지지 않는다.
 */
/** 시전/소환 코스트는 배지로 표시된다 — 본문에 중복해 쓰지 않는다 (룰 R9).
 *  (렌더 시점에 어차피 지워지고 있었지만, 원문에 남아 길이 예산만 잡아먹었다) */
function stripCastCost(s) {
    return s.replace(/\s*[（(]\s*(?:시전|발동|発動|Cast|소환|召喚|Summon)\s*\d+\s*[）)]/g, "").trim();
}
/**
 * 구분자 통일 (룰 R1).
 *
 * 지금까지 한 카드 안에서 마침표 · 엠대시 · 슬래시 · 쉼표가 뒤섞여 "어디서
 * 한 효과가 끝나는지"가 언어마다 달랐다(ko는 마침표, en은 엠대시 …).
 * 절 구분자는 " · " 하나로 고정한다.
 *
 *   " · "  절(문장) 구분 — 위에서부터 순서대로 해결
 *   "·"    (공백 없음) 절 안의 나열 — 초급·중급·상급
 *   " / "  주사위 표의 행 구분 (표 안에서만)
 *
 * 주사위 표(parseDiceTable가 인식하는 카드)는 건드리지 않는다 — 거기서
 * " / "와 리드인 "—"는 표 구조 그 자체다.
 */
function unifySeparators(s) {
    if (parseDiceTable(s))
        return s;
    return s
        // "roll a die — on 4+, …" 의 대시는 절 구분이 아니라 결과 도입부다.
        // (그대로 두면 아래 규칙이 절로 쪼개 ko의 한 문장과 개수가 어긋난다)
        .replace(/\broll (a die|\d+ dice)\s*[—–]\s*/gi, "roll $1: ")
        // ko/ja: 주사위 조건절 앞의 쉼표는 절 경계다
        //   "카드 3장 드로우, 주사위 5 이상이면 2장 추가"
        .replace(/\s*,\s*(?=주사위|ダイス)/g, " · ")
        .replace(/\s*、\s*(?=ダイス)/g, " · ")
        // 절을 잇는 엠대시/앤대시 → · (주사위 표가 아닌 카드에만 온다)
        .replace(/\s+[—–]\s+/g, " · ")
        // 표가 아닌 곳의 슬래시 → · ("10/3", "+1/+1" 같은 스탯 표기는 공백이 없어 안전)
        .replace(/\s+\/\s+/g, " · ")
        // 문장 마침표로 절을 잇던 표기 → · (소수점 "1.5"는 앞뒤가 숫자라 제외)
        .replace(/[.。](?!\d)\s+(?=\S)/g, " · ")
        // 태그 바로 앞의 쉼표는 절 경계다: "최대 마나 +1, 【소환시】…"
        .replace(/\s*,\s*(?=【)/g, " · ")
        .replace(/\s{2,}/g, " ")
        .trim();
}
/** 룰 R9: "마나1: …" 같은 코스트 접두도 금지 — 코스트 젬이 이미 같은 숫자를 보여준다. */
function stripCostPrefix(s) {
    return s.replace(/^\s*(?:마나|マナ|Mana)\s*\d+\s*[:：]\s*/i, "").trim();
}
function stripKeywords(c, s, lang, keywordNames) {
    if (!s)
        return s;
    const names = new Set(keywordNames(c, lang).filter(Boolean));
    if (!names.size)
        return s;
    // 절 구분자는 "공백 있는 ·" 뿐이다. 공백 없는 ·는 절 안의 나열(초급·중급·상급)이라
    // 여기서 쪼개면 안 된다 — 예전 구현은 /\s*·\s*/로 쪼갠 뒤 " · "로 다시 이어 붙여
    // 나열을 절 구분자로 바꿔놨다(ASSASSIN4가 6절, GOLEM3가 4절로 세지던 원인).
    const parts = s.split(/\s+·\s+/);
    const kept = parts.filter((p) => !names.has(p.trim()));
    // 전부 키워드뿐이면 빈 문자열 → 칩 행만 남는다
    return kept.join(" · ").trim();
}
/**
 * 주사위·보물상자 카드의 "눈 → 결과" 목록을 표로 파싱한다 (룰 R6).
 * 한 줄로 이어 쓰면 글자 벽이 되므로 cardView가 행으로 렌더한다.
 * 표가 아니면 null — 일반 카드는 손대지 않는다.
 *
 * 렌더러와 검사 스크립트(scripts/check-card-text.mjs)가 "무엇이 표인가"를
 * 같은 함수로 판단하도록 여기(shared)에 둔다. 두 곳이 갈라지면 길이 예산이
 * 표에 잘못 적용된다.
 */
export function parseDiceTable(txt) {
    // " / " (양옆 공백)만 구분자 — 몬스터 스탯의 "10/3"은 구분자가 아니다
    const parts = txt.split(/\s+\/\s+/);
    if (parts.length < 3)
        return null;
    // "2·3: 효과" / "6~8: 효과" / "①② 효과"(원문자는 콜론 없이도 인정)
    const ROW = /^\s*([0-9\uff10-\uff19]+(?:\s*[\u00b7\u30fb,\u3001~\uff5e-]\s*[0-9\uff10-\uff19]+)*)\s*[:\uff1a]\s*(.+?)\s*$/;
    const ROW_CIRCLE = /^\s*([\u2460-\u2473]+)\s*[:\uff1a]?\s*(.+?)\s*$/;
    let head = "";
    const rows = [];
    for (let i = 0; i < parts.length; i++) {
        let seg = parts[i];
        if (i === 0) {
            // 첫 조각엔 리드인이 붙을 수 있다: "주사위 2개 합계 — 2·3: …"
            const dash = seg.search(/[\u2014\u2013]/);
            if (dash >= 0) {
                head = seg.slice(0, dash).trim();
                seg = seg.slice(dash + 1).trim();
            }
        }
        const r = seg.match(ROW) ?? seg.match(ROW_CIRCLE);
        if (!r)
            return null; // 행이 아닌 조각이 하나라도 있으면 표가 아니다
        rows.push([r[1].replace(/\s+/g, ""), r[2]]);
    }
    return rows.length >= 3 ? { head, rows } : null;
}
/** 전 카드의 text/textJa/textEn을 표준 표기로 변환 (applyEnglish 이후 1회 실행) */
export function standardizeCardTexts(pools, keywordNames) {
    for (const pool of pools) {
        for (const id of Object.keys(pool)) {
            const c = pool[id];
            const ov = OVERRIDE[id];
            const ko0 = c.text; // EN 폴백(=한국어 원문) 감지용
            const fin = (txt, lang) => unifySeparators(stripCostPrefix(stripCastCost(stripKeywords(c, txt, lang, keywordNames))));
            if (c.text && c.text !== "—")
                c.text = fin(ov?.ko ?? stdKo(c, c.text), "ko");
            if (c.textJa && c.textJa !== "—")
                c.textJa = fin(ov?.ja ?? stdJa(c, c.textJa), "ja");
            if (c.textEn && c.textEn !== "—")
                c.textEn = fin(c.textEn === ko0 ? c.text : ov?.en ?? stdEn(c, c.textEn), "en");
        }
    }
}
