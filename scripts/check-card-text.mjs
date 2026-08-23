#!/usr/bin/env node
// ============================================================
// LORE — card text rule checker.
//
// Rules live in docs/card-text-style.md; this script is what makes them
// real. Every rule below is machine-checked against all cards in all three
// languages, so "we agreed on a notation" cannot drift back into prose.
//
//   npm run text:check          # report violations, exit 1 if any
//   npm run text:check -- --all # also list rules that currently pass
//
// Adding a card? Write it in the plain idiom (`소환시: …`) — cardText.ts
// converts it. If this checker complains, fix the source text, not the checker.
// ============================================================
import { loadCards, loadCardText } from "./card-art-lib.mjs";

const LANGS = /** @type {const} */ (["ko", "ja", "en"]);
const FIELD = { ko: "text", ja: "textJa", en: "textEn" };

// R8 budgets — measured against the text WITHOUT tags/keyword chips, because
// those render as separate rows and do not compete for sentence space.
const LEN_LIMIT = { ko: 62, ja: 62, en: 96 };

const TAG_RE = /【[^】]*】/g;
const bare = (s) => s.replace(TAG_RE, "").replace(/[+\-−]?\d+\s*%/g, " ").trim();

const findings0 = null;

const findings = [];
const pass = [];
function bad(rule, id, lang, detail) { findings.push({ rule, id, lang, detail }); }

const cards = await loadCards({ includeStarters: true });
// The renderer's own table parser decides what a table is — one definition, so a
// table can never be judged by the sentence length budget (or vice versa).
const { parseDiceTable } = await loadCardText();
const isDiceTable = (s) => !!parseDiceTable(s);

// A number that carries meaning (a magnitude) vs. one that is just a counter word.
// "몬스터 1체" / "카드 3장" / "three Scarecrows" count things the other language
// spells out differently; "+3 ATK" / "14 damage" must match exactly everywhere.
// Magnitudes are compared by what they MODIFY, not by scanning every digit:
// languages disagree about counter words ("카드 1장 드로우" ⇄ "draw a card") but
// must never disagree about how much damage a card deals. Each entry pulls the
// number that sits against a specific game quantity, in all three languages.
const MAG_PATTERNS = [
  // [name, ko, ja, en] — a signed/heal number bound to a quantity. "체력에 2 데미지"
  // deliberately does NOT count as an HP change: there 체력 names the target.
  ["dmg", /(\d+)\s*데미지/g, /(\d+)\s*ダメージ/g, /(\d+)\s+damage/gi],
  // English puts the sign first as often as last ("HP +3" / "+3 HP"), so both
  // orders are accepted; ko/ja always put the quantity first.
  ["hp", /체력\s*(?:([+\-−]\d+)|(\d+)\s*회복)/g, /体力\s*(?:([+\-−]\d+)|(\d+)\s*回復)/g, /(?:\b(?:max\s+)?HP\s*([+\-−]\d+)|([+\-−]\d+)\s*(?:max\s+)?HP|\brestore\s+(\d+)\s+(?:of\s+your\s+)?HP)/gi],
  ["mana", /마나\s*([+\-−]\d+)/g, /マナ\s*([+\-−]\d+)/g, /(?:\bmana\s*([+\-−]\d+)|([+\-−]\d+)\s*(?:\w+\s+){0,2}?mana)/gi],
  ["atk", /공격(?:력)?\s*([+\-−]\d+)/g, /攻撃(?:力)?\s*([+\-−]\d+)/g, /(?:\bATK\s*([+\-−]\d+)|([+\-−]\d+)\s*ATK)/gi],
  ["pair", /([+\-−]\d+)\/([+\-−]\d+)/g, /([+\-−]\d+)\/([+\-−]\d+)/g, /([+\-−]\d+)\/([+\-−]\d+)/g],
];
const LANG_IDX = { ko: 1, ja: 2, en: 3 };
const norm = (n) => String(Number(String(n).replace("−", "-")));
function magnitudes(s, lang) {
  const out = [];
  for (const row of MAG_PATTERNS) {
    const re = row[LANG_IDX[lang]];
    if (!re) continue;
    for (const m of bare(s).matchAll(re)) {
      for (let g = 1; g < m.length; g++) if (m[g] != null) out.push(`${row[0]}${norm(m[g])}`);
    }
  }
  return out.sort().join(",");
}
/** Target counts, compared across languages: ko "1체" ⇔ ja "1体" ⇔ en "1"/"one". */
const EN_NUMWORD = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
function targetCounts(s, lang) {
  const out = [];
  if (lang === "ko") for (const m of s.matchAll(/(\d+)\s*(?:체|장|마리|명)/g)) out.push(+m[1]);
  else if (lang === "ja") for (const m of s.matchAll(/(\d+)\s*(?:体|枚|匹|名)/g)) out.push(+m[1]);
  else {
    for (const m of s.matchAll(/\b(\d+|a|an|one|two|three|four|five|six)\s+(?:enemy\s+|your\s+|of\s+your\s+)?(?:monsters?|cards?|traps?|enchantments?|Mimics?|Scarecrows?|Soldiers?|Assassins?|Dragons?)\b/gi))
      out.push(Number(m[1]) || EN_NUMWORD[m[1].toLowerCase()] || 0);
  }
  return out.sort((a, b) => a - b).join(",");
}

// ---------------------------------------------------------------- per-language
for (const c of cards) {
  for (const lang of LANGS) {
    const s = c[FIELD[lang]];
    if (!s || s === "—") continue;

    // R9 — the cost badge already shows this; never repeat it in the sentence.
    if (/^\s*(?:마나|マナ|Mana)\s*\d+\s*[:：]/i.test(s)) bad("R9-cost-prefix", c.id, lang, s);
    if (/[（(]\s*(?:시전|발동|発動|Cast|소환|召喚|Summon)\s*\d+\s*[）)]/.test(s)) bad("R9-cast-in-text", c.id, lang, s);

    // R5 — a monster refers to itself as "this monster", never "this card".
    if (c.t === "mon" && /이 카드|このカード|\bthis card\b/i.test(s)) bad("R5-self-ref", c.id, lang, s);

    // R8 — length budget (dice tables are exempt: they render as rows).
    if (!isDiceTable(s) && bare(s).length > LEN_LIMIT[lang]) {
      bad("R8-too-long", c.id, lang, `${bare(s).length}/${LEN_LIMIT[lang]} — ${s}`);
    }

    // R1 — ` · ` is the ONLY clause separator. A bare ` / ` outside a dice table
    // reads as a second, competing separator.
    if (!isDiceTable(s) && /\s\/\s/.test(s)) bad("R1-mixed-separator", c.id, lang, s);

    // R1b — a sentence-final period used as a clause break. " · " is the only
    // clause separator, so "…-1. 이후…" hides a clause from every reader and
    // from the layout (it cannot wrap at that point).
    if (/[.。]\s+\S/.test(s.replace(/\d\.\d/g, ""))) bad("R1-period-as-clause", c.id, lang, s);
    // R1c — an em dash joining clauses. Reserved for the dice-table lead-in.
    if (!isDiceTable(s) && /\s[—–]\s/.test(s)) bad("R1-emdash-as-clause", c.id, lang, s);

    // R10 — canonical vocabulary: the losing variants must never reappear.
    const R10 = {
      ko: [/체력에 \d+ 데미지/, /(?<!카드 )\b\d+장 드로우/, /적 몬스터/, /\d+마리/, /전멸/, /랜덤/, /->/, /주사위 \d+ 이상이면/],
      ja: [/体力に\d+ダメージ/, /(?<!カード)\d+枚ドロー/, /敵モンスター/, /全滅/, /->/, /ダイス\d+以上で/],
      en: [/\bdeal \d+ damage(?! to)/i, /\bmons\b/, /\(s\)/, /->/, /≤/, /\bwipe all\b/i, /\byour HP \+\d+/i],
    }[lang] ?? [];
    for (const re of R10) if (re.test(bare(s))) bad("R10-canon", c.id, lang, `${re} — ${s}`);

    // R4 — HP always carries an owner/subject. A naked "체력 5 회복" is ambiguous
    // between the player and a monster. An owner word anywhere in the same clause
    // (before OR after — "체력 1 이하의 적 몬스터") satisfies the rule.
    if (lang === "ko") {
      for (const clause of s.split(/\s+·\s+/)) {
        if (!/체력\s*[+\-−]?\d/.test(clause)) continue;
        if (!/자신|상대|적|플레이어|몬스터|이 몬스터|전체|양측/.test(clause)) bad("R4-unowned-hp", c.id, lang, clause);
      }
    }
  }
}

// ------------------------------------------------------- cross-language shape
// The three languages must describe the SAME structure. If ko says "1체" and ja
// omits it, one of the two is wrong — that is exactly the "解釈の余地" we are
// removing. Numbers, trigger tags and clause counts are all comparable.
const tags = (s) => (s.match(TAG_RE) ?? []).length;
const clauses = (s) => s.split(/\s+·\s+/).length;

for (const c of cards) {
  const have = LANGS.filter((l) => c[FIELD[l]] && c[FIELD[l]] !== "—");
  if (have.length < 2) continue;
  const ref = have[0];
  for (const lang of have.slice(1)) {
    const a = c[FIELD[ref]], b = c[FIELD[lang]];
    if (isDiceTable(a) !== isDiceTable(b)) bad("X-table-shape", c.id, `${ref}/${lang}`, `${a}  ||  ${b}`);
    if (magnitudes(a, ref) !== magnitudes(b, lang)) bad("X-numbers", c.id, `${ref}/${lang}`, `${magnitudes(a, ref)} vs ${magnitudes(b, lang)}  ||  ${a}  ||  ${b}`);
    // Only ko↔ja: both use counter words, so the comparison is exact. English
    // counts the noun and legitimately drops "1" ("draw a card"), which would
    // make this check pure noise.
    if (ref === "ko" && lang === "ja" && targetCounts(a, ref) !== targetCounts(b, lang)) {
      bad("X-target-count", c.id, `${ref}/${lang}`, `[${targetCounts(a, ref)}] vs [${targetCounts(b, lang)}]  ||  ${a}  ||  ${b}`);
    }
    if (tags(a) !== tags(b)) bad("X-tag-count", c.id, `${ref}/${lang}`, `${tags(a)} vs ${tags(b)}  ||  ${a}  ||  ${b}`);
    if (clauses(a) !== clauses(b)) bad("X-clause-count", c.id, `${ref}/${lang}`, `${clauses(a)} vs ${clauses(b)}  ||  ${a}  ||  ${b}`);
  }
}

// ------------------------------------------------------------------ reporting
const order = ["R9-cost-prefix", "R9-cast-in-text", "R5-self-ref", "R10-canon", "R1-mixed-separator",
  "R1-period-as-clause", "R1-emdash-as-clause", "R4-unowned-hp",
  "X-numbers", "X-target-count", "X-tag-count", "X-clause-count",
  "X-table-shape", "R8-too-long"];
const byRule = new Map();
for (const f of findings) {
  if (!byRule.has(f.rule)) byRule.set(f.rule, []);
  byRule.get(f.rule).push(f);
}
const showAll = process.argv.includes("--all");

console.log(`card text: ${cards.length} cards × ${LANGS.length} languages`);
for (const rule of order) {
  const list = byRule.get(rule);
  if (!list) { if (showAll) console.log(`  ✓ ${rule}`); continue; }
  console.log(`\n  ✗ ${rule} — ${list.length}`);
  for (const f of list) console.log(`      ${f.lang.padEnd(5)} ${f.id.padEnd(16)} ${f.detail}`);
}
for (const [rule, list] of byRule) {
  if (order.includes(rule)) continue;
  console.log(`\n  ✗ ${rule} — ${list.length}`);
  for (const f of list) console.log(`      ${f.lang.padEnd(5)} ${f.id.padEnd(16)} ${f.detail}`);
}

console.log(`\ntotal violations: ${findings.length}`);
if (findings.length) process.exit(1);
console.log("all card text follows docs/card-text-style.md");
