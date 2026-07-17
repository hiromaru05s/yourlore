# LORE — デッキビルド × TCG

スパゲティだった単一HTMLを、**サーバー連携前提のモジュール構成**に作り直しました。フロント（Vite + TypeScript）と、Cloudflare上の権威サーバー（Workers + Durable Objects + D1）に分離し、**ゲームロジックは両者で完全共有**しています。

---

## 何が変わったか

旧 `reliquary-prototype.html`（1ファイル1595行・ロジック/UI/Bot/アニメ/カードDB/画像が全部混在）→ 関心ごとに分離：

```
LORE_TCG/
├─ client/                      # フロント（Cloudflare Pages にデプロイ）
│  ├─ index.html
│  └─ src/
│     ├─ shared/                # ★サーバーと共有するゲームコア（DOM非依存・決定論的）
│     │  ├─ types.ts            #   状態・アクション・イベントの型
│     │  ├─ cards.ts            #   全カードDB（単一の真実）
│     │  ├─ engine.ts           #   reduce(state, action) → {state, events}（純粋関数）
│     │  ├─ bot.ts              #   Bot AI（botDecide(state) → Action）
│     │  └─ protocol.ts         #   通信メッセージ型 + redactFor（秘匿情報の隠蔽）
│     ├─ ui/                    # 描画・アニメ・モーダル・ログ（状態は触らない）
│     ├─ game/                  # controller（engine↔UI↔Bot/通信の仲介）
│     ├─ net/                   # api（認証）/ socket（WebSocket）
│     ├─ screens/               # login / home / lobby / game
│     ├─ styles/                # tokens / base / card / game / screens
│     ├─ router.ts              # 画面遷移 + セッション
│     └─ main.ts
├─ server/                      # 権威サーバー（Cloudflare Workers）
│  ├─ wrangler.toml
│  ├─ schema.sql                # D1: users / sessions / matches
│  └─ src/
│     ├─ index.ts               # ルーティング（/api/* と /ws/*）
│     ├─ auth.ts                # Email+パスワード認証（PBKDF2 + セッションCookie）
│     ├─ matchmaker.ts          # Matchmaker Durable Object（マッチング待機列）
│     └─ gameRoom.ts            # GameRoom Durable Object（権威ゲーム・共有engineを実行）
└─ legacy/                      # 旧プロトタイプと仕様書（参照用に保管）
```

設計の要点は **`shared/engine.ts` が純粋・決定論的（seedベースPRNG）** であること。同じコードをクライアント（Bot戦をローカル実行）とサーバー（オンライン戦を権威実行）の両方が使うため、**ロジックの二重実装が発生しません**。カードの隠匿情報（相手の手札・山札・伏せ罠）は `redactFor` でサーバー側が削ってから配信するので、クライアントに覗かれません＝ブラフ（読み合い）が成立します。

実装した要望：

- **HOME画面 + ログイン**（Emailのみで登録 / パスワード設定可）— `screens/login.ts`, `server/src/auth.ts`
- **ログイン後HOME → ランダムオンライン対戦 / BOT対戦** — `screens/home.ts`, `lobby.ts`
- **リッチなデザイン**（参照画像準拠）+ **全カードサイズの一貫化** — `styles/tokens.css` の `--card-w/--card-h` を全ゾーン（モンスター/魔法罠/マーケット/手札/デッキ/捨て札）が共有
- **ログUI下部にサレンダーボタン**（押すと「정말 기권하시겠습니까? YES/NO」ポップアップ）— `boardView.ts` の `#surrenderBtn` → `confirmDialog`

> 検証：Bot対Botの自動対戦200試合を実行し、全試合が例外・無限ループなく勝者決定まで完走（平均27ターン、先攻 107勝 / 後攻 93勝）。

---

## 技術スタックの推奨（ご質問への回答）

以前の **Clerk + Convex + Cloudflare Pages** から、**Cloudflare一本化**に寄せるのを推奨します。

| 役割 | 旧 | 新（推奨） | 理由 |
|---|---|---|---|
| ホスティング | CF Pages | **CF Pages** | 据え置き。無料・高速 |
| 認証 | Clerk | **自前（D1 + PBKDF2 + Cookie）** or Better Auth | 「Emailのみ」要件はごく薄い実装で足り、外部依存と無料枠の制約が消える |
| DB | Convex | **Cloudflare D1**（SQLite） | users/戦績の保存に十分。同一プラットフォーム |
| リアルタイム対戦 | Convex | **Durable Objects + WebSocket** | ★ここが最大の理由 |

**Durable Objects が決定打**です。カードゲームは「隠匿情報あり・1部屋に状態を集約・不正対策に権威サーバーが必須」という要件で、DO はまさにそれ用の部品（1ルーム = 1オブジェクト = 単一の状態 + WebSocket）。Convex のリアクティブDBでも作れますが、権威ロジックを別途持つ必要があり構成が増えます。DOなら **共有engineをそのままサーバーで走らせる**だけで、ロジックが1本化します。

すべて Cloudflare 無料枠（Pages 無制限・Workers 10万req/日・DO・D1）に収まり、プロバイダが1社になるぶん運用も単純です。認証だけは外部の **Better Auth**（Cloudflare対応・無料・OSS）に差し替える選択肢も残しています（現状は外部依存ゼロの自前実装）。

---

## ローカル実行

```bash
# 1) フロント
cd client && npm install && npm run dev          # http://localhost:5173

# 2) サーバー（別ターミナル）— オンライン対戦/認証を使う場合
cd server && npm install
npx wrangler d1 create lore-db                    # 出力の database_id を wrangler.toml に貼る
npm run db:init                                   # ローカルD1にスキーマ適用
npx wrangler secret put AUTH_SECRET               # 任意のランダム文字列
npm run dev                                       # http://127.0.0.1:8787（Viteが /api と /ws をプロキシ）
```

BOT対戦は**サーバー不要**（フロントだけで完結）。オンライン対戦・ログイン保存にはサーバーを起動してください。

## 無料デプロイ（Cloudflare）

```bash
# サーバー（Workers + DO + D1）
cd server
npx wrangler d1 create lore-db                    # database_id を wrangler.toml に反映
npm run db:init:remote                            # 本番D1にスキーマ
npx wrangler secret put AUTH_SECRET
npm run deploy                                    # Durable Objects 込みでデプロイ

# フロント（Pages）
cd ../client && npm run build
npx wrangler pages deploy dist --project-name lore-tcg
```

**本番の注意（Cookie）**：ログインCookieをWebSocketにも効かせるため、フロントとAPIを**同一ドメイン**に揃えてください（Pagesのカスタムドメイン配下にWorkerをルーティング、または Pages Functions 経由でWorkerへ）。ローカルではViteのプロキシで同一オリジンになるため、そのまま動きます。`server/src/auth.ts` の `APP_ORIGIN` は本番フロントのオリジンに設定します。

---

## 既知のTODO（プレイテスト後）

- 数値バランス（先攻有利・スノーボール・Warlord/Void Reaver/Mirror Thorn）
- Mana Golem のオーラ（最大mana+1）は旧仕様同様、現状テキストのみ（engine.ts に注記）
- カード中央の絵（現状は◆プレースホルダ）
- タッチ操作（右クリック拡大 → 長押し）
