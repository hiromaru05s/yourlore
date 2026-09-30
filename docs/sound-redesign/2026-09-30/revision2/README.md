# 0ダメージの接触音・魔法発動音の再修正

- 0ダメージ: 振り抜きのみ。facehit / impact は鳴らさない。
- 攻撃力があってもシールド全吸収、無効化、城の防御、HP1の気合でHPが減らない場合は同じ。
- 実ダメージ、卵の耐久消費、即時破壊が成立した場合は接触音を残す。反撃・貫通・別の効果ダメージは独立して再生。
- 攻撃結果に contactDamage、hitにamountの任意メタデータを追加。戦闘ルールや状態遷移を変更せず、表示と音へ結果を渡す。
- 魔法発動: lore-v6/play.mp3へ変更。紙フリップ＋高い単音を廃止し、約0.64秒の中域の立ち上がり・空気感・柔らかい余韻へ再制作。
- HOME・Draw③・Buyなど他の音源は変更しない。

生成: `python scripts/audio/build_spell_sfx_v6.py`。v5を再生成した場合も、このスクリプトを最後に実行すると採用manifestの魔法音がv6になる。

検証: rules.jsonは11ケースで旧エンジンとのゲーム状態一致を確認。audio-v3の音声ライフサイクル、expansion-v50の36シナリオ、型チェック、ビルド、実Controllerの0ダメージと正のダメージ再生を確認。聴感の採用判断と機能検証は別。

## ステージング検証完了

- 配信元: 0e82212e92b566858c16c2de983c02e3538eba1b。並行B/C修正54fdfc99を包含。
- Worker version: 7543a42d-8416-4138-a09f-ede0dc4b67c7。共有ガードで47/47回帰・型・buildを通過。
- `staging/assets.json`: 公開HTML/JS/CSS/manifest/全41音源のハッシュ一致。
- `staging/CASTLE/browser.json`: 公開BOTで城を手札から召喚し、攻0で直接攻撃。再生トレースはattackのみ、facehit/impact/damageなし。
- `staging/FLAME/browser.json`: 公開BOTで火花をドラッグしてプレイ。v6/play.mp3のPCM fingerprintが、runningのAudioContextで再生されたことを確認。
- APIアカウントはfixture。認証付きオンライン対人戦および人間の聴感評価とは別。
- `deploy.log`は統合前の先行配信。最終配信証跡は`guarded-deploy.log` / `release.json`。本番変更なし。
