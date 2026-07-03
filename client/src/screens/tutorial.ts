// ============================================================
// LORE — tutorial / how-to-play screen (bilingual KO/JA).
// Scrollable rule sections; reachable from HOME.
// ============================================================
import type { App, Screen } from "../router";
import { t, getLang, onLangChange } from "../i18n";
import { langSelectEl } from "../ui/langSelect";

interface Section { icon: string; h: string; body: string[]; }

const SECTIONS: { ko: Section[]; ja: Section[]; en: Section[] } = {
  ko: [
    { icon: "🎯", h: "게임 목표", body: [
      "상대의 <b>체력</b>을 0으로 만들면 승리합니다.",
      "선공은 체력 <b>35</b>, 후공은 <b>45</b>로 시작해요. (후공이 조금 높은 건 선공의 템포 이점을 보정하기 위함입니다.)",
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
      "<b>몬스터</b> — 공격력/방어력을 가지며 필드에 소환. 소환 시 효과가 있는 경우도 많습니다.",
      "<b>마법</b> — 즉시 1회 효과(데미지, 회복, 드로우, 파괴 등).",
      "<b>함정</b> — 비공개로 세트해두고 특정 조건에서 자동 발동.",
      "<b>영구마법</b> — 필드에 일정 턴 동안 남아 지속 효과를 줍니다.",
      "<b>스타터</b> — 컬(폐기로 덱 압축), 보물상자(개봉), 어튠(최대 마나+1).",
    ] },
    { icon: "🛒", h: "마켓 & 덱 강화", body: [
      "상점에서 카드를 사 덱을 키웁니다. 산 카드는 <b>묘지</b>로 갔다가, 덱이 떨어지면 섞여 다시 들어옵니다.",
      "<b>고정 마켓</b>: 매 게임 고정된 랜덤 10장(코스트 1~4).",
      "<b>제시</b>: 매 턴 새로 제시되는 3장(코스트 1~현재 최대 마나). <b>1마나</b>로 새로 갱신할 수 있어요.",
    ] },
    { icon: "⚔️", h: "전투", body: [
      "몬스터로 상대를 공격합니다.",
      "상대 몬스터를 칠 때 내 <b>공격력 > 상대 방어력</b>이면 그 몬스터를 파괴하고, 초과분이 상대 체력에 <b>관통</b> 데미지로 들어갑니다.",
      "상대 필드가 비어 있으면 체력을 <b>직접</b> 때립니다.",
      "한 번 공격한 몬스터는 그 턴엔 다시 공격할 수 없어요(일부 카드는 2회 공격 가능).",
    ] },
    { icon: "🪤", h: "함정 & 반응", body: [
      "함정은 비공개로 깔아두고 상대의 <b>공격·소환·마법</b> 같은 행동에 반응해 자동으로 터집니다(발동 시 공개).",
      "공격 무효화, 반사, 몬스터 파괴, 드로우, 마법 무효화 등 종류가 다양합니다.",
    ] },
    { icon: "🧬", h: "종족 시너지", body: [
      "<b>고독·고귀·포식·귀족·시초</b> 5종족이 있습니다.",
      "서로 <b>다른</b> 종족 카드를 필드에 <b>2종·3종</b>(시초는 <b>4종</b>까지) 모으면 강력한 보너스가 발동합니다(같은 카드 2장은 인정 X, 게임당 각 1회).",
      "카드를 확대하면(우클릭·길게 누르기) 종족 태그의 ⓘ에서 보너스 내용을 볼 수 있어요.",
    ] },
    { icon: "⭐", h: "특수 카드 & 필드", body: [
      "필드에는 <b>몬스터 9장</b>, <b>마법·함정 9장</b>까지 놓을 수 있습니다.",
      "<b>영구마법</b>은 필드에 남아 지속 효과를 주며, 일부 카드로 파괴하거나 게임에서 제외할 수 있어요.",
      "<b>소환 조건</b>이 있는 몬스터도 있습니다(예: 특정 카드가 필드·덱·묘지에 있어야 소환).",
      "<b>암살자</b>류처럼 상대 몬스터를 무시하고 <b>플레이어를 직접 공격</b>하는 카드도 있습니다.",
    ] },
    { icon: "🎁", h: "보물상자", body: [
      "보물상자를 열면 4가지 결과 중 하나가 <b>각 25%</b>로 나옵니다:",
      "최대 마나 +1 / 체력 +3 / 최대 체력 +5 / <b>꽝</b>(상대 필드에 미믹 3/2 소환).",
      "보물상자 카드를 확대하면 이 확률이 옆에 표시됩니다.",
    ] },
    { icon: "🏆", h: "승리 & 조작", body: [
      "<b>1:1 대전</b>입니다. 상대의 <b>체력을 0</b>으로 만들면 그 즉시 승리해요.",
      "<b>카드 확대</b>: PC는 우클릭, 모바일은 길게 누르기.",
      "<b>기권</b>: 우측 로그 패널 맨 아래(모바일은 📜 버튼으로 로그 열기).",
      "상대 턴에는 상대의 마나가 실시간으로 표시됩니다.",
    ] },
  ],
  ja: [
    { icon: "🎯", h: "ゲームの目的", body: [
      "相手の<b>体力</b>を0にすれば勝利です。",
      "先攻は体力<b>35</b>、後攻は<b>45</b>でスタート。(後攻が少し高いのは先攻のテンポ有利を補正するためです。)",
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
      "<b>モンスター</b> — 攻撃力/防御力を持ち場に召喚。召喚時効果を持つものも多いです。",
      "<b>魔法</b> — 即時1回の効果(ダメージ・回復・ドロー・破壊など)。",
      "<b>罠</b> — 非公開でセットし、特定の条件で自動発動。",
      "<b>永続魔法</b> — 場に一定ターン残り、継続効果を与えます。",
      "<b>スターター</b> — カル(廃棄でデッキ圧縮)、宝箱(開封)、アチューン(最大マナ+1)。",
    ] },
    { icon: "🛒", h: "マーケット & デッキ強化", body: [
      "ショップでカードを買いデッキを強化します。買ったカードは<b>墓地</b>へ行き、デッキが尽きると混ざって戻ります。",
      "<b>固定マーケット</b>: 毎ゲーム固定のランダム10枚(コスト1~4)。",
      "<b>提示</b>: 毎ターン新たに提示される3枚(コスト1~現在の最大マナ)。<b>1マナ</b>で更新できます。",
    ] },
    { icon: "⚔️", h: "戦闘", body: [
      "モンスターで相手を攻撃します。",
      "相手モンスターを攻撃する時、自分の<b>攻撃力 > 相手の防御力</b>ならそのモンスターを破壊し、超過分が相手の体力に<b>貫通</b>ダメージとして入ります。",
      "相手の場が空なら体力を<b>直接</b>攻撃します。",
      "一度攻撃したモンスターはそのターン再攻撃できません(一部カードは2回攻撃可能)。",
    ] },
    { icon: "🪤", h: "罠 & リアクション", body: [
      "罠は非公開でセットし、相手の<b>攻撃・召喚・魔法</b>などの行動に反応して自動で発動します(発動時に公開)。",
      "攻撃無効、反射、モンスター破壊、ドロー、魔法無効化など種類は様々です。",
    ] },
    { icon: "🧬", h: "種族シナジー", body: [
      "<b>孤独・高貴・捕食・貴族・始原</b>の5種族があります。",
      "<b>異なる</b>種族カードを場に<b>2種・3種</b>(始原は<b>4種</b>まで)揃えると強力なボーナスが発動します(同じカード2枚は不可、1ゲームに各1回)。",
      "カードを拡大(右クリック・長押し)すると種族タグのⓘでボーナス内容を確認できます。",
    ] },
    { icon: "⭐", h: "特殊カード & 場", body: [
      "場には<b>モンスター9枚</b>、<b>魔法・罠9枚</b>まで置けます。",
      "<b>永続魔法</b>は場に残って継続効果を与え、一部のカードで破壊・ゲームから除外できます。",
      "<b>召喚条件</b>を持つモンスターもいます(例: 特定カードが場・デッキ・墓地に必要)。",
      "<b>アサシン</b>系のように相手モンスターを無視して<b>プレイヤーを直接攻撃</b>するカードもあります。",
    ] },
    { icon: "🎁", h: "宝箱", body: [
      "宝箱を開けると4つの結果のいずれかが<b>各25%</b>で出ます:",
      "最大マナ+1 / 体力+8 / 最大体力+5 / <b>ハズレ</b>(相手の場にミミック3/2を召喚)。",
      "宝箱カードを拡大すると、この確率が横に表示されます。",
    ] },
    { icon: "🏆", h: "勝利 & 操作", body: [
      "<b>1対1</b>の対戦です。相手の<b>体力を0</b>にすればその時点で勝利です。",
      "<b>カード拡大</b>: PCは右クリック、モバイルは長押し。",
      "<b>降参</b>: 右のログパネル最下部(モバイルは📜ボタンでログを開く)。",
      "相手のターン中は相手のマナがリアルタイムで表示されます。",
    ] },
  ],
  en: [
    { icon: "🎯", h: "Goal", body: [
      "Reduce your opponent's <b>HP</b> to 0 to win.",
      "The first player starts at <b>35</b> HP, the second at <b>45</b>. (The extra HP offsets the first player's tempo advantage.)",
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
      "<b>Monsters</b> — have ATK/DEF and fight on the field. Many have on-summon effects.",
      "<b>Spells</b> — one-shot effects (damage, healing, draw, destruction…).",
      "<b>Traps</b> — set face-down; trigger automatically on certain conditions.",
      "<b>Enchantments</b> — stay on the field for a duration with ongoing effects.",
      "<b>Starters</b> — Cull (thin your deck), Treasure Chest (open it), Attune (max mana +1).",
    ] },
    { icon: "🛒", h: "Markets & Deckbuilding", body: [
      "Buy cards to grow your deck. Purchases go to your <b>graveyard</b>, then shuffle back in when your deck runs out.",
      "<b>Fixed market</b>: 10 random cards per game (cost 1-4).",
      "<b>Offer</b>: 3 fresh cards each turn (cost 1 up to your max mana). Reroll it for <b>1 mana</b>.",
    ] },
    { icon: "⚔️", h: "Combat", body: [
      "Attack the opponent with your monsters.",
      "When attacking a monster: if your <b>ATK > its DEF</b>, it dies and the excess hits the opponent as <b>penetration</b> damage.",
      "If the enemy field is empty, you hit their HP <b>directly</b>.",
      "Each monster attacks once per turn (a few cards can attack twice).",
    ] },
    { icon: "🪤", h: "Traps & Reactions", body: [
      "Traps sit face-down and fire automatically on enemy <b>attacks, summons or spells</b> (revealed when triggered).",
      "They negate attacks, reflect damage, destroy monsters, draw cards, counter spells, and more.",
    ] },
    { icon: "🧬", h: "Tribe Synergies", body: [
      "There are 5 tribes: <b>Solitary, Noble, Devour, Aristocrat, Origin</b>.",
      "Gather <b>2 or 3 different</b> cards of a tribe on your field (Origin goes up to <b>4</b>) for powerful bonuses (copies don't count; once per game each).",
      "Enlarge a card (right-click / long-press) and tap the tribe tag's ⓘ to see the bonuses.",
    ] },
    { icon: "⭐", h: "Special Cards & Field", body: [
      "The field holds up to <b>9 monsters</b> and <b>9 spells/traps</b>.",
      "<b>Enchantments</b> persist on the field; some cards destroy or exile them.",
      "Some monsters have <b>summon requirements</b> (e.g. specific cards in your field/deck/graveyard).",
      "<b>Assassins</b> ignore enemy monsters and always <b>attack the player directly</b>.",
    ] },
    { icon: "🎁", h: "Treasure Chests", body: [
      "Opening a chest gives one of 4 outcomes at <b>25% each</b>:",
      "Max mana +1 / HP +3 / Max HP +5 / <b>Dud</b> (a 3/2 Mimic on the enemy field).",
      "Enlarge the chest card to see these odds.",
    ] },
    { icon: "🏆", h: "Winning & Controls", body: [
      "It's a <b>1v1 duel</b>. Drop the opponent's <b>HP to 0</b> to win instantly.",
      "<b>Enlarge cards</b>: right-click on PC, long-press on mobile.",
      "<b>Surrender</b>: bottom of the log panel (📜 button opens the log on mobile).",
      "The opponent's mana is shown live during their turn.",
    ] },
  ],
};

export function mountTutorial(app: App): Screen {
  const wrap = document.createElement("div");
  wrap.className = "screen tut-screen";
  const secs = SECTIONS[getLang()];
  wrap.innerHTML = `
    <div class="topright-lang"></div>
    <div class="tut">
      <div class="tut-head">
        <button class="btn btn-ghost" id="back">← ${t("tutorial.back")}</button>
        <h2>${t("tutorial.title")}</h2>
      </div>
      <div class="tut-body">
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

  const unsub = onLangChange(() => app.tutorial());
  return { destroy: unsub };
}
