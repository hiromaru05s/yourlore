#!/usr/bin/env node
import fs from 'node:fs/promises';
import { loadCards, loadCardText } from './card-art-lib.mjs';
import { AUDIT_PATH, LOCALES, effects, mechanics, hash } from './card-text-audit.mjs';

const audit = JSON.parse(await fs.readFile(AUDIT_PATH, 'utf8'));
const cards = await loadCards({ includeStarters: true });
const { CARD_EFFECT_TEXT, parseDiceTable, cardPassives, PASSIVES, CARD_KEYWORD_TEXT } = await loadCardText();
const problems = [];
const fail = (id, rule, detail) => problems.push(`${id} ${rule}: ${detail}`);
const tagRows = [
  ['召喚条件','소환 조건','Summon Requirement'], ['発動条件','발동 조건','Play Requirement'],
  ['購入条件','구매 조건','Purchase Requirement'], ['攻撃条件','공격 조건','Attack Requirement'],
  ['召喚時','소환시','On Summon'], ['発動時','발동시','On Cast'], ['購入時','구매시','On Purchase'],
  ['常時','상시','Passive'], ['永続','영구','Permanent'], ['破壊時','파괴시','On Destruction'],
  ['自分ターン開始時','자신 턴 시작시','Your Turn Start'], ['自分ターン終了時','자신 턴 종료시','Your Turn End'],
  ['双方のターン開始時','양쪽 턴 시작시','Either Turn Start'], ['攻撃時','공격시','On Attack'],
  ['攻撃後','공격 후','After Attack'], ['クエスト','퀘스트','Quest'], ['報酬','보상','Reward'],
  ['回数制限','횟수 제한','Use Limit'], ['卵','알','Egg'],
];
const numberWords = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,twice:2,double:2,doubled:2,triple:3,tripled:3 };
// Distinct magnitudes >=2 plus explicit zero. Singular articles and repeated
// grammatical references differ across languages; quantities/targets are also
// manually reviewed and frozen by the text digest. This is not a translation proof.
function numbers(s) {
  s = s.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twice|double|doubled|triple|tripled)\b/gi, w => numberWords[w.toLowerCase()]);
  s = s.replace(/no other cards in hand/gi,'0 other cards in hand');
  return [...new Set((s.match(/\d+/g)??[]).map(Number).filter(n=>n!==1))].sort((a,b)=>a-b).join(',');
}
function tags(s, lang, id) {
  return [...s.matchAll(/【([^】]+)】/g)].map(m => {
    const n = tagRows.findIndex(row => row[LOCALES.indexOf(lang)] === m[1]);
    if(n<0) fail(id,lang,`unknown timing/condition tag ${m[1]}`);
    return n;
  }).join(',');
}
const ids = new Set(cards.map(c=>c.id));
for (const id of Object.keys(CARD_EFFECT_TEXT)) if(!ids.has(id)) fail(id,'coverage','orphan canonical entry');
for (const id of Object.keys(audit.cards)) if(!ids.has(id)) fail(id,'coverage','audited card removed');
for (const c of cards) {
  const r=effects(c), entry=audit.cards[c.id];
  if(!entry) {fail(c.id,'coverage','missing review'); continue;}
  if(hash(mechanics(c))!==entry.definitionSha256) fail(c.id,'definition','card definition changed since review');
  if(hash(r)!==entry.textSha256) fail(c.id,'review','text changed since review; update all languages and audit');
  const signatures=[], timings=[], tables=[];
  for (const lang of LOCALES) {
    const s=r[lang];
    if(typeof s!=='string') {fail(c.id,lang,'missing translation');continue;}
    if(s!==CARD_EFFECT_TEXT[c.id]?.[lang]) fail(c.id,lang,'canonical text mutated at runtime');
    if(!s && !cardPassives(c).length) fail(c.id,lang,'empty effect without keyword abilities');
    if(/シェルフ|셸프|선반|\bshelf\b/i.test(s)) fail(c.id,lang,'retired graveyard name');
    if(lang!=='ko' && /[가-힣]/.test(s)) fail(c.id,lang,'Korean fallback');
    if(lang==='en' && /[ぁ-んァ-ヶ一-龯]/.test(s)) fail(c.id,lang,'untranslated Japanese');
    if(/【毎ターン】|【Each Turn】|【매턴】|cost \d+\s*-\b|\bmons\b|\.\.\.|…/.test(s)) fail(c.id,lang,'ambiguous timing or abbreviation');
    if((s.match(/【/g)??[]).length!==(s.match(/】/g)??[]).length) fail(c.id,lang,'unbalanced tags');
    signatures.push(numbers(s)); timings.push(tags(s,lang,c.id));
    const table=parseDiceTable(s); tables.push(table ? table.rows.map(r=>r[0]).join('/') : 'none');
    if(s.includes(' / ') && !table) fail(c.id,lang,'invalid dice result table');
  }
  if(new Set(signatures).size>1) fail(c.id,'numbers',LOCALES.map((l,i)=>`${l}=${signatures[i]}`).join(' '));
  if(new Set(timings).size>1) fail(c.id,'timing','trigger/condition order differs between languages');
  if(new Set(tables).size>1) fail(c.id,'dice','result rows differ between languages');
}
for (const [key, entry] of Object.entries(PASSIVES)) {
  if (hash(entry)!==hash(audit.keywords?.[key])) fail(key,'keyword','description changed since review');
  for (const lang of LOCALES) {
    if(entry[lang].desc!==CARD_KEYWORD_TEXT[key]?.[lang]) fail(key,lang,'keyword description missing or overridden');
    if(/シェルフ|셸프|선반|\bshelf\b/i.test(entry[lang].desc)) fail(key,lang,'retired graveyard name');
  }
  if(new Set(LOCALES.map(l=>numbers(entry[l].desc))).size>1) fail(key,'keyword','numbers differ across languages');
}
if(cards.length!==audit.count) fail('*','coverage',`catalog ${cards.length}, audit ${audit.count}`);
if(problems.length) { console.error(problems.join('\n')); console.error(`${problems.length} card-text violations`); process.exitCode=1; }
else console.log(`PASS: ${cards.length} cards × ${LOCALES.length} languages (${cards.length*3} texts); coverage, terminology, numeric/timing/table parity, reviewed text, unchanged definitions`);
