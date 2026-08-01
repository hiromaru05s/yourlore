// ============================================================
// LORE — tutorial / how-to-play screen (bilingual KO/JA).
// Scrollable rule sections; reachable from HOME.
// ============================================================
import type { App, Screen } from "../router";
import { t, getLang, onLangChange } from "../i18n";
import { langSelectEl } from "../ui/langSelect";
import { TUT_STEPS } from "../game/tutorial";
import { api } from "../net/api";
import { PASSIVES } from "../shared/cards";

interface Section { icon: string; h: string; body: string[]; }

/** 패시브 키워드 섹션 — PASSIVES 사전에서 자동 생성 (카드에는 키워드명만 적힌다). */
function passiveSection(lang: "ko" | "ja" | "en"): Section {
  const h = lang === "ja" ? "パッシブキーワード" : lang === "en" ? "Passive Keywords" : "패시브 키워드";
  const intro = lang === "ja"
    ? "カードには<b>キーワード名だけ</b>が書かれています。カードを拡大(右クリック・長押し)すると右側に説明パネルが表示されます。"
    : lang === "en"
      ? "Cards show only the <b>keyword name</b>. Enlarge a card (right-click / long-press) to see the description panel beside it."
      : "카드에는 <b>키워드명만</b> 적혀 있습니다. 카드를 확대(우클릭·길게 누르기)하면 옆에 설명 패널이 표시돼요.";
  const body = [intro, ...Object.keys(PASSIVES).map((k) => {
    const loc = PASSIVES[k][lang];
    return `<b>${loc.name}</b> — ${loc.desc}`;
  })];
  return { icon: "✨", h, body };
}

const SECTIONS: { ko: Section[]; ja: Section[]; en: Section[] } = {
  ko: [
    { icon: "🎯", h: "게임 목표", body: [
      "상대의 <b>체력</b>을 0으로 만들면 승리합니다.",
      "선공은 체력 <b>35</b>, 후공은 <b>42</b>로 시작해요. (후공이 조금 높은 건 선공의 템포 이점을 보정하기 위함입니다.)",
      "선공/후공은 매 게임 <b>코인토스</b>로 공정하게 정해집니다.",
    ] },
    { icon: "🔄", h: "턴의 흐름", body: [
      "내 턴이 시작되면 ① <b>마나가 최대치까지 충전</b>되고 ② 카드를 <b>3장 드로우</b>합니다.",
      "그다음 마나가 닿는 한 자유롭게 행동합니다 — 몬스터 소환, 마법 시전, 함정 세트, 공격, 카드 구매.",
      "<b>턴 종료</b>를 누르면 손에 남은 카드는 버려지고(묘지로) 상대 턴으로 넘어갑니다.",
    ] },
    { icon: "💎", h: "마나", body: [
      "모든 행동의 자원입니다. 매 턴 <b>최대 마나만큼</b> 다시 채워집니다(시작 4).",
      "<b>어튠</b>이나 일부 카드로 최대 마나를 영구히 늘릴 수 있어요. 카드 구매·마법·소환에 모두 마나를 씁니다.",
    ] },
    { icon: "🃏", h: "카드 종류", body: [
      "<b>몬스터</b> — 공격력/체력을 가지며 필드에 소환. 소환 시 효과가 있는 경우도 많습니다.",
      "<b>마법</b> — 즉시 1회 효과(데미지, 회복, 드로우, 파괴 등).",
      "<b>함정</b> — 비공개로 세트해두고 특정 조건에서 자동 발동.",
      "<b>영구마법</b> — 필드에 일정 턴 동안 남아 지속 효과를 줍니다.",
      "<b>스타터</b> — 컬(폐기로 덱 압축), 보물상자(개봉), 어튠(최대 마나+1).",
    ] },
    { icon: "🛒", h: "마켓 & 덱 강화", body: [
      "상점에서 카드를 사 덱을 키웁니다. 산 카드는 <b>묘지</b>로 갔다가, 덱이 떨어지면 섞여 다시 들어옵니다.",
      "<b>고정 마켓</b>: 매 게임 고정된 랜덤 8장(코스트 1~6).",
      "<b>제시</b>: 매 턴 새로 제시되는 4장(코스트 1~현재 최대 마나). <b>1마나</b>로 새로 갱신할 수 있어요.",
    ] },
    { icon: "⚔️", h: "전투", body: [
      "몬스터로 상대를 공격합니다.",
      "상대 몬스터를 치면 <b>데미지가 체력에 누적</b>됩니다. 체력이 0이 되면 파괴되고, 막타의 초과분은 상대 플레이어에게 <b>관통</b> 데미지로 들어갑니다.",
      "받은 데미지는 <b>사라지지 않습니다</b> — 필드의 몬스터는 방패 자리에 <b>남은 체력</b>이 표시되고, 다친 상태면 <b>빨간 숫자</b>로 보여요. 필드를 떠났다 돌아오면 체력이 초기화됩니다.",
      "공격해도 <b>반격 데미지는 받지 않습니다</b>. 대신 상대의 <b>세트 함정</b>이 공격에 반응할 수 있으니 조심하세요.",
      "체력을 깎는 효과로 <b>최대 체력이 남은 체력 이하</b>가 되면 그 몬스터는 파괴됩니다.",
      "상대 필드가 비어 있으면 체력을 <b>직접</b> 때립니다.",
      "한 번 공격한 몬스터는 그 턴엔 다시 공격할 수 없어요(일부 카드는 2회 공격 가능).",
    ] },
    { icon: "🪤", h: "함정 & 반응", body: [
      "함정은 비공개로 깔아두고 상대의 <b>공격·소환·마법</b> 같은 행동에 반응해 자동으로 터집니다(발동 시 공개).",
      "공격 무효화, 반사, 몬스터 파괴, 드로우, 마법 무효화 등 종류가 다양합니다.",
    ] },
    { icon: "🧬", h: "종족 시너지", body: [
      "<b>고독·고귀·포식·귀족·시초</b> 5종족이 있습니다.",
      "<b>같은 종족</b>의 서로 <b>다른</b> 카드를 필드에 <b>2장·3장</b>(시초는 <b>4장</b>까지) 모으면 강력한 동족 시너지가 발동합니다(같은 카드 2장은 인정 X, 게임당 각 1회).",
      "<b>시초</b>는 1~8코스트 각 1종(총 8종, 8코 <b>시초의 미믹</b> 포함)으로 이뤄져 서로 다른 카드를 모으기 가장 좋습니다.",
      "카드를 확대하면(우클릭·길게 누르기) 종족 태그의 ⓘ에서 보너스 내용을 볼 수 있어요.",
    ] },
    { icon: "⭐", h: "특수 카드 & 필드", body: [
      "필드에는 <b>몬스터 7장</b>, <b>마법·함정 7장</b>까지 놓을 수 있습니다.",
      "<b>영구마법</b>은 필드에 남아 지속 효과를 주며, 일부 카드로 파괴하거나 게임에서 제외할 수 있어요.",
      "<b>소환 조건</b>이 있는 몬스터도 있습니다(예: 특정 카드가 필드·덱·묘지에 있어야 소환).",
      "<b>암살자</b>류처럼 상대 몬스터를 무시하고 <b>플레이어를 직접 공격</b>하는 카드도 있습니다.",
    ] },
    { icon: "🏷️", h: "효과 표기 규칙", body: [
      "효과 앞의 <b>【태그】</b>가 발동 조건입니다: <b>【소환시】</b> 소환한 순간 1회 / <b>【피격시】</b> 함정이 공격에 반응 / <b>【마법 반응】·【소환 반응】</b> 상대의 마법·소환에 반응 / <b>【상시】</b> 필드에 있는 동안 계속 / <b>【매턴】</b> 자신 턴 시작마다 / <b>【조건】</b> 소환 조건.",
      "<b>【영구】</b> 영구마법은 파괴되기 전까지 계속 유지됩니다. <b>【지속 N턴】</b>은 N턴 뒤 사라지며, 필드에 <b>남은 턴 배지 ⏳</b>가 표시됩니다.",
      "태그가 없는 마법 효과는 <b>시전 즉시</b> 발동합니다.",
      "<b>(양측)</b> 표기가 있는 파괴 효과는 <b>자신의 카드도 대상으로 선택</b>할 수 있습니다.",
    ] },
    { icon: "🎁", h: "보물상자", body: [
      "보물상자를 열면 <b>주사위 🎲</b>를 굴려 결과가 정해집니다:",
      "<b>1</b> 꽝(상대 필드에 미믹 3/2) / <b>2·3</b> 체력 +3 / <b>4·5</b> 최대 마나 +1 / <b>6</b> 최대 체력 +5.",
      "보물상자 카드를 확대하면 이 주사위 표가 옆에 표시됩니다. 다른 확률 효과도 전부 주사위 판정입니다.",
    ] },
    { icon: "🏆", h: "승리 & 조작", body: [
      "<b>1:1 대전</b>입니다. 상대의 <b>체력을 0</b>으로 만들면 그 즉시 승리해요.",
      "<b>60턴</b>이 끝날 때까지 승부가 나지 않으면 <b>남은 체력이 높은 쪽이 판정승</b>합니다. (동률이면 무승부)",
      "<b>카드 확대</b>: PC는 우클릭, 모바일은 길게 누르기.",
      "<b>기권</b>: 우측 로그 패널 맨 아래(모바일은 📜 버튼으로 로그 열기).",
      "상대 턴에는 상대의 마나가 실시간으로 표시됩니다.",
    ] },
  ],
  ja: [
    { icon: "🎯", h: "ゲームの目的", body: [
      "相手の<b>体力</b>を0にすれば勝利です。",
      "先攻は体力<b>35</b>、後攻は<b>42</b>でスタート。(後攻が少し高いのは先攻のテンポ有利を補正するためです。)",
      "先攻/後攻は毎ゲーム<b>コイントス</b>で公平に決まります。",
    ] },
    { icon: "🔄", h: "ターンの流れ", body: [
      "自分のターンになると ①<b>マナが最大まで回復</b>し ②カードを<b>3枚ドロー</b>します。",
      "その後はマナの続く限り自由に行動 — モンスター召喚、魔法発動、罠セット、攻撃、カード購入。",
      "<b>ターン終了</b>を押すと手札の残りは捨てられ(墓地へ)、相手のターンになります。",
    ] },
    { icon: "💎", h: "マナ", body: [
      "すべての行動の資源です。毎ターン<b>最大マナ分</b>まで回復します(初期4)。",
      "<b>アチューン</b>や一部のカードで最大マナを永続的に増やせます。購入・魔法・召喚すべてにマナを使います。",
    ] },
    { icon: "🃏", h: "カードの種類", body: [
      "<b>モンスター</b> — 攻撃力/体力を持ち場に召喚。召喚時効果を持つものも多いです。",
      "<b>魔法</b> — 即時1回の効果(ダメージ・回復・ドロー・破壊など)。",
      "<b>罠</b> — 非公開でセットし、特定の条件で自動発動。",
      "<b>永続魔法</b> — 場に一定ターン残り、継続効果を与えます。",
      "<b>スターター</b> — カル(廃棄でデッキ圧縮)、宝箱(開封)、アチューン(最大マナ+1)。",
    ] },
    { icon: "🛒", h: "マーケット & デッキ強化", body: [
      "ショップでカードを買いデッキを強化します。買ったカードは<b>墓地</b>へ行き、デッキが尽きると混ざって戻ります。",
      "<b>固定マーケット</b>: 毎ゲーム固定のランダム8枚(コスト1~6)。",
      "<b>提示</b>: 毎ターン新たに提示される4枚(コスト1~現在の最大マナ)。<b>1マナ</b>で更新できます。",
    ] },
    { icon: "⚔️", h: "戦闘", body: [
      "モンスターで相手を攻撃します。",
      "相手モンスターを攻撃すると<b>ダメージが体力に蓄積</b>します。体力が0になると破壊され、とどめの超過分は相手プレイヤーに<b>貫通</b>ダメージとして入ります。",
      "受けたダメージは<b>消えません</b> — 場のモンスターは盾の位置に<b>残り体力</b>が表示され、傷ついていると<b>赤い数字</b>になります。場を離れて戻ると体力はリセットされます。",
      "攻撃しても<b>反撃ダメージは受けません</b>。代わりに相手の<b>セットされた罠</b>が攻撃に反応することがあるので注意。",
      "体力を下げる効果で<b>最大体力が残り体力以下</b>になると、そのモンスターは破壊されます。",
      "相手の場が空なら体力を<b>直接</b>攻撃します。",
      "一度攻撃したモンスターはそのターン再攻撃できません(一部カードは2回攻撃可能)。",
    ] },
    { icon: "🪤", h: "罠 & リアクション", body: [
      "罠は非公開でセットし、相手の<b>攻撃・召喚・魔法</b>などの行動に反応して自動で発動します(発動時に公開)。",
      "攻撃無効、反射、モンスター破壊、ドロー、魔法無効化など種類は様々です。",
    ] },
    { icon: "🧬", h: "種族シナジー", body: [
      "<b>孤独・高貴・捕食・貴族・始原</b>の5種族があります。",
      "<b>同じ種族</b>の<b>異なる</b>カードを場に<b>2枚・3枚</b>(始原は<b>4枚</b>まで)揃えると強力な同族シナジーが発動します(同じカード2枚は不可、1ゲームに各1回)。",
      "<b>始原</b>は1~8コスト各1種(全8種、8コスト<b>始原のミミック</b>を含む)で構成され、異なるカードを揃えやすい種族です。",
      "カードを拡大(右クリック・長押し)すると種族タグのⓘでボーナス内容を確認できます。",
    ] },
    { icon: "⭐", h: "特殊カード & 場", body: [
      "場には<b>モンスター7枚</b>、<b>魔法・罠7枚</b>まで置けます。",
      "<b>永続魔法</b>は場に残って継続効果を与え、一部のカードで破壊・ゲームから除外できます。",
      "<b>召喚条件</b>を持つモンスターもいます(例: 特定カードが場・デッキ・墓地に必要)。",
      "<b>アサシン</b>系のように相手モンスターを無視して<b>プレイヤーを直接攻撃</b>するカードもあります。",
    ] },
    { icon: "🎁", h: "宝箱", body: [
      "宝箱を開けると<b>ダイス 🎲</b>を振って結果が決まります:",
      "<b>1</b> ハズレ(相手の場にミミック3/2) / <b>2・3</b> 体力+3 / <b>4・5</b> 最大マナ+1 / <b>6</b> 最大体力+5。",
      "宝箱カードを拡大すると、このダイス表が横に表示されます。他の確率効果もすべてダイス判定です。",
    ] },
    { icon: "🏷️", h: "効果の表記ルール", body: [
      "効果の前の<b>【タグ】</b>が発動条件です: <b>【召喚時】</b>召喚した瞬間に1回 / <b>【攻撃された時】</b>罠が攻撃に反応 / <b>【魔法に反応】・【召喚に反応】</b>相手の魔法・召喚に反応 / <b>【常時】</b>場にいる間ずっと / <b>【毎ターン】</b>自分のターン開始ごと / <b>【条件】</b>召喚条件。",
      "<b>【永続】</b>の永続魔法は破壊されるまで続きます。<b>【持続Nターン】</b>はNターン後に消え、場に<b>残りターンのバッジ ⏳</b>が表示されます。",
      "タグのない魔法効果は<b>発動した瞬間</b>に適用されます。",
      "<b>(両方の場)</b>と書かれた破壊効果は<b>自分のカードも対象に選べます</b>。",
    ] },
    { icon: "🏆", h: "勝利 & 操作", body: [
      "<b>1対1</b>の対戦です。相手の<b>体力を0</b>にすればその時点で勝利です。",
      "<b>60ターン</b>終了までに決着がつかない場合、<b>残り体力が多い方の判定勝ち</b>になります。（同点なら引き分け）",
      "<b>カード拡大</b>: PCは右クリック、モバイルは長押し。",
      "<b>降参</b>: 右のログパネル最下部(モバイルは📜ボタンでログを開く)。",
      "相手のターン中は相手のマナがリアルタイムで表示されます。",
    ] },
  ],
  en: [
    { icon: "🎯", h: "Goal", body: [
      "Reduce your opponent's <b>HP</b> to 0 to win.",
      "The first player starts at <b>35</b> HP, the second at <b>42</b>. (The extra HP offsets the first player's tempo advantage.)",
      "Who goes first is decided fairly by a <b>coin toss</b> each game.",
    ] },
    { icon: "🔄", h: "Turn Flow", body: [
      "At the start of your turn: ① <b>mana refills to max</b> and ② you <b>draw 3 cards</b>.",
      "Then act freely while your mana lasts — summon monsters, cast spells, set traps, attack, buy cards.",
      "Press <b>End Turn</b> to discard your remaining hand (to the graveyard) and pass to the opponent.",
    ] },
    { icon: "💎", h: "Mana", body: [
      "The resource for everything. It refills to your <b>max mana</b> each turn (starts at 4).",
      "<b>Attune</b> and some cards raise your max mana permanently. Buying, casting and summoning all cost mana.",
    ] },
    { icon: "🃏", h: "Card Types", body: [
      "<b>Monsters</b> — have ATK/HP and fight on the field. Many have on-summon effects.",
      "<b>Spells</b> — one-shot effects (damage, healing, draw, destruction…).",
      "<b>Traps</b> — set face-down; trigger automatically on certain conditions.",
      "<b>Enchantments</b> — stay on the field for a duration with ongoing effects.",
      "<b>Starters</b> — Cull (thin your deck), Treasure Chest (open it), Attune (max mana +1).",
    ] },
    { icon: "🛒", h: "Markets & Deckbuilding", body: [
      "Buy cards to grow your deck. Purchases go to your <b>graveyard</b>, then shuffle back in when your deck runs out.",
      "<b>Fixed market</b>: 8 random cards per game (cost 1-6).",
      "<b>Offer</b>: 4 fresh cards each turn (cost 1 up to your max mana). Reroll it for <b>1 mana</b>.",
    ] },
    { icon: "⚔️", h: "Combat", body: [
      "Attack the opponent with your monsters.",
      "Attacking a monster deals <b>damage that accumulates on its HP</b>. At 0 HP it dies, and the killing blow's excess hits the opponent as <b>penetration</b> damage.",
      "Damage <b>does not wear off</b> — field monsters show their <b>remaining HP</b> in the shield slot, in <b>red</b> while wounded. HP resets if the card leaves the field.",
      "Attackers take <b>no retaliation damage</b>. The real risk is the opponent's <b>face-down traps</b> reacting to your attack.",
      "If an effect drops a monster's <b>max HP to its damage taken or below</b>, it is destroyed.",
      "If the enemy field is empty, you hit their HP <b>directly</b>.",
      "Each monster attacks once per turn (a few cards can attack twice).",
    ] },
    { icon: "🪤", h: "Traps & Reactions", body: [
      "Traps sit face-down and fire automatically on enemy <b>attacks, summons or spells</b> (revealed when triggered).",
      "They negate attacks, reflect damage, destroy monsters, draw cards, counter spells, and more.",
    ] },
    { icon: "🧬", h: "Tribe Synergies", body: [
      "There are 5 tribes: <b>Solitary, Noble, Devour, Aristocrat, Origin</b>.",
      "Gather <b>2 or 3 different cards of the SAME tribe</b> on your field (Origin goes up to <b>4</b>) for powerful same-tribe synergies (copies don't count; once per game each).",
      "Enlarge a card (right-click / long-press) and tap the tribe tag's ⓘ to see the bonuses.",
    ] },
    { icon: "⭐", h: "Special Cards & Field", body: [
      "The field holds up to <b>7 monsters</b> and <b>7 spells/traps</b>.",
      "<b>Enchantments</b> persist on the field; some cards destroy or exile them.",
      "Some monsters have <b>summon requirements</b> (e.g. specific cards in your field/deck/graveyard).",
      "<b>Assassins</b> ignore enemy monsters and always <b>attack the player directly</b>.",
    ] },
    { icon: "🎁", h: "Treasure Chests", body: [
      "Opening a chest <b>rolls a die 🎲</b> to decide the outcome:",
      "<b>1</b> Dud (a 3/2 Mimic on the enemy field) / <b>2·3</b> HP +3 / <b>4·5</b> Max mana +1 / <b>6</b> Max HP +5.",
      "Enlarge the chest card to see this die table. Every chance effect in the game is a dice roll.",
    ] },
    { icon: "🏷️", h: "Effect Notation", body: [
      "The <b>【tag】</b> before an effect is its trigger: <b>【On Summon】</b> once when summoned / <b>【When Attacked】</b> trap reacting to an attack / <b>【On Enemy Spell】·【On Enemy Summon】</b> trap reacting to the opponent / <b>【Passive】</b> while on the field / <b>【Each Turn】</b> at the start of your turns / <b>【Requires】</b> summon requirement.",
      "<b>【Permanent】</b> enchantments stay until destroyed. <b>【Lasts N Turns】</b> ones expire after N turns and show a <b>remaining-turns badge ⏳</b> on the field.",
      "A spell effect with no tag applies <b>immediately when cast</b>.",
      "Destruction effects marked <b>(either side)</b> can also <b>target your own cards</b>.",
    ] },
    { icon: "🏆", h: "Winning & Controls", body: [
      "It's a <b>1v1 duel</b>. Drop the opponent's <b>HP to 0</b> to win instantly.",
      "If nobody has won by the end of <b>turn 60</b>, the player with <b>more HP remaining wins the judgment</b> (a tie is a draw).",
      "<b>Enlarge cards</b>: right-click on PC, long-press on mobile.",
      "<b>Surrender</b>: bottom of the log panel (📜 button opens the log on mobile).",
      "The opponent's mana is shown live during their turn.",
    ] },
  ],
};

export function mountTutorial(app: App): Screen {
  const wrap = document.createElement("div");
  wrap.className = "screen tut-screen";
  const lang = getLang();
  const secs = [...SECTIONS[lang], passiveSection(lang)];
  wrap.innerHTML = `
    <div class="topright-lang"></div>
    <div class="tut">
      <div class="tut-head">
        <button class="btn btn-ghost" id="back">← ${t("tutorial.back")}</button>
        <h2>${t("tutorial.title")}</h2>
      </div>
      <div class="tut-body">
        <section class="tut-sec tut-inter">
          <h3><span class="tut-ico">🎮</span>${t("tutorial.inter.title")}</h3>
          <p>${t("tutorial.inter.desc")}</p>
          <ol class="tut-steps">
            ${TUT_STEPS.map((s, i) => `
              <li data-key="${s.key}">
                <span class="tut-step-n">${i + 1}</span>
                <span class="tut-step-t">${t(s.titleKey)}</span>
                <span class="tut-step-r">+${s.reward} 💎</span>
              </li>`).join("")}
          </ol>
          <div class="tut-cta">
            <button class="btn btn-primary" id="startInter">${t("tutorial.inter.start")}</button>
          </div>
        </section>
        <h3 class="tut-rules-h">${t("tutorial.rules")}</h3>
        ${secs.map((s) => `
          <section class="tut-sec">
            <h3><span class="tut-ico">${s.icon}</span>${s.h}</h3>
            ${s.body.map((p) => `<p>${p}</p>`).join("")}
          </section>`).join("")}
        <div class="tut-cta">
          <button class="btn btn-primary" id="play">${t("tutorial.start")}</button>
        </div>
      </div>
    </div>`;
  app.root.appendChild(wrap);
  wrap.querySelector(".topright-lang")!.appendChild(langSelectEl());
  (wrap.querySelector("#back") as HTMLElement).onclick = () => app.home();
  (wrap.querySelector("#play") as HTMLElement).onclick = () => app.botGame();
  (wrap.querySelector("#startInter") as HTMLElement).onclick = () => app.tutorialGame();

  // mark steps whose reward was already claimed (server is the source of truth)
  void api.claimedRewards().then(({ keys }) => {
    for (const k of keys) {
      const li = wrap.querySelector(`.tut-steps li[data-key="${k}"]`);
      if (!li) continue;
      li.classList.add("claimed");
      (li.querySelector(".tut-step-r") as HTMLElement).innerHTML = `✓ ${t("tutorial.inter.done")}`;
    }
  });

  const unsub = onLangChange(() => app.tutorial());
  return { destroy: unsub };
}
