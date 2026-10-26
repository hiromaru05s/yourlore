# NPC選択画面のテキスト整理

参照した現行採用実装: `d17b5361` の `client/src/screens/home.ts`、
`client/src/styles/menuApproved.css`、共通の `defaultUI.css` / `defaultButtons.css`。
キャラクター画像と共通UIはこの版を継続使用した。

SINGLE、肩書き、戦術説明、難易度の接頭辞、ダブルクリック案内、
AI・使用デッキ数の説明を削除。初回報酬のシャードとEXPを1か所にまとめ、
クリア済みの状態を短く表示する。相手名、難易度、使用デッキ、選択状態と操作を保つ。

起動元: `/Users/hiromaru05s/.codex/worktrees/bot-strength/LORE_TCG`。
ローカルURL: `http://127.0.0.1:5279`。

Chromeで5画面サイズ、全難易度の選択、開始ボタン、Tab循環、Escape、
ダブルクリックから1回だけ対戦開始要求が送られることを確認。
例外0件。実際のUIと素材を使用し、アカウントとAPIはfixture。
認証済みの実対戦の検証ではない。PCと狭い画面の画像を目視確認した。

## 本番確認

`2ea49db9dd43c1ce3624d355a912a3d37b46a8a1` をガード経由で本番へ配信。
型検査・ビルド・回帰検査240/240通過。
Worker version: `36608318-89ef-4c98-b2e7-5fa44cd76075`。
本番URL `https://yourlore.xyz` の配信UIでも5画面サイズ・選択・キーボード操作を確認。
本番の画像・JS・CSSを読み込み、アカウント/APIだけfixtureを使用した。
`production.png` を目視し、不要文の削除と現行のキャラクター・共通枠を確認した。
