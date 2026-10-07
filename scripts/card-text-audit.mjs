import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { loadCards, loadCardText } from './card-art-lib.mjs';

export const AUDIT_PATH = 'docs/card-text-audit-2026-10-07.json';
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
  const audit = { date: '2026-10-07', ruleVersion: '2026-10-07', locales: LOCALES, count: cards.length, engineSha256: hash(await fs.readFile('client/src/shared/engine.ts','utf8')), cards: {}, keywords: PASSIVES };
  const lines = ['# 全カード効果表記監査 — 2026-10-07', '', '360枚 × 日本語・韓国語・英語 = 1080文面。生成専用カードとスターターを含む。実装照合後の文面を記録し、数値・対象・選択・処理順・期限・回数・ゾーンを確認した。機械チェックは意味の証明ではなく、翻訳欠落やレビュー後の変更の検出に使う。', '', '## 主な訂正', '', '- 「奇襲」：相手へのダメージを実処理の8に訂正。', '- 「始原の魔法」：強化を実処理の攻撃力+4・体力+4に訂正。', '- 自動除去：選択可能に見える文を、対象範囲・自動選択基準・同値の優先順へ書き換え。', '- 卵：孵化までの残りターンと、攻撃・ダメージで失うカウンターを区別。', '- 条件：購入／召喚／使用、デッキ／デッキ構成、現在／最大／印刷体力を区別。', '- 回数：同名合計／各個体、ゲーム中／毎ターンを区別。', '- 墓地へ用語を統一し、リフトとの移動方向を明示。', '', '## 確認範囲と実装上の注意', '', '文面以外のカード定義は監査開始時から不変。効果実装も変更していない。文面で実装に合わせた箇所を仕様変更と混同しない。', '', '既存処理には選択待ちが重なった際の省略・自動選択、生成したモンスターの召喚時／ターン開始時効果の扱いなど、通常の手札使用と異なる経路がある。今回それらのゲーム処理は変更していない。カードの効果対象に対するオーラ、場の上限、召喚禁止、他カードの補正などの共通制約は引き続き適用される。', '', '台帳の hooks は各カードを照合するための実装キー。専用ID分岐がある場合は engine.ts の同ID処理を優先する。旧文面も比較用に保持する。', '', '## キーワード説明', '', '11種のキーワード説明も日本語・韓国語・英語で照合し、発動タイミング・対象・例外を明記した。台帳JSONの keywords に全文を記録する。', '', '## 検証', '', '- 全360枚×3言語の台帳照合、翻訳・数値・見出し・ダイス表の整合チェック。', '- 実際の描画関数で全1080文面を検証。', '- 代表的な効果8ケースと既存の32ケースを実行。', '- クライアント／サーバー型チェック、製品ビルド。', '- ブラウザーで長文・ダイス表・3言語の詳細表示を確認。モバイル幅の横つぶれを修正。', '- ローカル検証。ステージング／本番への公開は行っていない。', '', '## 全件結果', ''];
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
    for (const l of LOCALES) lines.push(`- **${l}**：${now[l] || '（追加効果なし・キーワード表示のみ）'}`);
    lines.push('');
  }
  audit.changedCards = changed; audit.changedTexts = changedTexts;
  lines.splice(4,0,`文面変更：${changed}枚／${changedTexts}文面。残りも全件確認済み。`, '');
  await fs.writeFile(AUDIT_PATH, JSON.stringify(audit,null,2)+'\n');
  await fs.writeFile('docs/card-text-audit-2026-10-07.md',lines.join('\n'));
  console.log(`Audited ${cards.length} cards / ${cards.length*3} texts; changed ${changed} cards / ${changedTexts} texts; non-text definitions unchanged`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await writeAudit();
