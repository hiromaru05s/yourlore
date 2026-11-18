# 第4稿 — 実映像に沿った召喚2種と、現行の枠を使う魔法

2026-11-18。ユーザー指定：ドローは維持。召喚はハースストーンとシャドバの模倣を目指して別々に制作。魔法は現行より低品質だった前稿をやり直す。

## プレビュー

[比較プレビュー](http://127.0.0.1:5298/cinematic-vfx.html)。初期設定で同じ実盤面・カードを **現行 → ハースストーン版 → シャドバ版** の順に再生する。魔法を選ぶと現行と再制作版を交互再生する。試作のみではバージョン、速度、再生位置、白・暗背景を選べる。ドローは第3稿を維持。攻撃は未改修で「前稿」と明示。

## 映像確認と変更

- ハースストーン：[Trump Deck Teachings — Midrange Paladin](https://www.youtube.com/watch?v=8RN9ui-wPXI)、175–179秒付近の通常召喚。公式の[Trump Teachings紹介](https://hearthstone.blizzard.com/en-us/news/17528773)から参照。手札から盤面へ移動し、青く縁取られた全体カードから盤面用の姿へ変わる流れを確認した。試作も同じ流れで、裏面全体を盤面に沿わせ、1.04秒で接地する。カードの表面に結び付く発光と接地直前の白い変化を使用。原作の楕円ミニオンへの変化は、LOREの採用済み長方形カードへの変化に置き換えている。
- シャドバ：[Shadowverse Gameplay HD](https://www.youtube.com/watch?v=j9drRwDyuBk)、111.3–114.5秒付近の通常ゴブリン召喚。提示カードが淡い白金色へ変わり、白い核と広がる縁、その後の白い曲線の収束へ移る様子を連続フレームで確認した。試作はこの順番とシルエットを基に再制作。前稿のマナ表示から伸びる独自の流れを撤去した。公式トレーラーも確認したが、レジェンド固有演出は通常召喚の基準にはしていない。
- 魔法：現行の `createFrameScene` と `cloneCardNode` を直接利用。採用済み「03 四隅の共鳴」の実際の枠マスク、彫りに沿う発光、HDR/bloomを維持する。カード提示・発光の進行・墓地への移動を同じ時計でつなぎ、カード絵に限定した弱い一回の光を加えた。カード固有の攻撃や属性表現は加えていない。

他作品の画像・動画・音声はアプリ素材として取り込んでいない。動きの観察に利用した。原作のカード形状・盤面・素材自体は再現していないため、完全一致を達成したとは扱わない。

## 現行参照・起動元

取得済み `gh/main`: `db23af652b147129f89f6cce780b8d4a8a87b1f4`。作業の土台 `914dc9bab354518587fb9a17e1c5e14ef550a703` と比較し、このフィクスチャが使う盤面・カード・アニメーションの採用実装に変更がないことを確認。差分のストーリー素材・ラウンジはこの画面では使っていない。

- 現行の実行：`client/src/ui/anim.ts` の `animateDraw` / `ghostSummon` / `attackStrike` / `revealSpell` を `client/src/dev/cinematic-vfx/current.ts` から直接呼ぶ。
- 実盤面：`client/src/ui/boardView.ts`、`boardProjection.ts`、`cardView.ts`、`client/src/styles/reading-board.css`。共通 `fixture.ts` で同じ `GameView` を描画。
- 現行魔法：`client/src/ui/spellFrame/scene.ts` と同ディレクトリのマスク・シェーダー。
- 再制作：`client/src/dev/cinematic-vfx/scene.ts`、`arrival.ts`、`spell.ts`、`material.ts`。
- 起動元：`/Users/hiromaru05s/.codex/worktrees/cinematic-vfx-1118/LORE_TCG/client`、ポート5298。ブランチ `codex/cinematic-vfx-1118`。前稿 `0c5651bbe`。

実際の読み込み素材と表示したGameViewを確認。Desktopの既存作業は変更していない。固定盤面の試作で、ゲーム進行には未接続、本番未反映。

## 検証

型チェック：`npm --workspace client run typecheck` 成功。

自動検証：`node docs/vfx-prototypes/2026-11-18-cinematic/check-r4.mjs`。結果は `qa/r4/report.json`、連続再生録画は `qa/r4/continuous.webm`。画像・動画はローカルのみ。結果：26項目成功、ページ・コンソールエラー0、読み込み素材60件。召喚3種の連続比較、通常再生後の復帰、魔法3枚×両陣営、白・暗背景、スマホ幅、中断・破棄、低減モーションを確認。

目視：通常速度の実盤面、召喚の変化途中と出現、魔法の枠発光を確認。最低品質資料「銀紋の流墨」の動画も再確認した。シャドバ版の曲線が均一な線の輪に見えたため、幅のある先細りの白い曲面に変更した。機能検証の成功と、模倣の精度・見た目の採用判断は分ける。原作との完全一致、ユーザーによる採用は未確認。
