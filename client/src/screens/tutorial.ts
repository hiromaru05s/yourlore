import { mountManaSpirit } from '../ui/manaSpirit';
import '../styles/tutorialAcademy.css';
import '../styles/homeTutorial.css';
import { artUrl } from '../ui/cardArt';
import { loungeText } from "../ui/loungeText";
import { homeIcon } from "../ui/homeIcons";
// ============================================================
// LORE — tutorial / how-to-play screen (bilingual KO/JA).
// Scrollable rule sections; reachable from HOME.
// ============================================================
import type { App, Screen } from "../router";
import { t, getLang, onLangChange } from "../i18n";
import { langSelectEl } from "../ui/langSelect";
import { TUT_STEPS } from "../shared/tutorialSteps";
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
      "<b>정신력 회복</b>은 현재 수치에 더해지며 시작 수치를 넘을 수 있어요. <b>이슬</b>은 자신의 턴 시작 시 회복량, <b>실드</b>는 피해를 먼저 흡수하는 일시적 방어예요.",
      "선공은 체력 <b>40</b>, 후공은 <b>45</b>로 시작해요. (후공이 조금 높은 건 선공의 템포 이점을 보정하기 위함입니다.)",
      "선공/후공은 매 게임 <b>코인토스</b>로 공정하게 정해집니다.",
    ] },
    { icon: "🔄", h: "턴의 흐름", body: [
      "내 턴이 시작되면 ① <b>마나가 최대치까지 충전</b>되고 ② 카드를 <b>3장 드로우</b>합니다. (턴 종료 시 손패는 7장까지 이월 · 8장 이상이면 버릴 카드를 고릅니다, 시간 초과 시 오른쪽부터 폐기)",
      "그다음 마나가 닿는 한 자유롭게 행동합니다 — 몬스터 소환, 마법 시전, 공격, 카드 구매.",
      "<b>턴 종료</b>를 누르면 상대 턴으로 넘어갑니다. 손에 남은 카드는 <b>그대로 유지</b>되어 다음 턴에도 쓸 수 있어요.",
    ] },
    { icon: "💎", h: "마나", body: [
      "모든 행동의 자원입니다. 매 턴 <b>최대 마나만큼</b> 다시 채워집니다(시작 4).",
      "<b>어튠</b>이나 일부 카드로 최대 마나를 영구히 늘릴 수 있어요. 카드 구매·마법·소환에 모두 마나를 씁니다.",
    ] },
    { icon: "🃏", h: "카드 종류", body: [
      "<b>몬스터</b> — 공격력/체력을 가지며 필드에 소환. 소환 시 효과가 있는 경우도 많습니다.",
      "<b>마법</b> — 즉시 1회 효과(데미지, 회복, 드로우, 파괴 등).",
      "<b>영구마법</b> — 필드에 일정 턴 동안 남아 지속 효과를 줍니다.",
      "<b>스타터</b> — 컬(폐기로 덱 압축), 보물상자(개봉), 어튠(최대 마나+1).",
    ] },
    { icon: "🛒", h: "마켓 & 덱 강화", body: [
      "상점에서 카드를 사 덱을 키웁니다. 산 카드는 <b>묘지</b>로 갔다가, 덱이 떨어지면 섞여 다시 들어옵니다.",
      "<b>고정 마켓</b>: 매 게임 고정된 랜덤 7장(코스트 1~6).",
      "<b>제시</b>: 매 턴 새로 제시되는 3장(코스트 1~현재 최대 마나). <b>1마나</b>로 새로 갱신할 수 있어요.",
    ] },
    { icon: "⚔️", h: "전투", body: [
      "몬스터로 상대를 공격합니다.",
      "강화·약화를 반영한 <b>현재 공격력이 0이면 공격할 수 없고</b> 공격시 효과도 발동하지 않습니다. 1 이상이 되면 다른 제한이 없는 한 공격할 수 있어요.",
      "상대 몬스터를 치면 <b>데미지가 체력에 누적</b>됩니다. 체력이 0이 되면 파괴되고, 막타의 초과분은 상대 플레이어에게 <b>관통</b> 데미지로 들어갑니다.",
      "받은 데미지는 <b>사라지지 않습니다</b> — 필드의 몬스터는 방패 자리에 <b>남은 체력</b>이 표시되고, 다친 상태면 <b>빨간 숫자</b>로 보여요. 필드를 떠났다 돌아오면 체력이 초기화됩니다.",
      "보통 반격은 없지만, <b>「반격」을 가진 상대는 공격력의 절반(올림)으로 반격</b>합니다.",
      "체력을 깎는 효과로 <b>체력이 남은 체력 이하</b>가 되면 그 몬스터는 파괴됩니다.",
      "상대 필드가 비어 있으면 체력을 <b>직접</b> 때립니다.",
      "한 번 공격한 몬스터는 그 턴엔 다시 공격할 수 없어요(일부 카드는 2회 공격 가능).",
    ] },
    { icon: "🧬", h: "종족 시너지", body: [
      "<b>고독·고귀·포식·귀족·시초</b> 5종족이 있습니다.",
      "<b>같은 종족</b>의 서로 <b>다른</b> 카드를 필드에 <b>2장·3장</b>(시초는 <b>4장</b>까지) 모으면 강력한 동족 시너지가 발동합니다(같은 카드 2장은 인정 X, 게임당 각 1회).",
      "<b>시초</b>는 1~8코스트 각 1종(총 8종, 8코 <b>시초의 미믹</b> 포함)으로 이뤄져 서로 다른 카드를 모으기 가장 좋습니다.",
      "카드를 확대하면(우클릭·길게 누르기) 종족 태그의 ⓘ에서 보너스 내용을 볼 수 있어요.",
    ] },
    { icon: "⭐", h: "특수 카드 & 필드", body: [
      "필드에는 <b>몬스터 7장</b>, <b>마법 14장</b>까지 놓을 수 있습니다.",
      "<b>영구마법</b>은 필드에 남아 지속 효과를 주며, 일부 카드로 파괴하거나 게임에서 제외할 수 있어요.",
      "<b>소환 조건</b>이 있는 몬스터도 있습니다(예: 특정 카드가 필드·덱·묘지에 있어야 소환).",
      "<b>암살자</b>류처럼 상대 몬스터를 무시하고 <b>플레이어를 직접 공격</b>하는 카드도 있습니다.",
    ] },
    { icon: "🏷️", h: "효과 표기 규칙", body: [
      "효과 앞의 <b>【태그】</b>가 발동 조건입니다: <b>【소환시】</b> 소환한 순간 1회 / <b>【상시】</b> 필드에 있는 동안 계속 / <b>【매턴】</b> 자신 턴 시작마다 / <b>【조건】</b> 소환 조건.",
      "<b>【영구】</b> 영구마법은 파괴되기 전까지 계속 유지됩니다. <b>【지속 N턴】</b>은 N턴 뒤 사라지며, 필드에 <b>남은 턴 배지 ⏳</b>가 표시됩니다.",
      "태그가 없는 마법 효과는 <b>시전 즉시</b> 발동합니다.",
      "<b>(양측)</b> 표기가 있는 파괴 효과는 <b>자신의 카드도 대상으로 선택</b>할 수 있습니다.",
    ] },
    { icon: "🎁", h: "보물상자", body: [
      "보물상자를 열면 <b>주사위 🎲</b>를 굴려 결과가 정해집니다:",
      "<b>1·2</b> 상대 필드에 미믹 / <b>3·4</b> 정신력 5 회복 / <b>5·6</b> 최대 마나 +1.",
      "보물상자 카드를 확대하면 이 주사위 표가 옆에 표시됩니다. 다른 확률 효과도 전부 주사위 판정입니다.",
    ] },
    { icon: "🏆", h: "승리 & 조작", body: [
      "<b>1:1 대전</b>입니다. 상대의 <b>체력을 0</b>으로 만들면 그 즉시 승리해요.",
      "<b>60턴</b>이 끝날 때까지 승부가 나지 않으면 <b>남은 체력이 높은 쪽이 판정승</b>합니다. (동률이면 무승부)",
      "<b>카드 확대</b>: 손패를 펼친 뒤 카드를 누르면 상세를 볼 수 있어요. 우클릭·길게 누르기도 가능해요. 손패 카드는 필드로 드래그해서 사용해요.",
      "<b>기권</b>: 우측 로그 패널 맨 아래(모바일은 📜 버튼으로 로그 열기).",
      "상대 턴에는 상대의 마나가 실시간으로 표시됩니다.",
    ] },
  ],
  ja: [
    { icon: "🎯", h: "ゲームの目的", body: [
      "相手の<b>精神力</b>を0にすれば勝利です。",
      "<b>精神力の回復</b>は現在値に加算され、開始時の数値を超えられます。<b>露</b>は自分のターン開始時の回復量、<b>シールド</b>は先にダメージを受け止める一時的な防護です。",
      "先攻は精神力<b>40</b>、後攻は<b>45</b>でスタート。(後攻が少し高いのは先攻のテンポ有利を補正するためです。)",
      "先攻/後攻は毎ゲーム<b>コイントス</b>で公平に決まります。",
    ] },
    { icon: "🔄", h: "ターンの流れ", body: [
      "自分のターンになると ①<b>マナが最大まで回復</b>し ②カードを<b>3枚ドロー</b>します。(ターン終了時に持ち越せる手札は7枚まで · 8枚以上なら捨てるカードを選択、時間切れは右から破棄)",
      "その後はマナの続く限り自由に行動 — モンスター召喚、魔法発動、攻撃、カード購入。",
      "<b>ターン終了</b>を押すと相手のターンになります。手札の残りは<b>そのまま持ち越し</b>、次のターンも使えます。",
    ] },
    { icon: "💎", h: "マナ", body: [
      "すべての行動の資源です。毎ターン<b>最大マナ分</b>まで回復します(初期4)。",
      "<b>アチューン</b>や一部のカードで最大マナを永続的に増やせます。購入・魔法・召喚すべてにマナを使います。",
    ] },
    { icon: "🃏", h: "カードの種類", body: [
      "<b>モンスター</b> — 攻撃力/体力を持ち場に召喚。召喚時効果を持つものも多いです。",
      "<b>魔法</b> — 即時1回の効果(ダメージ・回復・ドロー・破壊など)。",
      "<b>永続魔法</b> — 場に一定ターン残り、継続効果を与えます。",
      "<b>スターター</b> — カル(廃棄でデッキ圧縮)、宝箱(開封)、アチューン(最大マナ+1)。",
    ] },
    { icon: "🛒", h: "マーケット & デッキ強化", body: [
      "マーケットでカードを借りてデッキを強化します。買ったカードは<b>墓地</b>へ行き、デッキが尽きると混ざって戻ります。",
      "<b>固定マーケット</b>: 毎ゲーム固定のランダム7枚(コスト1~6)。",
      "<b>提示</b>: 毎ターン新たに提示される3枚(コスト1~現在の最大マナ)。<b>1マナ</b>で更新できます。",
    ] },
    { icon: "⚔️", h: "戦闘", body: [
      "モンスターで相手を攻撃します。",
      "強化・弱体化を反映した<b>現在の攻撃力が0なら攻撃できません</b>。攻撃時効果も発動しません。1以上に戻れば、ほかの制限がない限り攻撃できます。",
      "相手モンスターを攻撃すると<b>ダメージが体力に蓄積</b>します。体力が0になると破壊され、とどめの超過分は相手の精神力に<b>貫通</b>ダメージとして入ります。",
      "受けたダメージは<b>消えません</b> — 場のモンスターは盾の位置に<b>残り体力</b>が表示され、傷ついていると<b>赤い数字</b>になります。場を離れて戻ると体力はリセットされます。",
      "通常は反撃されませんが、<b>「反撃」を持つ相手は攻撃力の半分（切り上げ）で反撃</b>します。",
      "体力を下げる効果で<b>体力上限が蓄積ダメージ以下</b>になると、そのモンスターは破壊されます。",
      "相手の場が空なら体力を<b>直接</b>攻撃します。",
      "一度攻撃したモンスターはそのターン再攻撃できません(一部カードは2回攻撃可能)。",
    ] },
    { icon: "🧬", h: "種族シナジー", body: [
      "<b>孤独・高貴・捕食・貴族・始原</b>の5種族があります。",
      "<b>同じ種族</b>の<b>異なる</b>カードを場に<b>2枚・3枚</b>(始原は<b>4枚</b>まで)揃えると強力な同族シナジーが発動します(同じカード2枚は不可、1ゲームに各1回)。",
      "<b>始原</b>は1~8コスト各1種(全8種、8コスト<b>始原のミミック</b>を含む)で構成され、異なるカードを揃えやすい種族です。",
      "カードを拡大(右クリック・長押し)すると種族タグのⓘでボーナス内容を確認できます。",
    ] },
    { icon: "⭐", h: "特殊カード & 場", body: [
      "場には<b>モンスター7枚</b>、<b>魔法14枚</b>まで置けます。",
      "<b>永続魔法</b>は場に残って継続効果を与え、一部のカードで破壊・ゲームから除外できます。",
      "<b>召喚条件</b>を持つモンスターもいます(例: 特定カードが場・デッキ・墓地に必要)。",
      "<b>アサシン</b>系のように相手モンスターを無視して<b>プレイヤーを直接攻撃</b>するカードもあります。",
    ] },
    { icon: "🎁", h: "宝箱", body: [
      "宝箱を開けると<b>ダイス 🎲</b>を振って結果が決まります:",
      "<b>1・2</b> 相手の場にミミック / <b>3・4</b> 精神力を5回復 / <b>5・6</b> 最大マナ+1。",
      "宝箱カードを拡大すると、このダイス表が横に表示されます。他の確率効果もすべてダイス判定です。",
    ] },
    { icon: "🏷️", h: "効果の表記ルール", body: [
      "効果の前の<b>【タグ】</b>が発動条件です: <b>【召喚時】</b>召喚した瞬間に1回 / <b>【常時】</b>場にいる間ずっと / <b>【毎ターン】</b>自分のターン開始ごと / <b>【条件】</b>召喚条件。",
      "<b>【永続】</b>の永続魔法は破壊されるまで続きます。<b>【持続Nターン】</b>はNターン後に消え、場に<b>残りターンのバッジ ⏳</b>が表示されます。",
      "タグのない魔法効果は<b>発動した瞬間</b>に適用されます。",
      "<b>(両方の場)</b>と書かれた破壊効果は<b>自分のカードも対象に選べます</b>。",
    ] },
    { icon: "🏆", h: "勝利 & 操作", body: [
      "<b>1対1</b>の対戦です。相手の<b>精神力を0</b>にすればその時点で勝利です。",
      "<b>60ターン</b>終了までに決着がつかない場合、<b>残り体力が多い方の判定勝ち</b>になります。（同点なら引き分け）",
      "<b>カード拡大</b>: 手札を押して広げ、カードをタップして詳細表示。PCは右クリック、モバイルは長押しでも拡大できます。手札の使用は盤面へのドラッグです。",
      "<b>降参</b>: 右のログパネル最下部(モバイルは📜ボタンでログを開く)。",
      "相手のターン中は相手のマナがリアルタイムで表示されます。",
    ] },
  ],
  en: [
    { icon: "🎯", h: "Goal", body: [
      "Reduce your opponent's <b>HP</b> to 0 to win.",
      "<b>Spirit recovery</b> adds to your current value and can exceed the starting value. <b>Dew</b> heals at the start of your turns; <b>Shield</b> temporarily absorbs incoming damage first.",
      "The first player starts at <b>40</b> HP, the second at <b>45</b>. (The extra HP offsets the first player's tempo advantage.)",
      "Who goes first is decided fairly by a <b>coin toss</b> each game.",
    ] },
    { icon: "🔄", h: "Turn Flow", body: [
      "At the start of your turn: ① <b>mana refills to max</b> and ② you <b>draw 3 cards</b>. (You may carry over 7 cards at end of turn · with 8+ you choose what to discard; on timeout the rightmost go)",
      "Then act freely while your mana lasts — summon monsters, cast spells, attack, buy cards.",
      "Press <b>End Turn</b> to pass to the opponent. Cards left in your hand <b>stay</b> for your next turn.",
    ] },
    { icon: "💎", h: "Mana", body: [
      "The resource for everything. It refills to your <b>max mana</b> each turn (starts at 4).",
      "<b>Attune</b> and some cards raise your max mana permanently. Buying, casting and summoning all cost mana.",
    ] },
    { icon: "🃏", h: "Card Types", body: [
      "<b>Monsters</b> — have ATK/HP and fight on the field. Many have on-summon effects.",
      "<b>Spells</b> — one-shot effects (damage, healing, draw, destruction…).",
      "<b>Enchantments</b> — stay on the field for a duration with ongoing effects.",
      "<b>Starters</b> — Cull (thin your deck), Treasure Chest (open it), Attune (max mana +1).",
    ] },
    { icon: "🛒", h: "Markets & Deckbuilding", body: [
      "Buy cards to grow your deck. Purchases go to your <b>graveyard</b>, then shuffle back in when your deck runs out.",
      "<b>Fixed market</b>: 7 random cards per game (cost 1-6).",
      "<b>Offer</b>: 3 fresh cards each turn (cost 1 up to your max mana). Reroll it for <b>1 mana</b>.",
    ] },
    { icon: "⚔️", h: "Combat", body: [
      "Attack the opponent with your monsters.",
      "A monster with <b>0 current ATK, including buffs and debuffs, cannot attack</b> or trigger on-attack effects. At 1 or more ATK, it can attack if no other restriction applies.",
      "Attacking a monster deals <b>damage that accumulates on its HP</b>. At 0 HP it dies, and the killing blow's excess hits the opponent as <b>penetration</b> damage.",
      "Damage <b>does not wear off</b> — field monsters show their <b>remaining HP</b> in the shield slot, in <b>red</b> while wounded. HP resets if the card leaves the field.",
      "There is normally no retaliation, but a defender with <b>Counter retaliates for half its ATK, rounded up</b>.",
      "If an effect drops a monster's <b>HP to its damage taken or below</b>, it is destroyed.",
      "If the enemy field is empty, you hit their HP <b>directly</b>.",
      "Each monster attacks once per turn (a few cards can attack twice).",
    ] },
    { icon: "🧬", h: "Tribe Synergies", body: [
      "There are 5 tribes: <b>Solitary, Noble, Devour, Aristocrat, Origin</b>.",
      "Gather <b>2 or 3 different cards of the SAME tribe</b> on your field (Origin goes up to <b>4</b>) for powerful same-tribe synergies (copies don't count; once per game each).",
      "Enlarge a card (right-click / long-press) and tap the tribe tag's ⓘ to see the bonuses.",
    ] },
    { icon: "⭐", h: "Special Cards & Field", body: [
      "The field holds up to <b>7 monsters</b> and <b>14 spells</b>.",
      "<b>Enchantments</b> persist on the field; some cards destroy or exile them.",
      "Some monsters have <b>summon requirements</b> (e.g. specific cards in your field/deck/graveyard).",
      "<b>Assassins</b> ignore enemy monsters and always <b>attack the player directly</b>.",
    ] },
    { icon: "🎁", h: "Treasure Chests", body: [
      "Opening a chest <b>rolls a die 🎲</b> to decide the outcome:",
      "<b>1·2</b> a Mimic on the enemy field / <b>3·4</b> recover 5 Spirit / <b>5·6</b> Max mana +1.",
      "Enlarge the chest card to see this die table. Every chance effect in the game is a dice roll.",
    ] },
    { icon: "🏷️", h: "Effect Notation", body: [
      "The <b>【tag】</b> before an effect is its trigger: <b>【On Summon】</b> once when summoned / <b>【Passive】</b> while on the field / <b>【Each Turn】</b> at the start of your turns / <b>【Requires】</b> summon requirement.",
      "<b>【Permanent】</b> enchantments stay until destroyed. <b>【Lasts N Turns】</b> ones expire after N turns and show a <b>remaining-turns badge ⏳</b> on the field.",
      "A spell effect with no tag applies <b>immediately when cast</b>.",
      "Destruction effects marked <b>(either side)</b> can also <b>target your own cards</b>.",
    ] },
    { icon: "🏆", h: "Winning & Controls", body: [
      "It's a <b>1v1 duel</b>. Drop the opponent's <b>HP to 0</b> to win instantly.",
      "If nobody has won by the end of <b>turn 60</b>, the player with <b>more HP remaining wins the judgment</b> (a tie is a draw).",
      "<b>Enlarge cards</b>: expand the hand, then tap a card to inspect it. Right-click on PC or long-press on mobile also works. Drag hand cards onto the board to play them.",
      "<b>Surrender</b>: bottom of the log panel (📜 button opens the log on mobile).",
      "The opponent's mana is shown live during their turn.",
    ] },
  ],
};


const extraRules: Record<'ja'|'en'|'ko', Section> = {
  ja: {icon:'',h:'デュエル前の準備と例外',body:[
    '持ち込むデッキは<b>自由枠8枚＋アチューン1枚</b>。チャームは1つ。シャードはメニューで使う通貨で、デュエルのマナとは別です。',
    '<b>クイック魔法</b>は購入時に発動してリフトへ移ります。<b>クエスト</b>は記載された条件を進めて達成効果を得ます。カードを拡大して条件・対象・タイミングを確認しましょう。',
    '固定マーケットは各枠に在庫があり、売り切れると補充されます。<b>最大マナは通常3〜30</b>の範囲です。',
    '<b>露</b>は回復しても消費されません。<b>シールド</b>は通常、次の自分のターンを迎える前に消えます。カードの追加効果やパッシブが基本ルールを変える場合があります。',
    '通常デュエルには制限時間があります。チュートリアルは時間制限なし。練習用に盤面と手札を準備し、通常対戦の成績には含めません。'
  ]},
  en: {icon:'',h:'Preparation and exceptions',body:[
    'Bring <b>eight chosen cards plus one fixed Attune</b> and one Charm. Shards are menu currency, separate from duel mana.',
    '<b>Quick spells</b> resolve when purchased and leave through the Rift. <b>Quests</b> track their printed conditions and grant a completion effect. Inspect cards for targets, timing and requirements.',
    'Fixed market slots have stock and restock when exhausted. <b>Maximum mana is normally bounded between 3 and 30</b>.',
    '<b>Dew</b> is not consumed by its recovery. <b>Shield</b> normally expires before your next turn. Card effects and passives can change the basic rules.',
    'Normal duels have turn timers. Tutorial practice has no timer, uses prepared boards and hands, and does not affect your duel record.'
  ]},
  ko: {icon:'',h:'듀얼 준비와 예외',body:[
    '<b>자유 카드 8장＋고정 어튠 1장</b>과 참 1개를 준비해요. 샤드는 메뉴에서 쓰는 통화로, 듀얼의 마나와 달라요.',
    '<b>퀵 마법</b>은 구매 즉시 발동하고 리프트로 가요. <b>퀘스트</b>는 적힌 조건을 진행해 달성 효과를 얻어요. 카드 상세에서 대상·시점·조건을 확인하세요.',
    '고정 마켓은 각 칸에 재고가 있고 소진 시 보충돼요. <b>최대 마나는 보통 3~30</b> 범위예요.',
    '<b>이슬</b>은 회복해도 소모되지 않아요. <b>실드</b>는 보통 다음 자신의 턴 전에 사라져요. 카드 효과와 패시브가 기본 규칙을 바꿀 수 있어요.',
    '일반 듀얼에는 턴 제한 시간이 있어요. 튜토리얼은 시간제한 없이 준비된 필드와 손패로 연습하며 듀얼 전적에 포함되지 않아요.'
  ]}
};

export function openRuleNotebook(): () => void {
  const lang=getLang(), dialog=document.createElement('dialog'); dialog.className='rule-notebook';
  const secs=[...SECTIONS[lang],extraRules[lang],passiveSection(lang)];
  dialog.innerHTML=`<header><div><span class="menu-eyebrow">BIBLION / FIELD NOTES</span><h2>${loungeText('シーカーのルールノート','Seeker’s rule notebook','시커의 규칙 노트')}</h2></div><button class="btn btn-ghost" data-close aria-label="${loungeText('閉じる','Close','닫기')}">×</button></header>
    <div class="notebook-pages"><nav aria-label="${t('tutorial.rules')}">${secs.map((s,i)=>`<a href="#note-${i}">${String(i+1).padStart(2,'0')} ${s.h}</a>`).join('')}</nav><div>${secs.map((s,i)=>`<section id="note-${i}" class="tut-sec"><span class="note-number">${String(i+1).padStart(2,'0')}</span><h3>${s.h}</h3>${s.body.map(p=>`<p>${p}</p>`).join('')}</section>`).join('')}</div></div>`;
  document.body.append(dialog);dialog.showModal();
  const close=()=>{dialog.close();dialog.remove();};
  dialog.querySelector('[data-close]')!.addEventListener('click',close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();dialog.querySelector(a.getAttribute('href')!)?.scrollIntoView({block:'start'});}));
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  return close;
}

export function mountTutorial(app:App):Screen {
  const wrap=document.createElement('div');wrap.className='screen tut-screen academy';
  const lang=getLang();let disposed=false,closeNote:(()=>void)|undefined;
  const lessonArt=['STARTER_MANA','M4','M1','S3','STARTER_CHEST','S1','STARTER_TRASH','STARTER_CHEST','E3','TSO2','S4','M4'];
  const guest=!app.user || app.user.id==='local-guest-user';
  wrap.innerHTML=`<div class="topright-lang"></div><main class="academy-content">
    <button class="academy-notebook" id="ruleNotebook">${homeIcon('book')}<span>${loungeText('ゲームルールをノートで読む','Read the game rules','게임 규칙 노트 읽기')}</span><span aria-hidden="true">↗</span></button>
    <header class="academy-hero"><div class="academy-spirit"></div><div><span class="menu-eyebrow">BIBLION / FIRST ATTUNEMENT</span><h1>${loungeText('チュートリアル','Tutorial','튜토리얼')}</h1><p>${loungeText('マナの精霊と、ひとつずつ。カードに触れて、デュエルを覚えよう。','One step at a time, with a mana spirit. Learn by playing real cards.','마나 정령과 한 걸음씩. 직접 카드를 사용하며 듀얼을 배워 보세요.')}</p></div></header>
    <section class="academy-progress" aria-label="${loungeText('実習の進捗','Lesson progress','실습 진행')}" ><div><span>${loungeText('全12課程の初回クリア報酬','First-clear rewards across 12 lessons','12개 과정 첫 완료 보상')}</span><strong>${homeIcon('shard')} 3,000 <small>${loungeText('シャード','Shards','샤드')}</small></strong></div><div class="academy-earned" role="status">${loungeText('進捗を読み込み中…','Loading progress…','진행 상황 불러오는 중…')}</div><progress max="12" value="0" aria-label="${loungeText('クリアした課程数','Completed lessons','완료한 과정 수')}"></progress><p>${loungeText('各課程250シャード・何度でも練習可能。続きはいつでもここから。','250 Shards per lesson. Replay any time and return here to continue.','과정마다 250샤드. 언제든 다시 연습하거나 이어서 할 수 있어요.')}</p></section>
    <div class="academy-controls"><button id="startInter" class="btn btn-primary" disabled>${loungeText('最初の実習へ','Begin the lessons','첫 실습 시작')}</button><button id="back" class="btn btn-ghost">${t('tutorial.back')}</button></div>
    <div class="academy-map-heading"><h2>${loungeText('実習ステージ','Practice stages','실습 스테이지')}</h2><span class="academy-clear-count" aria-live="polite">— / 12</span></div>
    <ol class="tut-steps academy-lessons">${TUT_STEPS.map((s,i)=>`<li data-key="${s.key}" class="lesson-tile">
      <div class="lesson-art" aria-hidden="true"><img src="${artUrl.sm(lessonArt[i])}" alt="" loading="lazy"><span class="tut-step-n">${String(i+1).padStart(2,'0')}</span><span class="lesson-clear-seal">${homeIcon('check')}</span></div>
      <div class="lesson-copy"><span class="lesson-state">${loungeText('確認中','Loading','확인 중')}</span><h2 class="tut-step-t">${s.title[lang]}</h2><p>${s.learned[lang]}</p></div>
      <button class="academy-lesson-start" data-lesson="${i}" disabled aria-label="${s.title[lang]}"><span class="tut-step-r">+250 ${homeIcon('shard')}</span><span class="lesson-action">${loungeText('実習へ','Play','실습')} →</span></button>
    </li>`).join('')}</ol>
    <footer class="academy-footer"><p>${loungeText('ここで借りるカードとマナは練習用。通常のデュエルでは、自分のデッキとマーケットから戦い方を組み立てよう。','Cards and mana here are prepared for practice. In a real duel, build your strategy from your deck and the market.','이곳의 카드와 마나는 연습용이에요. 실제 듀얼에서는 자신의 덱과 마켓으로 전략을 세우세요.')}</p><button id="play" class="btn btn-ghost">${loungeText('BOT戦へ','Play a bot','BOT전')}</button></footer>
    </main>`;
  app.root.append(wrap);wrap.querySelector('.topright-lang')!.append(langSelectEl());
  const spirit=mountManaSpirit(wrap.querySelector('.academy-spirit')!);
  wrap.querySelector('#ruleNotebook')!.addEventListener('click',()=>{closeNote?.();closeNote=openRuleNotebook();});
  wrap.querySelector('#back')!.addEventListener('click',()=>app.home());wrap.querySelector('#play')!.addEventListener('click',()=>app.botGame());
  const paint=(keys:string[])=>{
    if(disposed)return;const done=TUT_STEPS.filter(s=>keys.includes(s.key)).length;
    wrap.querySelector('progress')!.value=done;
    wrap.querySelector('.academy-clear-count')!.textContent=`${done} / 12 ${loungeText('クリア','CLEAR','완료')}`;
    wrap.classList.toggle('all-cleared',done===TUT_STEPS.length);
    wrap.querySelector('.academy-earned')!.textContent=guest?loungeText('練習モード · 報酬の受取にはログインが必要です。','Practice mode · Sign in to receive rewards.','연습 모드 · 보상을 받으려면 로그인하세요.'):`${done} / 12 ${loungeText('クリア済み','completed','완료')} · ${done*250} / 3,000 ${loungeText('シャード受取済み','Shards received','샤드 수령')}`;
    const first=TUT_STEPS.findIndex(s=>!keys.includes(s.key));
    const start=wrap.querySelector<HTMLButtonElement>('#startInter')!;start.disabled=false;
    start.textContent=first<0?loungeText('もう一度練習する','Practice again','다시 연습'):first>0?loungeText('続きの実習へ','Continue lessons','실습 이어서'):loungeText('最初の実習へ','Begin the lessons','첫 실습 시작');
    start.onclick=()=>app.tutorialGame(first<0?0:first);
    wrap.querySelectorAll<HTMLButtonElement>('[data-lesson]').forEach(b=>{b.disabled=false;b.onclick=()=>app.tutorialGame(Number(b.dataset.lesson));});
    TUT_STEPS.forEach((s,i)=>{
      const li=wrap.querySelector<HTMLElement>(`[data-key="${s.key}"]`)!;
      const cleared=keys.includes(s.key),next=i===first;
      li.classList.toggle('claimed',cleared);li.classList.toggle('is-next',next);
      const state=cleared?loungeText('クリア済み','CLEARED','완료'):next?loungeText('次のステージ','UP NEXT','다음 스테이지'):loungeText('未クリア','NOT CLEARED','미완료');
      li.querySelector('.lesson-state')!.textContent=state;
      const button=li.querySelector<HTMLButtonElement>('[data-lesson]')!;
      button.setAttribute('aria-label',`${s.title[lang]} · ${state} · ${cleared?loungeText('もう一度','Replay','다시'):loungeText('実習へ','Play','실습')}`);
      if(cleared){li.querySelector('.tut-step-r')!.innerHTML=`${homeIcon('check')} ${loungeText('報酬受取済み','Reward received','보상 수령 완료')}`;li.querySelector('.lesson-action')!.textContent=loungeText('もう一度 →','Replay →','다시 →');}
    });
  };
  const load=async()=>{try{if(guest)paint([]);else{const status=await api.tutorialStatus();if(disposed)return;if(app.user){app.user.credits=status.credits;document.dispatchEvent(new Event('lore:user'));}paint(status.keys);}}catch{if(disposed)return;const status=wrap.querySelector('.academy-earned')!;status.textContent=loungeText('進捗を読み込めませんでした。','Could not load progress.','진행 상황을 불러오지 못했어요.');const retry=document.createElement('button');retry.className='btn btn-ghost';retry.textContent=loungeText('再試行','Retry','재시도');retry.onclick=()=>{retry.remove();void load();};status.append(retry);}};
  void load();const unsub=onLangChange(()=>app.tutorial());
  return {destroy(){disposed=true;unsub();spirit.destroy();closeNote?.();}};
}
