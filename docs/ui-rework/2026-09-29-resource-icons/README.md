# 肖像の体力・シールド・雫アイコン

ユーザー指定：体力は左下、シールドは下中央、雫は右下。自分と相手の両方に適用。

既存 `health.png` を参照画像にし、内蔵 image_gen で青い盾と翡翠色の雫を生成。白い縁と金の装飾を共通化し、数値は従来どおりHTMLで描画する。透明背景を保持した512px PNGを `client/public/art/biblion/modular/shield.png` / `dew.png` に保存。生成プロンプトと生成元は `generated-icons.json`、配信画像ハッシュは `asset-manifest.json`。

既存テキストバッジを画像＋数値に置換。0も表示し、各アイコンの読み上げラベルと説明tooltipを保持。3桁以上は数値の文字サイズを縮小する。対戦準備のプリロードに両画像を追加。

## 検証

- client/server typecheck、build成功。
- 実際の `GameView.renderPortrait` と `placeReadingBoard` を使うブラウザ部品fixtureで1440×900、1920×1080、390×844、844×390を検証。
- 双方の左→中央→右の順序、中央と肖像中心の一致、3アイコンの高さ一致、非重複、画面内への収まり、0表示、3～4桁の収まりを確認。
- `portrait-detail.png` は部品fixtureの実表示。全面対戦・演出の再検証という意味ではない。
- 生成元2枚のalphaを検査。PNG形式変換時に保持。

最終統合とステージング公開は統合担当タスクへ引き渡す。公開結果は統合担当のリリース記録に保存する。
