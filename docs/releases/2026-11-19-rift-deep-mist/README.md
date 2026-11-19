# リフト ②「深層の霧」

2026-11-19、ユーザー指定「②のアニメーションをもっと大胆にして、そして本番にあげて」に対応。

## 変更

`client/src/ui/riftIdleMaterial.ts` の常時表面だけを②へ更新。大きなうねりを持つ前景の霧、逆向きに流れる奥の層、左右に動く暗い裂け目を同じ流れ場で合成。前の試作より流速・うねり幅・明暗差を強めた。柔らかな濃淡を維持し、粒・硬い輪郭・独立した環は加えない。

金属枠・開口形状・リフトの位置・カウント・カードの除外／到着は既存実装を継続。GPU材質1個を両側で共有し、既存30 Hz更新・非表示時停止・低減モーション時静止・資源解放を維持。テクスチャ追加なし。通常バンドルに3案切替・開発UIは含まれない。

## 参照・起動元

- 実装基準と確認時の本番: `9dcf3ec09cfe3b5f09542618134222854c6b1a3b`。
- 採用前の表面: `client/src/ui/riftIdleMaterial.ts`「shadow veil」。配置は `riftAperture.ts`、`riftGeometry.ts`、`readingBoardWidgets.ts`。
- 試作: `/Users/hiromaru05s/.codex/worktrees/rift-surface-three-1119/LORE_TCG/client`、`http://127.0.0.1:5194/rift-surface-three.html?look=2`。
- 本番コードの検証: 同じ起動元、ポート5195、`vite.rift-production.config.ts`。試作用のマテリアル差し替えを無効化し、実際の `riftAperture.ts` → `riftIdleMaterial.ts` を使用。
- 盤面・静的素材は基準コミットから抽出。別の未採用UIや旧チェックアウトの素材に差し替えていない。

## 検証

- 機能: client型検査、rift-frame-highlight / rift-fold / rift-transmute 合格。
- ブラウザ: 本番用シェーダーのコンパイル、PC・スマホの時間更新、両陣営、モーション低減による時刻0への遷移と静止、通常への復帰、ページエラーなし。
- 見た目: 実盤面の通常速度録画と途中フレームで、霧の流れ・奥行き・暗い中央・金属枠の遮蔽・カウントの読みやすさを確認。形の連続性と明暗の層を、最低品質基準「銀紋の流墨」から今回の待機表面へ適用。機能テストの成功を視覚的承認の代わりにはしない。
- ブラウザの盤面はローカル状態fixture。実アカウントでのオンライン対戦はこの検証に含まない。
- 詳細: `verification.json`。通常速度録画は作業フォルダ `output/rift-surface-three/bolder/video/`。

公開結果は反映後に追記する。
