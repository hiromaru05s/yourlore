# LORE 効果音 v5

ローカルプレビュー: http://127.0.0.1:5338/sound-review.html

2026-09-30: ユーザーが試聴待ちを省略し、完了後のステージング反映を指示。分離した作業ツリーで最新mainに統合して検証する。本番公開は対象外。

## 変更

- 新しい振り抜き・打撃素材を使い、28キュー / 32音源を再制作。
- HOMEのclick・pop・error・coin・matchは維持。Drawは既存③だけ。Buyは既存音を維持。
- 有料購入の支払い完了後と無料購入にBuyを接続。
- マナ支払いの参照先を消失したhpbarから現在のportraitのマナ表示へ修正。
- 新版にはv4の汎用魔法サンプルを重ねていない。

## 音源の全対応

| キュー | 対応 | ファイル数 |
|---|---|---|
| click | 既存を維持 | 3 |
| pop | 既存を維持 | 1 |
| error | 既存を維持 | 1 |
| coin | 既存を維持 | 1 |
| match | 既存を維持 | 1 |
| draw | 既存③に固定 | 1 |
| buy | 既存を維持 | 1 |
| attack | 再制作 | 3 |
| impact | 再制作 | 3 |
| facehit | 再制作 | 1 |
| damage | 再制作 | 1 |
| summon | 再制作 | 1 |
| mimic | 再制作 | 1 |
| play | 再制作 | 1 |
| heal | 再制作 | 1 |
| death | 再制作 | 1 |
| trapSet | 再制作 | 1 |
| trap | 再制作 | 1 |
| mana-pay | 再制作 | 1 |
| mana | 再制作 | 1 |
| turn | 再制作 | 1 |
| win | 再制作 | 1 |
| lose | 再制作 | 1 |
| drawGame | 再制作 | 1 |
| void | 再制作 | 1 |
| shuffle | 再制作 | 1 |
| duel-start | 再制作 | 1 |
| discard | 再制作 | 1 |
| coinToss | 再制作 | 1 |
| coinLand | 再制作 | 1 |
| diceRoll | 再制作 | 1 |
| diceLand | 再制作 | 1 |
| rankUp | 再制作 | 1 |
| rankDown | 再制作 | 1 |
| rankPromote | 再制作 | 1 |

## 検証

- `checks/signal.json`: 全41選択ファイルのハッシュ、音声デコード、クリップなし、立ち上がり、末尾、モノ互換。
- `checks/audio-browser.json`: 実際の共有AudioContext、35キュー、召喚同期、攻撃接触の重複抑止、購入の支払い→Buy／無料Buy。
- `checks/preview-browser.json`: 全73試聴ボタン、新旧連続試聴、BGM、停止、検索、PC／スマホ。
- `checks/commands.json`: typecheck、build、音声ライフサイクルの終了コード。
- 上記は機能・信号の検証。人間の聴感の採用判断とは別。

## 再現

```sh
python scripts/audio/build_lore_sfx_v5.py  # numpy / scipy / ffmpeg
python scripts/audio/check_lore_sfx_v5.py
npm --workspace client run dev -- --host 127.0.0.1 --port 5338 --strictPort
node tests/audio-v5-browser.mjs
node tests/sound-review-browser.mjs
```

リサーチと実装マトリクスは `RESEARCH.md`。音源ごとの出典・出力ハッシュは `inventory.json` と `client/public/sfx/lore-v5/manifest.json`。
