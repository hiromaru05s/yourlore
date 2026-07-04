// ============================================================
// LORE — i18n (Korean / Japanese / English). UI strings + card name/text helpers.
// Language is persisted in localStorage; default decided by IP (JP→ja).
// ============================================================
import type { CardInst } from "./shared/types";

export type Lang = "ko" | "ja" | "en";
let current: Lang = "ko";
const listeners = new Set<() => void>();

export function getLang(): Lang { return current; }
export function onLangChange(fn: () => void): () => void { listeners.add(fn); return () => listeners.delete(fn); }
export function setLang(l: Lang): void {
  if (l === current) return;
  current = l;
  try { localStorage.setItem("lore_lang", l); } catch { /* ignore */ }
  // snapshot: a listener may re-mount a screen (adding/removing listeners) mid-iteration
  [...listeners].forEach((f) => f());
}
/** Pick saved language, else the IP-based default. */
export function initLang(ipDefault: Lang): void {
  let saved: string | null = null;
  try { saved = localStorage.getItem("lore_lang"); } catch { /* ignore */ }
  current = saved === "ko" || saved === "ja" || saved === "en" ? saved : ipDefault;
}

type Entry = { ko: string; ja: string; en: string };
const D: Record<string, Entry> = {
  "lang.label": { ko: "언어", ja: "言語", en: "Language" },
  // login
  "login.tab.login": { ko: "로그인", ja: "ログイン", en: "Log in" },
  "login.tab.register": { ko: "회원가입", ja: "新規登録", en: "Sign up" },
  "login.sub.login": { ko: "이메일로 로그인하세요.", ja: "メールでログインしてください。", en: "Log in with your email." },
  "login.sub.register": { ko: "이메일과 비밀번호만으로 가입할 수 있습니다.", ja: "メールとパスワードだけで登録できます。", en: "All you need is an email and a password." },
  "login.email": { ko: "이메일", ja: "メールアドレス", en: "Email" },
  "login.password": { ko: "비밀번호", ja: "パスワード", en: "Password" },
  "login.processing": { ko: "처리 중…", ja: "処理中…", en: "Working…" },
  "login.err.email": { ko: "올바른 이메일을 입력하세요.", ja: "正しいメールアドレスを入力してください。", en: "Please enter a valid email." },
  "login.err.pw": { ko: "비밀번호는 6자 이상이어야 합니다.", ja: "パスワードは6文字以上にしてください。", en: "Password must be at least 6 characters." },
  "login.err.generic": { ko: "오류가 발생했습니다.", ja: "エラーが発生しました。", en: "Something went wrong." },
  "login.or": { ko: "또는", ja: "または", en: "or" },
  "login.google": { ko: "Google로 계속하기", ja: "Googleで続行", en: "Continue with Google" },
  // home
  "home.welcome": { ko: "환영합니다", ja: "ようこそ", en: "Welcome" },
  "home.online.title": { ko: "랜덤 온라인 대전", ja: "ランダムオンライン対戦", en: "Random Online Match" },
  "home.online.desc": { ko: "실시간으로 다른 플레이어와 매칭됩니다.", ja: "リアルタイムで他のプレイヤーとマッチングします。", en: "Get matched with another player in real time." },
  "home.bot.title": { ko: "BOT 대전", ja: "BOT対戦", en: "VS Bot" },
  "home.bot.desc": { ko: "AI 상대로 바로 연습합니다.", ja: "AI相手にすぐ練習できます。", en: "Practice against the AI right away." },
  "home.tutorial.title": { ko: "튜토리얼", ja: "チュートリアル", en: "Tutorial" },
  "home.tutorial.desc": { ko: "게임 방법을 한눈에 알아보세요.", ja: "ゲームの遊び方をひと目で。", en: "Learn how to play at a glance." },
  "home.cards.title": { ko: "카드 리스트", ja: "カードリスト", en: "Card Gallery" },
  "home.cards.desc": { ko: "모든 카드를 한눈에 둘러보세요.", ja: "すべてのカードを一覧で。", en: "Browse every card in the game." },
  "home.ranked.title": { ko: "랭크 대전", ja: "ランク対戦", en: "Ranked Match" },
  "home.ranked.desc": { ko: "티어를 걸고 시즌 래더에 도전하세요.", ja: "ティアを懸けてシーズンラダーに挑戦。", en: "Climb the seasonal ladder." },
  "home.lb.title": { ko: "리더보드", ja: "リーダーボード", en: "Leaderboard" },
  "home.lb.desc": { ko: "이번 시즌 상위 랭커를 확인하세요.", ja: "今シーズンの上位ランカーを確認。", en: "See this season's top players." },
  // card list / gallery
  "cards.title": { ko: "카드 리스트", ja: "カードリスト", en: "Card Gallery" },
  "cards.back": { ko: "뒤로", ja: "戻る", en: "Back" },
  "cards.search": { ko: "이름 검색…", ja: "名前で検索…", en: "Search by name…" },
  "cards.count": { ko: "장", ja: "枚", en: " cards" },
  "cards.empty": { ko: "조건에 맞는 카드가 없습니다.", ja: "条件に合うカードがありません。", en: "No cards match the filters." },
  "cards.hint": { ko: "카드를 누르면 크게 볼 수 있어요.", ja: "カードをタップで拡大できます。", en: "Tap a card to enlarge it." },
  "cards.f.all": { ko: "전체", ja: "すべて", en: "All" },
  "cards.f.mon": { ko: "몬스터", ja: "モンスター", en: "Monsters" },
  "cards.f.spell": { ko: "마법", ja: "魔法", en: "Spells" },
  "cards.f.trap": { ko: "함정", ja: "罠", en: "Traps" },
  "cards.f.starter": { ko: "스타터", ja: "スターター", en: "Starters" },
  "cards.cost.all": { ko: "코스트 전체", ja: "コスト全部", en: "Any cost" },
  "tutorial.title": { ko: "게임 방법", ja: "ゲームの遊び方", en: "How to Play" },
  "tutorial.back": { ko: "뒤로", ja: "戻る", en: "Back" },
  "tutorial.start": { ko: "BOT으로 바로 해보기", ja: "BOTで早速プレイ", en: "Try it vs the Bot" },
  "home.record": { ko: "전적", ja: "戦績", en: "Record" },
  "home.win": { ko: "승", ja: "勝", en: "W" },
  "home.loss": { ko: "패", ja: "敗", en: "L" },
  "home.logout": { ko: "로그아웃", ja: "ログアウト", en: "Log out" },
  // lobby
  "lobby.searching": { ko: "상대를 찾는 중…", ja: "対戦相手を探しています…", en: "Looking for an opponent…" },
  "lobby.entered": { ko: "매칭 대기열에 입장했습니다.", ja: "マッチング待機列に入りました。", en: "Joined the matchmaking queue." },
  "lobby.found": { ko: "상대를 찾았습니다!", ja: "相手が見つかりました！", en: "Opponent found!" },
  "lobby.fail": { ko: "매칭 실패", ja: "マッチング失敗", en: "Matchmaking failed" },
  "lobby.connerr": { ko: "연결 오류", ja: "接続エラー", en: "Connection error" },
  "lobby.connerr.desc": { ko: "서버에 연결할 수 없습니다.", ja: "サーバーに接続できません。", en: "Could not connect to the server." },
  "lobby.ranked": { ko: "랭크 매칭 중…", ja: "ランクマッチング中…", en: "Ranked matchmaking…" },
  // leaderboard
  "lb.title": { ko: "시즌 리더보드", ja: "シーズンリーダーボード", en: "Season Leaderboard" },
  "lb.season": { ko: "시즌", ja: "シーズン", en: "Season" },
  "lb.empty": { ko: "아직 이번 시즌 랭크 기록이 없습니다.", ja: "今シーズンのランク記録はまだありません。", en: "No ranked games this season yet." },
  "lb.myrank": { ko: "내 순위", ja: "自分の順位", en: "My rank" },
  "common.back": { ko: "뒤로", ja: "戻る", en: "Back" },
  // game
  "game.turn": { ko: "턴", ja: "ターン", en: "Turn" },
  "game.hp": { ko: "체력", ja: "体力", en: "HP" },
  "game.mana": { ko: "마나", ja: "マナ", en: "Mana" },
  "game.deck": { ko: "덱", ja: "デッキ", en: "Deck" },
  "game.discard": { ko: "버림", ja: "捨て札", en: "Discard" },
  "game.std": { ko: "고정", ja: "固定", en: "Market" },
  "game.std.meta": { ko: "매 게임 랜덤 · 1~4 마나", ja: "毎ゲームランダム · 1~4マナ", en: "Random each game · 1-4 mana" },
  "game.supply": { ko: "제시", ja: "提示", en: "Offer" },
  "game.supply.opp": { ko: "상대 제시", ja: "相手の提示", en: "Opponent's offer" },
  "game.refresh.suffix": { ko: "매 턴 갱신", ja: "毎ターン更新", en: "refreshes each turn" },
  "game.endturn": { ko: "턴 종료 ▸", ja: "ターン終了 ▸", en: "End Turn ▸" },
  "game.log": { ko: "로그", ja: "ログ", en: "Log" },
  "game.surrender": { ko: "기권", ja: "降参", en: "Surrender" },
  "game.myturn": { ko: "내 차례", ja: "自分のターン", en: "Your turn" },
  "game.waiting": { ko: "대기", ja: "待機", en: "Waiting" },
  // modals
  "modal.win": { ko: "승리", ja: "勝利", en: "Victory" },
  "modal.lose": { ko: "패배", ja: "敗北", en: "Defeat" },
  "modal.gameover": { ko: "LORE · 게임 종료", ja: "LORE · ゲーム終了", en: "LORE · Game Over" },
  "modal.again": { ko: "다시 하기", ja: "もう一度", en: "Play Again" },
  "modal.home": { ko: "홈으로", ja: "ホームへ", en: "Home" },
  "modal.hp.me": { ko: "내 체력", ja: "自分 体力", en: "Your HP" },
  "modal.hp.opp": { ko: "상대 체력", ja: "相手 体力", en: "Opponent HP" },
  "treasure.title": { ko: "보물상자", ja: "宝箱", en: "Treasure Chest" },
  "treasure.get": { ko: "받기", ja: "受け取る", en: "Claim" },
  "surrender.title": { ko: "기권", ja: "降参", en: "Surrender" },
  "surrender.body": { ko: "정말 기권하시겠습니까?", ja: "本当に降参しますか？", en: "Really surrender?" },
  "common.yes": { ko: "YES", ja: "はい", en: "Yes" },
  "common.no": { ko: "NO", ja: "いいえ", en: "No" },
  "common.cancel": { ko: "취소", ja: "キャンセル", en: "Cancel" },
  "common.confirm": { ko: "확인", ja: "確認", en: "OK" },
  "notice.disc.title": { ko: "연결 끊김", ja: "接続切断", en: "Disconnected" },
  "notice.disc.body": { ko: "상대 또는 서버와의 연결이 끊어졌습니다.", ja: "相手またはサーバーとの接続が切れました。", en: "Lost connection to the opponent or the server." },
  "deck.view": { ko: "덱 구성", ja: "デッキ構成", en: "Deck" },
  "deck.removed": { ko: "제외", ja: "除外", en: "Exiled" },
  "net.reconnecting": { ko: "연결이 끊겨 재접속 중입니다…", ja: "接続が切れたため再接続中です…", en: "Connection lost — reconnecting…" },
  "net.oppwait": { ko: "상대의 연결이 끊겼습니다. 최대 30초간 기다립니다…", ja: "相手の接続が切れました。最大30秒待ちます…", en: "Opponent disconnected — waiting up to 30s…" },
  "tribe.suffix": { ko: "종족", ja: "種族", en: "tribe" },
  "tribe.footer": { ko: "동족을 필드에 모으면 발동 · 게임당 각 1회", ja: "同じ種族を場に揃えると発動 · 1ゲームに各1回", en: "Triggers when tribe members share your field · once per game each" },
};

export function t(key: string): string {
  const e = D[key];
  return e ? e[current] : key;
}
export function cardName(c: CardInst): string {
  if (current === "ja" && c.nameJa) return c.nameJa;
  if (current === "en" && c.nameEn) return c.nameEn;
  return c.name;
}
export function cardText(c: CardInst): string {
  if (current === "ja" && c.textJa) return c.textJa;
  if (current === "en" && c.textEn) return c.textEn;
  return c.text;
}
