# 効果音 v5 ステージング反映

- URL: https://test.yourlore.xyz
- Worker: lore-server-staging
- Version: 5dbe752d-556e-4174-85af-f6d7228d44ce
- 配信元commit: 0b06fea0（mainに統合済み）
- 最新盤面修正 792bbf27 / e1b59577 を包含。
- 本番公開は実施していない。

## 確認済み

- 統合後の typecheck / build / audio-v3 ライフサイクルテスト。
- ローカル実Controller: 攻撃→命中、直接攻撃→facehit、召喚着地同期、支払い→Buy、無料Buy、スキップ時の消音。
- 公開HTML・JS・CSS、manifest、全41音源のSHA-256がローカルbuildと一致。うちHOME・Draw③・Buyの9ファイルを維持。
- 公開全41音源がChromeでステレオPCMへデコードでき、無音でないことを確認。
- 公開アプリの自然なBOT戦操作で、実AudioContextがrunningの状態でドロー・召喚・攻撃・facehit等の再生開始を確認。音源はデコードPCMのfingerprintで識別。
- Draw①②へのリクエストなし、Draw③を使用。直接攻撃の接触音はfacehit一回。
- ページエラーなし。

確認したキュー: click, coinToss, coinLand, turn, draw, summon, attack, facehit

## 検証の境界

アカウントAPIはfixture。公開フロントエンドとローカルBOTの自然な操作を検証したもので、認証付きオンライン対人戦や人間の聴感評価ではない。

証跡: deploy.log / assets.json / audio-browser.json / browser.json / battle.png。
