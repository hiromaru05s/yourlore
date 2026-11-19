# 盤面に寄せたネームタグ3案（未採用）

ユーザー指定: デザイン自体を盤面の雰囲気へ寄せ、3パターンを実盤面で比較する。

- 01 真鍮のトレイ: 水晶枠の二重の真鍮縁・紺の面・面取りに合わせる。
- 02 象牙の銘板: 天板の象牙色を使い、濃紺の文字と細い真鍮線で刻印のように見せる。
- 03 紺革の背表紙: マットな紺革、細い縫い目、両端の真鍮の留め具。

全案でLv＋名前、幅、7枠配置を共通にする。銘板はマナ水晶トレイの見える縁に接続。SVGとCSSで制作し、既存の素材を再生成しない。今回のCSSは専用プレビュー入口だけで読み込む。いずれも採用・本番反映はしていない。

## 参照元

- 最新gh/main確認: `aabdea3ab`（攻撃可能表示03の採用確認）。
- この会話の7枠・Lv配置: `279687797`。本番未反映のユーザー指定実装として維持。
- 両者の統合基点: `e3ba5a0ad`。
- 実盤面: `client/src/ui/boardView.ts`, `client/src/ui/boardProjection.ts`, `client/src/ui/readingBoardLayout.ts`。
- 採用素材: `client/public/models/reading-board/v2-shared/` と既存キャラクター／カード。統合差分で盤面・肖像の参照が変わらないことを確認。

## プレビュー

起動元: `/Users/hiromaru05s/.codex/worktrees/nameplate-board-1119/LORE_TCG/client`

- 比較: `http://127.0.0.1:5473/nameplate-three.html`
- 単体実盤面: `http://127.0.0.1:5473/nameplate-study-board.html?look=brass`（`ivory` / `leather`へ変更可）
- 1920×1080と1280×720はCSS縮小を行わず、指定サイズのiframeに実盤面を描画。ウィンドウに合わせるモードも実viewportで再配置。
- ボタンまたは1・2・3キーで両陣営を同時切替。単一の盤面を保ち、切替で対戦状態は作り直さない。

実装: `client/src/dev/nameplateStudy.ts`, `client/src/dev/nameplateStudy.css`, `client/public/art/ui/nameplate-study-{brass,ivory,leather}.svg`。

## 確認

client typecheck成功。Chromeで3案の実素材読込、7枠・Lv表示、ボタン切替、表示サイズ切替を確認。1920×1080の各全景・等倍部分画像、1280×720の画像を保存し目視確認。スクリプトエラーなし。

画像・測定記録: `/Users/hiromaru05s/.codex/visualizations/2026/11/19/01a1f366-7e3f-7300-a05d-004ca545fafd/nameplate-three/`。
