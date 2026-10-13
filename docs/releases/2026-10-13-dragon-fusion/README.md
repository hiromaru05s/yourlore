# Dragon fusion 04 — slate-blue ivory helix

ユーザー採用: 04「白角の双螺」。竜の色をGM6_0のカードアートに合わせ、融合素材の墓地送り演出を省略する。

## 実装

- 共通造形は `client/src/ui/dragonFusion/`。プレビューも同じものを使う。通常ゲームは04のみ生成。
- 青灰色の鱗、アイボリーの角と腹甲、真鍮の金具。二重螺旋と収束の動きは維持。
- 融合元UIDと原因が一致する素材退場だけを保留し、専用の融合演出で素材と最終枠を所有する。通常破壊、墓地/除外のルール上の移動は維持。
- 同一バッチで手札から召喚・融合するケースでも墓地送りが重複しない。融合先の通常召喚も重ねない。

## 検証

- `npm run typecheck`: client/serverとも合格。

- `node tests/dragon-fusion.mjs`: 16 engine cases（双方、両結果、選択/自動、実体/トークン）および正常終了・中断・低減・省略・素材欠損・GPU失敗の後始末に合格。
- `node tests/dragon-fusion-runtime-browser.mjs`: 26 checks、JS errors 0、専用描画のfallback 0。実BaseControllerとGameViewを使うローカルfixture。既存盤面rendererのPCFSoftShadowMap廃止警告1件。
- 実盤面キャプチャ `runtime-slate-blue.png` で色とシルエットを確認。機能検証と見た目の品質判断を区別する。
- 初期検証時には並行セッションの負荷と開発HMRにより撮影/待機がtimeoutした。共有公開の調整に合わせて所有プロセスを止め、編集を固定して再実行した最終26項目が `runtime-qa.json`。
- ステージングのログイン済み二者対戦はこのfixture検証に含まない。公開SHAと配信ハッシュは `staging-verification.json` に記録する。
