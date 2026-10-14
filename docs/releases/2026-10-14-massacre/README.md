# 大虐殺 — 奪命の捻転

2026-10-14: ユーザーが第3稿の③を選定し、通常対戦・ステージング適用とカードアートの再生成を承認。

## 演出

手札から中央手前へ提示し、左手前で保持。最大マナの代価は520 ms、黒鉄の拘束帯がカードの印刷面と裏面を捻り、1790 msに直接対象を一斉に破断。細い血赤の亀裂と消色で奪命感を示す。3100 msで消失、手札へ戻らない。ゲーム状態の変更は既存ルールが所有し、描画はその結果を提示する。

`destroy.cause=massacre` は直接破壊の識別のみ。破壊免疫、死亡時召喚、虚無・トークンの除外先を保持し、対象外の死亡・召喚は既存イベント処理に渡す。元の汎用魔法提示・破壊を二重再生しない。キャンセル、非表示、リサイズ、WebGL不使用時は後始末し、権威状態へ収束。低減モーションは1150 msの短縮経路。

## アート

組み込み画像生成ツールで新規生成。`art/prompt.txt` が最終プロンプト。`docs/card-art-direction.md` の手描きダークファンタジー、粗い筆致、明暗の色面、中央の主形状を採用。現象を描く魔法カードとして、壊れた青い力の器から黒鉄の帯が伸び、魔物の石版を捻り砕く。人物・人体・大量の血・実写写真・光沢CGなし。

生成原本を `art/MASSACRE-source.png` に保存。1472×1344 WebPマスター、および通常・384・192pxの配信用WebPを生成。MASSACREのみURLリビジョンを更新し、他カードのキャッシュは維持。

## 検証の区別

選定元はローカル比較ページ `massacre-five.html?paused&revision=3` の③。通常速度とネイティブ盤面の承認済み造形・時間設計を移植。機能検証は `tests/massacre.mjs` と `tests/massacre-browser.mjs`（実Controller + reducerの固定公開盤面）。後者はログイン済み二者オンライン対戦の証拠ではない。ステージングのソース・配信アセット照合は別ファイルへ記録する。

2026-10-14 local verification: 10 rules/ownership cases passed; actual-controller browser QA passed 8 cases (desktop and 390px, both sides, counts 1/3/5, reduced motion, fast-forward, resize, hidden). Client/server typecheck passed. After integrating the current shared Infinity presentation, the application build passed (existing large-chunk advisory remains). The browser harness can also exercise the built/staged client using public JSON fixtures, without importing development source modules.

The latest shared Nova runtime is also integrated. The production build passed after that merge. Built-client QA repeated all 8 cases successfully, including no duplicate generic reveal and a nonnegative animation clock. Cold frame-texture preparation retries once within the owned preparation lifetime; this addresses the observed first-load timeout without changing the shared texture loader. Staging deployment remains a separate recorded step.
