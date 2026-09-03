// Flavor-name pass for cards whose original names read like effect labels or
// generated templates. IDs and effects remain unchanged.
export const FLAVOR_CARD_NAMES = {
    // Core spells
    S1: { ko: "삼격의 불씨", ja: "三撃の火種", en: "Spark of the Third Strike" },
    S10: { ko: "청람 서고", ja: "青藍の書庫", en: "Cobalt Archive" },
    S3: { ko: "칼날의 속삭임", ja: "刃の囁き", en: "Whisper to the Blade" },
    S4: { ko: "쌍월의 계시", ja: "双月の啓示", en: "Twin-Moon Revelation" },
    S6: { ko: "운명의 실", ja: "運命の糸", en: "Thread of Fate" },
    S7: { ko: "전장의 맥동", ja: "戦場の脈動", en: "Pulse of the Battlefield" },
    S11: { ko: "잿빛 혜성", ja: "灰色彗星", en: "Ashen Comet" },
    S12: { ko: "강철맥 각인", ja: "鋼脈刻印", en: "Steelvein Inscription" },
    S13: { ko: "별무덤 낙하", ja: "星墓の落下", en: "Fall of the Star-Tomb" },
    SX2: { ko: "봉인의 실밥", ja: "封印の綻び", en: "Loose Thread of the Seal" },
    SX4: { ko: "두 번째 열쇠", ja: "第二の鍵", en: "The Second Key" },
    SX6: { ko: "매복망 대붕락", ja: "伏兵網大崩落", en: "Grand Collapse of the Ambush Web" },
    HANDRESET: { ko: "망각의 새 패", ja: "忘却の新札", en: "New Hand of Oblivion" },
    GAMBLE: { ko: "육면의 변덕", ja: "六面の気まぐれ", en: "Six-Faced Whim" },
    FLAME: { ko: "불씨의 채무", ja: "火種の負債", en: "Ember Debt" },
    NEGOTIATE: { ko: "검은 봉인의 거래", ja: "黒封印の取引", en: "Bargain of the Black Seal" },
    DISARM1: { ko: "첫 나사 뽑기", ja: "最初の螺子抜き", en: "The First Loose Screw" },
    DISARM2: { ko: "청동 해부도", ja: "青銅解剖図", en: "Brass Dissection" },
    // Core traps
    T1: { ko: "어튠 무효 장치", ja: "アチューン無効装置", en: "Attune Jammer" },
    T8: { ko: "독가시 마름쇠", ja: "どくびし", en: "Caltrops" },
    T2: { ko: "중급 마력 차단", ja: "中級魔力遮断", en: "Mana Block II" },
    T3: { ko: "함정 구덩이", ja: "落とし穴", en: "Pitfall" },
    T6: { ko: "심리전", ja: "心理戦", en: "Mind Game" },
    T9: { ko: "가시 방패", ja: "トゲトゲ盾", en: "Spiky Shield" },
    T4: { ko: "매직 카운터", ja: "マジックカウンター", en: "Magic Counter" },
    T11: { ko: "약탈", ja: "略奪", en: "Plunder" },
    T12: { ko: "성벽 강화", ja: "城壁強化", en: "Rampart Reinforcement" },
    T10: { ko: "포식 함정", ja: "捕食", en: "Devour" },
    T13: { ko: "낙뢰", ja: "落雷", en: "Lightning Strike" },
    // Generated spell/trap series: replace template names with one-off titles.
    GS5_0: { ko: "빙점의 역화", ja: "氷点の逆火", en: "Flashfire at Freezing Point" },
    GS5_1: { ko: "폭풍눈의 동결", ja: "嵐眼の凍結", en: "Eye of the Frozen Storm" },
    GS5_2: { ko: "황금맥의 생명등", ja: "黄金脈の生命灯", en: "Lifewick of the Golden Vein" },
    GS5_3: { ko: "저주문서 독해", ja: "呪文書の解読", en: "Reading the Cursed Codex" },
    GS5_4: { ko: "성검의 한 획", ja: "聖剣の一閃", en: "Stroke of the Hallowed Blade" },
    GT5_0: { ko: "대역", ja: "身代わり", en: "Decoy" },
    GT5_1: { ko: "용암 함정", ja: "溶岩の落とし穴", en: "Lava Pitfall" },
    GT5_4: { ko: "식탐", ja: "食い意地", en: "Gluttony" },
    GS6_0: { ko: "균열심장 폭발", ja: "亀裂心臓の爆発", en: "Riftheart Detonation" },
    GS6_1: { ko: "고대빙고의 개방", ja: "古代氷庫の開放", en: "Opening the Elder Ice Vault" },
    GS6_2: { ko: "심연샘의 맥동", ja: "深淵泉の脈動", en: "Pulse of the Abyssal Well" },
    GS6_3: { ko: "철서고의 계시", ja: "鉄書庫の啓示", en: "Revelation of the Iron Archive" },
    GS6_4: { ko: "화맥 점화", ja: "火脈点火", en: "Ignition of the Firevein" },
    GS6_5: { ko: "백상 행군령", ja: "白霜進軍令", en: "Whitefrost Marching Order" },
    GT6_1: { ko: "통행세", ja: "通行税", en: "Toll Gate" },
    GT6_4: { ko: "무영의 아귀", ja: "無影の顎", en: "Maw Without Shadow" },
    GS7_0: { ko: "태양창 파열", ja: "太陽槍破裂", en: "Sunlance Rupture" },
    GS7_1: { ko: "태초빙핵의 개안", ja: "太初氷核の開眼", en: "Awakening of the First Ice" },
    GS7_2: { ko: "무한생명륜", ja: "無限生命輪", en: "Wheel of Endless Life" },
    GS7_3: { ko: "공허서고 개문", ja: "虚空書庫開門", en: "Opening the Void Archive" },
    GS7_4: { ko: "붕괴선 각인", ja: "崩壊線刻印", en: "Engraving the Faultline" },
    GS7_5: { ko: "선조군단의 기상", ja: "祖霊軍団の蜂起", en: "Rising of the Ancestor Host" },
    GS8_0: { ko: "은월포", ja: "銀月砲", en: "Silvermoon Cannon" },
    GS8_1: { ko: "종말빙옥", ja: "終末氷獄", en: "Rime Prison of the End" },
    GS8_2: { ko: "여명성배의 범람", ja: "黎明聖杯の氾濫", en: "Overflow of the Dawn Grail" },
    GS8_3: { ko: "칠흑재판록", ja: "漆黒裁判録", en: "Black Ledger of Judgment" },
    GS8_4: { ko: "광휘검진", ja: "光輝剣陣", en: "Radiant Blade Array" },
    GS8_5: { ko: "태초군문 개방", ja: "太初軍門開放", en: "Opening the First War-Gate" },
    GT8_0: { ko: "무한성벽의 맹세", ja: "無限城壁の誓い", en: "Oath of the Endless Rampart" },
    GS9_0: { ko: "성창낙일", ja: "聖槍落日", en: "Hallowed Spearfall" },
    GS9_1: { ko: "그림자빙하 매장", ja: "影氷河の埋葬", en: "Burial Beneath the Shadow Glacier" },
    GS9_2: { ko: "용암성배의 세례", ja: "溶岩聖杯の洗礼", en: "Baptism of the Magma Grail" },
    GS9_3: { ko: "천공기록 강림", ja: "天空記録の降臨", en: "Descent of the Sky Archive" },
    GT9_2: { ko: "복수", ja: "復讐", en: "Vengeance" },
    GS10_0: { ko: "무한성의 포효", ja: "無限星の咆哮", en: "Roar of the Infinite Star" },
    GS10_1: { ko: "공허빙점 침식", ja: "虚空氷点の侵蝕", en: "Voidfrost Encroachment" },
    GS10_2: { ko: "붕괴성배의 기적", ja: "崩壊聖杯の奇跡", en: "Miracle of the Broken Grail" },
    GS10_3: { ko: "고대왕립서고", ja: "古代王立書庫", en: "The Elder Royal Archive" },
    GT10_0: { ko: "반격 명령", ja: "反撃命令", en: "Counterattack Order" },
    GT10_2: { ko: "업화경의 복제", ja: "業火鏡の複製", en: "Reflection of the Hellfire Mirror" },
    GT10_3: { ko: "동결처형대", ja: "凍結処刑台", en: "Frozen Execution Scaffold" },
    GS11_0: { ko: "성좌소각", ja: "星座焼却", en: "Constellation Pyre" },
    GS11_1: { ko: "무영빙하 낙하", ja: "無影氷河落下", en: "Fall of the Lightless Glacier" },
    GT11_0: { ko: "정보상", ja: "情報屋", en: "The Informant" },
    GT11_1: { ko: "폐문", ja: "閉門", en: "Gate Shut" },
    GT12_0: { ko: "최후의 보루", ja: "最後の砦", en: "The Last Bastion" },
};
export function applyFlavorCardNames(pools) {
    for (const pool of pools) {
        for (const [id, names] of Object.entries(FLAVOR_CARD_NAMES)) {
            const card = pool[id];
            if (!card)
                continue;
            card.name = names.ko;
            card.nameJa = names.ja;
            card.nameEn = names.en;
        }
    }
}
