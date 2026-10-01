export const catalog = [
  {
    "id": "S07",
    "name": "ミミック／ダンジョン",
    "cardIds": [
      "MIMIC",
      "MIMIC2",
      "MIMIC_LORD",
      "AWAKENED_MIMIC",
      "MIMIC_KING",
      "MIMIC_KING2",
      "ORIGIN_MIMIC",
      "DUNGEON",
      "DUNGEON_FLOOR",
      "GEM_RAIN",
      "GREED_PRICE",
      "MIMIC_HIDEOUT",
      "MIMIC_HUNTER",
      "QUICK_MIMIC",
      "QUICK_SURVIVAL"
    ],
    "animation": "通常・マスター・リーダー・覚醒・キング・2世・始原の登場差分／群体召喚／隠れ家展開／ダンジョン召喚",
    "owner": "D",
    "ideaSeeds": [
      "箱の継ぎ目から牙と内部光",
      "宝の光が異形の口へ裏返る"
    ]
  },
  {
    "id": "S15",
    "name": "カル／リフト／虚無",
    "cardIds": [
      "STARTER_TRASH",
      "CULL_FLOOD",
      "PAIN_HARVEST",
      "CULL_FARM",
      "PURGE_ALL",
      "EXILE_NUKE1",
      "EXILE_NUKE2",
      "FURNACE",
      "PURGE_TOUCH",
      "SCRAPPER",
      "CROSSROADS",
      "TRIAL_AREA",
      "VOID_FRUIT",
      "VOID_APOSTLE",
      "REFRESH_HAND",
      "FOCUS",
      "RIFT",
      "FREE_REWARD",
      "ORIGIN_QUEST",
      "VOID_RITE",
      "Q_RIFT"
    ],
    "animation": "カル除外／リフトへの吸収・追加生成／虚空砲撃・大崩壊／虚無の使徒召喚／次元術式",
    "owner": "D",
    "ideaSeeds": [
      "刻印を伴う流墨の連続変形",
      "カードの層が次元の折り目へ収束"
    ]
  },
  {
    "id": "S23",
    "name": "腐敗／毒／酸",
    "cardIds": [
      "RUST_SHROOM",
      "RUST_SLUG",
      "POISON_MASTER",
      "DECAY_CRAFT",
      "ACID_RAIN",
      "STRONG_ACID",
      "ROTTEN_GROUND",
      "QUICK_POISON",
      "Q_DECAY"
    ],
    "animation": "マッシュルーム・スラッグ・ポイズンマスター召喚／暗器製造／酸性雨・強酸性雨・腐敗した土地の展開",
    "owner": "D",
    "ideaSeeds": [
      "腐食がカード面を侵食して崩す",
      "粘性の毒膜と菌糸が段階的に広がる"
    ]
  },
  {
    "id": "S24",
    "name": "ギャンブル／カジノ",
    "cardIds": [
      "GAMBLER",
      "LEGEND_GAMBLER",
      "CASINO",
      "GAMBLE",
      "ND3",
      "FATE_WHEEL",
      "LUCKY_ECHO",
      "NO_PAIN",
      "Q_CHEAT"
    ],
    "animation": "ギャンブラー・伝説・カジノの登場／通常ダイス・予測・合計判定・カジノダイス・振り直し",
    "owner": "D",
    "ideaSeeds": [
      "刻印された賽が物理的に跳ねる",
      "出目の光が賭けの条件と報酬へ流れる"
    ]
  },
  {
    "id": "S25",
    "name": "宝箱",
    "cardIds": [
      "STARTER_CHEST",
      "LUCKY_CHEST",
      "GUILD_CHEST"
    ],
    "animation": "通常・幸運・アサシンギルドの宝箱開封／当たり／外れ／敵側への召喚",
    "owner": "D",
    "ideaSeeds": [
      "錠前と蓋を中心に宝光が漏れる",
      "封印の層がほどけて中身が現れる"
    ]
  },
  {
    "id": "A004",
    "name": "クイック魔法の購入即発動",
    "stages": "市場から購入→その場で発動→効果終了後に除外",
    "cardIds": [],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "共通プレイ・召喚・退場"
  },
  {
    "id": "A011",
    "name": "敵側への召喚",
    "stages": "宝箱の外れから相手の場へ出現",
    "cardIds": [
      "MIMIC",
      "GUILD_CHEST"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "共通プレイ・召喚・退場"
  },
  {
    "id": "A014",
    "name": "虚無・生成トークンの破壊退場",
    "stages": "破壊→墓地に入らずリフトへ",
    "cardIds": [
      "MIMIC",
      "SOLDIER2",
      "TOKEN00"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "共通プレイ・召喚・退場"
  },
  {
    "id": "A017",
    "name": "カード除外",
    "stages": "手札・デッキ・墓地・場からリフトへ",
    "cardIds": [
      "STARTER_TRASH",
      "FOCUS",
      "PURGE_TOUCH",
      "Q_ASSASSIN"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "共通プレイ・召喚・退場"
  },
  {
    "id": "A018",
    "name": "リフトへ新規カードを直接生成",
    "stages": "既存カードの除外と区別して生成→追加",
    "cardIds": [
      "QUICK_MIMIC",
      "Q_RIFT",
      "GREED_PRICE"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "共通プレイ・召喚・退場"
  },
  {
    "id": "A019",
    "name": "リフトから墓地への帰還",
    "stages": "対象カードがリフトから戻る",
    "cardIds": [
      "D_BLACK",
      "CHOSEN_MAGE"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "共通プレイ・召喚・退場"
  },
  {
    "id": "A020",
    "name": "相手リフトから自分リフトへの移送",
    "stages": "所有者の違うゾーン間の移動",
    "cardIds": [
      "GM6_1"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "共通プレイ・召喚・退場"
  },
  {
    "id": "A039",
    "name": "腐敗能力の付与",
    "stages": "自分のモンスターに「腐敗」の攻撃能力を付ける",
    "cardIds": [
      "DECAY_CRAFT"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "能力・状態・カウンター"
  },
  {
    "id": "A040",
    "name": "腐敗カウンターの付与／蓄積",
    "stages": "敵へ1個・2個追加→1段階・2段階の状態表示",
    "cardIds": [
      "QUICK_POISON",
      "RUST_SLUG",
      "POISON_MASTER"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "能力・状態・カウンター"
  },
  {
    "id": "A041",
    "name": "腐敗崩壊",
    "stages": "3個到達→対象破壊→持ち主に3ダメージ",
    "cardIds": [
      "RUST_SHROOM",
      "POISON_MASTER"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "能力・状態・カウンター"
  },
  {
    "id": "A042",
    "name": "腐敗撃破の連動報酬",
    "stages": "腐敗崩壊→マナ・回復・烙印・追加ダメージ",
    "cardIds": [
      "RUST_SHROOM",
      "RUST_SLUG",
      "ACID_RAIN",
      "STRONG_ACID"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "能力・状態・カウンター"
  },
  {
    "id": "A051",
    "name": "虚無",
    "stages": "能力付与→保持表示→破壊時除外",
    "cardIds": [
      "VOID_RITE",
      "QUICK_REBIRTH"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "能力・状態・カウンター"
  },
  {
    "id": "A052",
    "name": "神器",
    "stages": "除外効果から保護される短い反応",
    "cardIds": [
      "STARTER_MANA"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "能力・状態・カウンター"
  },
  {
    "id": "A058",
    "name": "宝箱の使用封鎖",
    "stages": "マスターミミック登場→宝箱使用不可→封鎖解除",
    "cardIds": [
      "MIMIC2"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "能力・状態・カウンター"
  },
  {
    "id": "A080",
    "name": "魔法ダメージをカルへ変換",
    "stages": "無効化→同数のカル生成→リフトへ",
    "cardIds": [
      "BLACK_INFINITY"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "数値変化・制限・変換"
  },
  {
    "id": "A117",
    "name": "ミミックの増殖",
    "stages": "覚醒／宝箱／パーティー／最下層等から複数生成",
    "cardIds": [
      "AWAKENED_MIMIC",
      "QUICK_MIMIC",
      "DUNGEON_FLOOR"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "シリーズ固有の効果・大型召喚"
  },
  {
    "id": "A118",
    "name": "ミミックキングの条件召喚",
    "stages": "リフト枚数による強化→マスターミミック",
    "cardIds": [
      "MIMIC_KING"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "シリーズ固有の効果・大型召喚"
  },
  {
    "id": "A119",
    "name": "ミミックキング2世の展開",
    "stages": "条件成立→隠れ家を魔法ゾーンへ",
    "cardIds": [
      "MIMIC_KING2"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "シリーズ固有の効果・大型召喚"
  },
  {
    "id": "A120",
    "name": "ミミックの隠れ家の追加召喚",
    "stages": "自分ターン終了→マスターミミック召喚",
    "cardIds": [
      "MIMIC_HIDEOUT"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "シリーズ固有の効果・大型召喚"
  },
  {
    "id": "A121",
    "name": "ミミックハンターの掃討",
    "stages": "ターン終了→両者の通常ミミックを破壊",
    "cardIds": [
      "MIMIC_HUNTER"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "シリーズ固有の効果・大型召喚"
  },
  {
    "id": "A135",
    "name": "選別者の連続除外",
    "stages": "カル3枚除外→追加除外の連鎖",
    "cardIds": [
      "SORTER"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "シリーズ固有の効果・大型召喚"
  },
  {
    "id": "A144",
    "name": "手札を捨てる・超過整理",
    "stages": "指定カード／余剰カード→墓地",
    "cardIds": [
      "AMA",
      "HANDRESET"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "手札・市場・ダイス・継続効果"
  },
  {
    "id": "A145",
    "name": "墓地のデッキ再構築",
    "stages": "墓地をまとめる→シャッフル→デッキへ",
    "cardIds": [],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "手札・市場・ダイス・継続効果"
  },
  {
    "id": "A152",
    "name": "宝箱の開封結果",
    "stages": "ダイス→報酬の種類→入手・外れ召喚",
    "cardIds": [
      "STARTER_CHEST",
      "LUCKY_CHEST",
      "GUILD_CHEST"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "手札・市場・ダイス・継続効果"
  },
  {
    "id": "A153",
    "name": "通常ダイス",
    "stages": "1個／複数個／合計／成功・失敗／結果表",
    "cardIds": [
      "GAMBLER",
      "GAMBLE",
      "S1"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "手札・市場・ダイス・継続効果"
  },
  {
    "id": "A154",
    "name": "予測ダイス",
    "stages": "予測を示す→出目→的中・不的中→報酬選択",
    "cardIds": [
      "ND3",
      "LEGEND_GAMBLER"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "手札・市場・ダイス・継続効果"
  },
  {
    "id": "A155",
    "name": "カジノダイス",
    "stages": "12カウンター到達→専用ロール→結果",
    "cardIds": [
      "CASINO"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "手札・市場・ダイス・継続効果"
  },
  {
    "id": "A156",
    "name": "運命の輪の振り直し",
    "stages": "前結果を巻き戻す→再ロール→確定",
    "cardIds": [
      "FATE_WHEEL"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "手札・市場・ダイス・継続効果"
  },
  {
    "id": "A157",
    "name": "ダイス結果への連動",
    "stages": "6の出目→追加ダメージ／クエスト進行",
    "cardIds": [
      "LUCKY_ECHO",
      "Q_CHEAT"
    ],
    "owner": "D",
    "scope": "two-variant-preview",
    "category": "手札・市場・ダイス・継続効果"
  }
];
