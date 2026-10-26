# LORE — デッキビルド × TCG

対戦中にマーケットからカードを購入し、デッキを育てるブラウザカードゲームです。フロントエンドはVite + TypeScript + Three.js、サーバーはCloudflare Workers + Durable Objects + D1で構成しています。

- 本番: [yourlore.xyz](https://yourlore.xyz)
- ステージング: [test.yourlore.xyz](https://test.yourlore.xyz)
- 対応言語: 日本語・韓国語・英語

## 主な機能

- 通常・ランク・フレンド対戦、難易度別BOT対戦、チュートリアル
- スターターカードの収集、5つのデッキプリセット、マーケットのウォッチリスト
- ランキング、プロフィール、フレンド、メダル
- 経験値・デイリークエスト・報酬、ショップ・ガチャ、スリーブ・家具・カード表面エフェクトの装備
- メールアドレスとパスワードによる認証、Googleログイン、メール認証・パスワード再設定

## ゲームの基本

- 初期デッキは自由枠8枚と固定の「アチューン」1枚。対戦中にカードを購入して構築を進めます。
- 先攻は体力40、後攻は体力45で開始します。最大マナの範囲は3〜30です。
- 毎ターン3枚ドローし、手札はターン終了時に7枚まで持ち越せます。超過分は選択して捨て、時間切れでは右側から破棄されます。
- 固定マーケットは各枠の在庫が3枚。売り切れると、現在の固定マーケットにないコスト1〜6のカードへ入れ替わります。
- 提示マーケットは両者共用の3枠。購入した枠はそのターン中は空欄になり、次のターン開始時に空き枠だけ補充されます。
- 相手の手札・山札のカード名は非公開です。公開されたカードは、その対戦のデッキ構成表示に記録されます。
- 罠カードとトラップマスターは廃止済みです。経緯は[罠廃止の作業記録](docs/card-rework/2026-09-09-trap-removal/README.md)を参照してください。

個別の効果や例外はゲーム内の「遊び方」とカード説明を参照してください。ルール処理は[engine.ts](client/src/shared/engine.ts)、カード定義と調整の適用は[cards.ts](client/src/shared/cards.ts)が起点です。

## 構成

```text
LORE_TCG/
├─ client/
│  ├─ public/                 # カードアート・音声・フォントなど
│  └─ src/
│     ├─ shared/              # サーバーと共有するルール・カード・BOT・通信型
│     ├─ game/                # ゲーム進行とUI・通信の仲介
│     ├─ net/                 # API・WebSocket・対戦再接続
│     ├─ screens/             # HOME・デッキ・カード・対戦・ショップなど
│     ├─ ui/                  # 盤面・3D描画・アニメーション・共通UI
│     ├─ styles/              # スタイル・共通トークン
│     └─ dev/                 # ローカル開発・比較試作
├─ server/
│  ├─ src/
│  │  ├─ production.ts        # 本番用エントリーポイント・DOクラスの公開
│  │  ├─ index.ts             # API・WebSocket・静的アセットのルーティング
│  │  ├─ auth.ts / oauth.ts   # セッション認証・Google OAuth
│  │  ├─ matchmaker.ts        # マッチング用Durable Object
│  │  └─ gameRoom.ts          # 対戦用Durable Object・権威ゲーム進行
│  ├─ schema.sql             # 新規DB用スキーマ
│  ├─ migrations/            # 既存DBへの変更SQL
│  └─ wrangler.toml          # 本番・ステージングの設定
├─ scripts/                  # ビルド・配信ガード・アート処理・検証
├─ tests/                    # ルール・サーバー・UIの検証とブラウザ検証
├─ docs/                     # 世界観・デザイン方針・調査・リリース記録
└─ ml/                       # BOT学習・評価
```

ゲームコアは`client/src/shared/`をサーバーからも参照します。オンライン戦とログイン済みのBOT戦はサーバー側で進行し、ローカルゲストのBOT戦はクライアントで実行します。[protocol.ts](client/src/shared/protocol.ts)の`redactFor`が、配信する状態から相手の手札・山札の内容や乱数状態などを隠します。

フロントのビルド成果物`client/dist`はWorkers Static Assetsから配信します。フロント・`/api`・`/ws`は同一オリジンで動作し、Pagesへの別デプロイは不要です。

## ローカル開発

Node.js **22.12.0以上**とnpmを使用します。以下はリポジトリのルートで実行してください。

```bash
npm ci
npm run dev
```

[localhost:5173](http://localhost:5173)を開き、ログイン画面の「게스트로 입장」からローカルゲストで入れます。サーバーなしでBOT戦やUIを確認できます。ゲストボタンは`localhost`・`127.0.0.1`・`::1`に限定され、ゲストの設定はブラウザのローカルストレージに保存されます。

### ログイン・オンライン対戦も確認する場合

初回は静的アセットをビルドし、ローカルD1を初期化します。

```bash
npm run build
npm --workspace server run db:init
```

別ターミナルでサーバーを起動します。フロントの`npm run dev`も起動しておきます。

```bash
npm run server:dev
```

Viteが`/api`と`/ws`を`127.0.0.1:8787`へプロキシします。ローカル確認のためにリモートD1を新規作成する必要はありません。既存ローカルDBの更新には、適用状況に応じた`server/migrations/`のSQLを使います。`schema.sql`の再実行だけでは既存テーブルの列追加は行われません。

### 認証・外部サービスの設定

ローカルの秘密情報はGit管理対象外の`server/.dev.vars`に置きます。設定名は[env.ts](server/src/env.ts)、公開設定は[wrangler.toml](server/wrangler.toml)を参照してください。

| 設定名 | 用途 |
| --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth。利用するオリジンの`/api/auth/google/callback`をGoogle側に登録 |
| `RESEND_API_KEY` | Resendによるメール認証・パスワード再設定メールの送信 |
| `APP_ORIGIN` | APIのCORS設定 |
| `ADMIN_EMAILS` | 管理画面へのアクセスを許可するメールアドレス |

`RESEND_API_KEY`未設定時は登録時のメール認証を省略し、メールを送信しません。Google OAuthやメールの疎通確認には、それぞれの外部サービス設定が必要です。

## 検証コマンド

リポジトリのルートで実行します。

| コマンド | 内容 |
| --- | --- |
| `npm run typecheck` | クライアント・サーバー両方の型検査 |
| `npm run build` | デザインガード・クライアント型検査・Viteビルド |
| `npm run test:production` | `tests/production-suite.json`の`current`に登録された検証を実行 |
| `npm run text:check` | カードテキストの整合性検査 |
| `npm run art:check` | カードアートの検査 |
| `npm run art:thumbs` | カード画像のサムネイル生成 |

`test:production`はローカルで検証スクリプトを実行するコマンドです。`*-browser.mjs`のブラウザ検証は別途実行し、Chrome・Playwrightなど各スクリプトの実行環境を用意します。実アカウントでの対戦、端末上の描画性能、演出の見た目は、それぞれ確認結果を記録してください。

## デプロイ

[deploy-guard.mjs](scripts/deploy-guard.mjs)を通して、フロントとサーバーを同じコミットから配信します。Cloudflareへの認証・対象環境のバインディング・秘密情報が設定済みであることが前提です。

1. 変更をコミットし、GitHubの`main`へ反映します。
2. 最新の`gh/main`と同じHEADで、追跡ファイルに未コミット変更のないチェックアウトを用意します。ローカル`main`のコミットもすべて含まれている必要があります。
3. 対象環境のコマンドをリポジトリのルートで実行します。

```bash
# ステージング: test.yourlore.xyz
npm run deploy:staging

# 本番: yourlore.xyz（本番リリース時に実行）
npm run deploy
```

ガードは環境ごとの共有ロックを取得し、`gh/main`・配信中のソースとバージョンを確認します。コミット済みスナップショットで`npm ci`・型検査・検証スイート・ビルドを実行し、配信直前に再確認してからデプロイします。直接の`wrangler deploy`やPagesへの配信でガードを迂回しないでください。

本番とステージングはWorker・Durable Objects・D1を分離しています。DBの変更は対象環境と適用済みSQLを確認して別途適用し、秘密情報も環境ごとに設定します。デプロイコマンドはDBスキーマを更新しません。設定の起点は[server/wrangler.toml](server/wrangler.toml)です。

## 開発時に読むドキュメント

- [AGENTS.md](AGENTS.md): 作業時の共通指示
- [世界観の正本](docs/world-bible.md): カード・画面・用語の世界観
- [標準UI](docs/default-ui-design.md)・[メニュー設計](docs/menu-design-insights.md): 対戦画面外を含む共通UIの方針
- [アニメーション品質基準](docs/animation-quality-benchmark.md)・[VFXアート方針](docs/vfx-art-direction.md): 制作前に読む最低品質と表現の指定
- [カードアート方針](docs/card-art-direction.md)・[制作パイプライン](docs/card-art-pipeline.md): 画像制作と取り込み
- [カードテキスト表記](docs/card-text-style.md): 効果説明・用語の統一
- [収益・報酬設計](docs/monetization.md): 通貨・ショップ・報酬の設計
- [BOT学習・評価](ml/README.md): 学習とシミュレーション

リリース・監査・試作の記録は`docs/releases/`・`docs/qa/`・`docs/vfx-prototypes/`などにあります。記録には当時の実装や未採用案も含まれるため、現在のコードと各記録の確認範囲を併せて参照してください。
