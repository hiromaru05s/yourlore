# マナ水晶：採用③「深青の光芯」を通常対戦へ

2026-11-04。ユーザーが発光強化・現行の青へ寄せた第２稿③を承認し、本番反映を指示。

残っているマナの水晶だけが、深いサファイアの面・内部の明るい芯・柔らかな漏光・台座への照り返しを持つ。空の水晶、既存モデル、盤面、キャラクター、マナ計算／対戦ルールは保持。

- 承認元: `codex/mana-glow-three` commit `56e0f1f9`、`client/src/dev/mana-glow-three/material.ts` の③。承認済みパラメーター・形状・色を転記。
- 本番作業の基準: remote main `a41a503ab925d7a8152abd45ef18e6cf9e8ea589`。
- 作業／検証サーバー起動元: `/Users/hiromaru05s/.codex/worktrees/mana-glow-adoption/LORE_TCG`、通常Vite設定 `http://127.0.0.1:5295/mana-glow-adoption.html`。
- 採用盤面の参照: `client/src/ui/boardView.ts`, `duelScene.ts`, `readingBoardWidgets.ts`, `readingCrystalOptics.ts` と `client/public/models/reading-board/v1/`。試作のDPR強制・Viteソース置換・案の選択処理は製品へ入れない。
- 実装: `client/src/ui/manaCrystalGlow.ts` と `readingBoardWidgets.ts`。既存６反射の水晶シェーダーへ内部光を合成し、使用可能なInstancedMeshと同じ行列から漏光を配置。生成途中の未来の空きスロットは光らず、既存の生成材質にも内光を引き継ぐ。
- 漏光は陣営ごとのInstancedMesh、照明は各陣営１灯。0〜30個で光源数を固定。微小な4.5%の約７秒周期のゆらぎは最大8HzでHDR再描画を更新し、差分が小さい時とマナ0では更新を休止。低減モーションは静止。終了時にGPU資源を解放。

## 検証

- `tests/mana-crystal-glow.mjs`: 表示中の水晶と光の位置一致、0/2/30個、再描画頻度上限、低減モーション、既存材質のコンパイル処理合成、資源解放。必須production suiteへ登録。
- `tests/mana-crystal-glow-browser.mjs`: 両陣営2/6・0/6・6/6・2/30・30/30・0/3、両陣営の生成前後、低減モーション、1440×900／390×844／844×390。ブラウザーエラーなし。
- 初回の検証入力0/0はゲームの最低水晶数3に丸められるため、実ゲームの0/3へ修正。renderer単体の水晶0は別途確認。
- 通常DPRの実盤面画像を目視確認。承認済み③の内部光／青い漏光と、空水晶の灰色を維持。生成中は既存の結晶面の組み立てに連続する。
- 型検査・全268必須suite・デザインガード・本番ビルド成功。結果は `production/validation.txt` と `production/suite.json`。

実アカウント対戦・認証PvP・物理スマホ性能は未検証。機能検証と見た目の承認は区別し、見た目の承認はユーザーの③選択による。


## 本番反映

- 2026-11-04 19:13 KST、`https://yourlore.xyz` へ公開。
- source: `00ff5e000bdea7acd9ff84bb507d3947dacd238e`。
- Worker version: `9122742a-5ea1-4b17-918f-003bf79b05be`、100% traffic。`production/deployment.json`。
- GitHubの通常pushがInternal Server Errorで失敗したため、Git Data APIで各blobとツリーをローカルと照合し、force=falseでmainを更新。検証済みローカルと同一ツリー `ed0ac5a7ac6609a248f0a9a72469ec5bd8031194`。`production/git-publish.json`。
- 初回guardの267/268時は、sparse checkoutに既存CPU負荷検証のgzip fixtureが含まれず停止し、本番には未送信。fixtureを復元した同一ソースで再実行し268/268成功。テストの緩和・スキップは行っていない。
- 本番配信アプリでHOME→シングルプレイを開き、開幕・ターン演出終了後の1440×900／390×844を確認。初期状態と、見た目検証用に設定した両陣営2/6・0/6・6/6で点灯数を照合。`production/browser-report.json` と画像。
- 本番の `assets/duelScene-tQqd-vC-.js` に採用したshader識別子を確認。ブラウザー／WebGLエラーなし。2/6画像を目視し、青い２個と空の４個が区別できることを確認。
- 本番smokeは配信コード・素材を使い、APIだけをローカルguest fixtureへ差し替えた検証。実アカウント・サーバー対戦履歴を作成せず、認証PvP・実機性能は検証していない。
