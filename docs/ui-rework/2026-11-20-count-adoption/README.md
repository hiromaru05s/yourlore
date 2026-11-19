# 枚数表示 B＋A 採用

ユーザー指定（2026-11-20）: 「０１はB、０２はAで本番あげて」。

- 墓地・デッキ: B「白磁の銘板」。中央の横長白磁プレート、左右の細線、紺の数字。
- 在庫: A「銀縁の小札」。カード下辺中央、銀色の面取り。残り1枚は琥珀寄りの色。
- 元プレビュー: main `fd136d7be`、`/Users/hiromaru05s/.codex/worktrees/count-ui-study-1120/LORE_TCG/client/src/dev/countStudy/variants.css`。
- 統合起点: main `10bf25e0e`。既存の手札サイズ・傾き調整を含む。
- 実装: `client/src/styles/reading-board.css`。既存のpile/market DOM、数字テキスト、3D台座の高さと操作経路を維持。
- `client/src/ui/anim.ts`: 購入演出中に在庫が1へ減った時点でも、既存のlastクラスを更新。
- 採用案のみ組込み。比較ページや試作用データ属性には依存しない。
- 作業元: `/Users/hiromaru05s/.codex/worktrees/count-ui-release-1120/LORE_TCG`。
- ブラウザ確認: 1360×820、390×844、0枚、残り1枚、ポインターの透過。詳細は `browser-checks.json`。
