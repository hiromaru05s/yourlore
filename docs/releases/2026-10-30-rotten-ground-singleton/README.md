# 腐敗した土地 — 両フィールド合計1枚

ユーザー指定により、腐敗した土地はお互いのフィールド全体で1枚だけ存在できる。既にどちらかの場にあれば2枚目の発動をマナ・手札・割引回数の消費前に拒否する。既存カードが場を離れれば、どちらのプレイヤーも再び発動できる。

カード効果の先頭に `【設置上限】このカードはお互いのフィールド全体で1枚しか存在できない。` を明記し、英語・韓国語と発動拒否ログも同じ制限に統一。召喚時の腐敗カウンター2個という効果は変更しない。

参照元: 最新main `89e4e752fc671415baea52466d5759cf39d32bad`。対象: `client/src/shared/engine.ts` の `spellCondition`（手札の可否表示・BOT・サーバーで共有）、`cardEffectText.ts` とカード定義。作業元: `/Users/hiromaru05s/.codex/worktrees/rotten-ground-singleton/LORE_TCG`。

## 検証

- `tests/rotten-ground-singleton.mjs`: 双方の配置者と使用者、初回発動、2枚目拒否、無消費、手札/BOT判定、実際の除去後の再発動、腐敗カウンター2個、三言語、GameRoomのアクション処理・両クライアントへの状態送信・保存復元。
- `scripts/check-card-text.mjs`: 381枚×3言語の本文・見出し・翻訳数量整合性。
- `tests/card-wording-render.mjs`: 1,143件の全文描画検証。
- 本番ガードが統合済みコミットの型チェック・全production suite・ビルド・公開前のmain/既存デプロイ整合性を確認する。

GameRoom検証はローカルのストレージ/ソケットfixture。実アカウント同士のPvP検証ではない。
