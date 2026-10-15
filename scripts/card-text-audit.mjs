import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { loadCards, loadCardText } from './card-art-lib.mjs';

export const AUDIT_PATH = 'docs/card-text-audit-2026-10-08.json';
export const LOCALES = ['ja', 'ko', 'en'];
export function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
  return value;
}
export function hash(value) { return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
export function effects(card) { return { ja: card.textJa, ko: card.text, en: card.textEn }; }
export function mechanics(card) {
  return Object.fromEntries(Object.entries(card).filter(([key]) => !['text', 'textJa', 'textEn'].includes(key)));
}
const hooks = c => Object.fromEntries(['act','onSummon','turnFx','aura','ench','summonReq','attackFx','onDeath','quest','quick','hatchTurns'].filter(k => c[k] != null).map(k => [k,c[k]]));

async function writeAudit() {
  const i = process.argv.indexOf('--baseline');
  if (!process.argv.includes('--write') || i < 0 || !process.argv[i+1]) throw new Error('After reviewing all changes: node scripts/card-text-audit.mjs --write --baseline <pre-edit-catalog.json>');
  const before = JSON.parse(await fs.readFile(process.argv[i+1], 'utf8'));
  const cards = await loadCards({ includeStarters: true });
  const { PASSIVES } = await loadCardText();
  const baseline = new Map(before.map(c => [c.id,c]));
  if (baseline.size !== cards.length) throw new Error('Baseline catalog size differs; review additions/removals separately');
  const audit = { date: '2026-10-08', ruleVersion: '2026-10-08', locales: LOCALES, count: cards.length, engineSha256: hash(await fs.readFile('client/src/shared/engine.ts','utf8')), cards: {}, keywords: PASSIVES };
  const lines = ['# 全カード効果表記監査 — 2026-10-08', '', '360枚 × 日本語・韓国語・英語 = 1080文面。生成専用カードとスターターを含む。前版の実装照合に加え、全件の条件・主体・対象・選択・処理順・期限・回数を再読し、明示的な段落構造と改定ルールに合わせた。', '', '## 改定範囲', '', '- 条件と処理を分離し、独立した発動タイミングごとに見出しを付ける。', '- 成功に依存する処理、任意選択、条件が複数処理にかかる範囲を明記。', '- リコールの自身除外、浄化の手の選択取消、コレクターの条件付き移動等を実処理に合わせる。', '- 卵の耐久と孵化までの残りターンを分離。カウンターの用途・付与先を明記。', '- 全言語の略記を整理し、墓地／リフト、現在／最大／印刷体力を維持。', '- 詳細画面の見出し、文字付き能力名、開閉する共通用語欄。', '', '## 証拠の範囲', '', '非テキストのカード定義は基準カタログと同一。エンジンのゲーム処理は変更していない。台帳のハッシュは再編集の検知用で、意味の正しさや読者の理解度を自動証明しない。', '', '読み取り設問と各言語の期待回答は card-text-comprehension-2026-10-08.md、実行した検証と公開先は今回のリリース記録を参照する。実際の初見プレイヤー／母語話者のユーザーテストは実施していない。', '', '## 全件結果', ''];
  let changed = 0, changedTexts = 0;
  for (const c of cards) {
    const b = baseline.get(c.id);
    if (!b || hash(mechanics(c)) !== hash(mechanics(b))) throw new Error(`Non-text catalog change: ${c.id}`);
    const old = effects(b), now = effects(c);
    const languages = LOCALES.filter(l => old[l] !== now[l]);
    if (languages.length) changed++;
    changedTexts += languages.length;
    audit.cards[c.id] = { nameJa: c.nameJa, status: languages.length ? 'reworded' : 'reviewed-unchanged', changedLocales: languages, definitionSha256: hash(mechanics(c)), textSha256: hash(now), hooks: hooks(c), before: old, after: now };
    lines.push(`### ${c.id} — ${c.nameJa}`, '', `確認済み：${languages.length ? `表記改定（${languages.join(' / ')}）` : '既存の明確な表記を維持'}。実装キー：\`${JSON.stringify(hooks(c))}\`。`, '');
    for (const l of LOCALES) lines.push(`**${l}**`, '', ...((now[l] || '（追加効果なし・キーワード表示のみ）').split('\n').map(line => '> ' + line)), '');
    lines.push('');
  }
  audit.changedCards = changed; audit.changedTexts = changedTexts;
  lines.splice(4,0,`文面変更：${changed}枚／${changedTexts}文面。残りも全件確認済み。`, '');
  await fs.writeFile(AUDIT_PATH, JSON.stringify(audit,null,2)+'\n');
  await fs.writeFile('docs/card-text-audit-2026-10-08.md',lines.join('\n'));
  console.log(`Audited ${cards.length} cards / ${cards.length*3} texts; changed ${changed} cards / ${changedTexts} texts; non-text definitions unchanged`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await writeAudit();
