# 検証とマージ時の引き継ぎ

124カードを改訂。PNG原本124枚、配信用WebP372枚（832 / 384 / 192px幅）を保存した。各画像の目視所見は `visual-qa.json`、やり直した6カードの経緯は `revision-log.json` に記録。生成時の寸法は結果ごとにmanifestへ記録し、変換時は全構図と縦横比を保持している。

- `python3 verify.py`：124枚の原本・生成元・配信用画像のSHA-256一致、対象外969ファイルの不変、ダークエルフ除外を確認。結果は [verification.json](verification.json)。
- 既存のブラウザー検証：全296カード・888画像URLをChromeでデコード。幅とキャッシュバージョン、24枚のカード枠表示、JavaScriptエラー0件を確認。[表示サンプル](framed-samples.png) / [検証結果](browser-art-check.json)。
- 一覧検証：124カードと変更前後248画像の読み込み、テーマ絞り込み、大文字小文字を区別しないID検索、390px幅で横溢れがないことを確認。[デスクトップ](gallery-desktop.png) / [スマホ](gallery-mobile.png) / [検証結果](gallery-check.json)。
- `check-card-art.mjs --include-starters`：296/296枚が存在。mtimeによる警告172枚は今回変更していないカードと完全一致する。新しいworktreeへの展開時刻によるもので、全対象外ファイルは制作前ハッシュと同一。改訂124枚には警告なし。[確認記録](inventory-check.json)。
- `git diff --check` とブラウザー検証スクリプトの構文確認が成功。

カード枠では画像左右が既存の仕様に従ってトリミングされる。代表24枚を目視し、犬の顔、仮面、各テーマの主役を判別できることを確認した。ゲームルールを変更していないため対戦進行のテストは今回の対象外。全案はユーザーのフィードバック待ちで、目視検証は採用承認を意味しない。

作業ブランチは `codex/card-art-theme-revision-20260910`、作業開始コミットは `c4ec1ed`。ローカルコミットのみを行い、マージ・push・デプロイは実施しない。採用時は画像3サイズと `client/src/ui/cardArt.ts` のキャッシュバージョンを一緒に取り込む。

## ローカル再確認

一覧は `index.html` をブラウザーで開く。原本を含む比較画像は相対参照なのでフォルダごと移動できる。Markdown画像一覧はCodex表示のため制作worktreeの絶対パスを使っている。別のcheckoutで表示する場合は `python3 build-review.py` で一覧を再生成する。

配信用画像の再変換は `node import-art.mjs`。再検証は `python3 verify.py`。生成元PNGが別マシンにない場合、元ファイルとの照合部分は利用できないが、保存済みPNGとmanifestのハッシュが証跡として残る。
