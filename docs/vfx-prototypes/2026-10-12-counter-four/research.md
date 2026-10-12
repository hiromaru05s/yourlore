# 反撃前700ms — 制作前調査 / 2026-10-12

## 他セッションの人間の指摘

吸血鬼召喚（01a1198e-5db7-70f3-848b-f6cb88ffe9dc）の直近4ターンを確認。「1パターンを使い回した6パターン」「何かのマークに見える」「フレームの上下と接点が曖昧」。アサシン召喚（01a11987-2094-7b62-a792-7078841add82）では「既に適用されている品質を確認して」「下へスクロールできない」。ガチャ（01a11973-ce39-7672-8912-8073b56a6d0c）では「ぼけは一瞬」「光がすぐ動く」「表紙貫通」「同じ頁」「結果が不自然に出る」。

今回の判断: 同一リグのパラメーター替えでなく、弾性曲げ / 片側ピボット / 液膜逆流 / 二面の折り畳みを別々の変形として設計。同じ色でも判別可能にする。カード面の実寸を基準とし、キャプチャの12%余白を除去して接点の誤差を防ぐ。絵は700msを通じて保持。広いぼかし・粒子群・独立魔法陣なし。比較ページはゲームCSSのスクロール固定を明示解除。

## 承認済み資料

`docs/animation-quality-benchmark.md`、`docs/vfx-art-direction.md`、`docs/world-bible.md` を確認。「銀紋の流墨」の動画を6fpsで連続フレーム抽出し、全行程を観察。カード内の線と輪郭の変形が同時に進む点、暗い主面と狭い明縁を翻案する。除外の渦や長い転送時間そのものは使わない。
Toon参照 `impact-detail-24fps.jpg`（25.70秒〜）も観察。小さい予兆→鋭いピーク→裂けて細る形。今回の主動作は反撃前なので命中爆発を予備動作に混ぜない。

## 一次資料

- [Blizzard / Hadidjah Chamberlin, Developer Insights: The Art Behind THE SCIENCE](https://news.blizzard.com/en-gb/article/22552047/developer-insights-the-art-behind-the-science)。全文と公式Magnetic / Kangor GIFへのリンクを確認。カードの意味と素材を結びつけ、主要な動作を中心に二次動作を付ける制作判断を参照。小さな装飾を増やすのではなく、関係性を直接読める主形状にする。
- [Riot / Animation in the League of Legends Client](https://www.riotgames.com/en/news/animation-league-legends-client)。単一タイムラインで制御できる構成、変換をレイヤー単位でまとめる議論を参照。
- Riot旧VFXガイドPDFと解説URLは現行ホームへ転送され、本文を再取得できなかった。GDC Artistic Principles of VFX PDFもwebツールの容量制限で本文を取得できなかった。読了資料として扱わない。

## 現在のゲームとの接続調査

`engine.ts:counterHit` は現在logとhitを発行し、独立したcounter/attackイベントを発行しない。倒されても反撃する仕様なので、採用時には破壊前の公開カード面を保持する必要がある。ログ文字列から演出を推測する接続は避ける。
今回の選定用fixtureでは700msの予備動作→返撃を表示する。返撃部分は既存 `attackPose` / `drawAttackVisual` を使い、既存攻撃の180ms予備動作を重複させず、その終了姿勢へ700msで連続接続する。通常ゲームのイベント・ルールは編集しない。
