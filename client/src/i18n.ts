// ============================================================
// LORE — i18n (Korean / Japanese). UI strings + card name/text helpers.
// Language is persisted in localStorage; default decided by IP (JP→ja).
// ============================================================
import type { CardInst } from "./shared/types";

export type Lang = "ko" | "ja";
let current: Lang = "ko";
const listeners = new Set<() => void>();

export function getLang(): Lang { return current; }
export function onLangChange(fn: () => void): () => void { listeners.add(fn); return () => listeners.delete(fn); }
export function setLang(l: Lang): void {
  if (l === current) return;
  current = l;
  try { localStorage.setItem("lore_lang", l); } catch { /* ignore */ }
  listeners.forEach((f) => f());
}
/** Pick saved language, else the IP-based default. */
export function initLang(ipDefault: Lang): void {
  let saved: string | null = null;
  try { saved = localStorage.getItem("lore_lang"); } catch { /* ignore */ }
  current = saved === "ko" || saved === "ja" ? saved : ipDefault;
}

type Entry = { ko: string; ja: string };
const D: Record<string, Entry> = {
  "lang.label": { ko: "언어", ja: "言語" },
  // login
  "login.tab.login": { ko: "로그인", ja: "ログイン" },
  "login.tab.register": { ko: "회원가입", ja: "新規登録" },
  "login.sub.login": { ko: "이메일로 로그인하세요.", ja: "メールでログインしてください。" },
  "login.sub.register": { ko: "이메일과 비밀번호만으로 가입할 수 있습니다.", ja: "メールとパスワードだけで登録できます。" },
  "login.email": { ko: "이메일", ja: "メールアドレス" },
  "login.password": { ko: "비밀번호", ja: "パスワード" },
  "login.processing": { ko: "처리 중…", ja: "処理中…" },
  "login.err.email": { ko: "올바른 이메일을 입력하세요.", ja: "正しいメールアドレスを入力してください。" },
  "login.err.pw": { ko: "비밀번호는 6자 이상이어야 합니다.", ja: "パスワードは6文字以上にしてください。" },
  "login.err.generic": { ko: "오류가 발생했습니다.", ja: "エラーが発生しました。" },
  // home
  "home.welcome": { ko: "환영합니다", ja: "ようこそ" },
  "home.online.title": { ko: "랜덤 온라인 대전", ja: "ランダムオンライン対戦" },
  "home.online.desc": { ko: "실시간으로 다른 플레이어와 매칭됩니다.", ja: "リアルタイムで他のプレイヤーとマッチングします。" },
  "home.bot.title": { ko: "BOT 대전", ja: "BOT対戦" },
  "home.bot.desc": { ko: "AI 상대로 바로 연습합니다.", ja: "AI相手にすぐ練習できます。" },
  "home.record": { ko: "전적", ja: "戦績" },
  "home.win": { ko: "승", ja: "勝" },
  "home.loss": { ko: "패", ja: "敗" },
  "home.logout": { ko: "로그아웃", ja: "ログアウト" },
  // lobby
  "lobby.searching": { ko: "상대를 찾는 중…", ja: "対戦相手を探しています…" },
  "lobby.entered": { ko: "매칭 대기열에 입장했습니다.", ja: "マッチング待機列に入りました。" },
  "lobby.found": { ko: "상대를 찾았습니다!", ja: "相手が見つかりました！" },
  "lobby.fail": { ko: "매칭 실패", ja: "マッチング失敗" },
  "lobby.connerr": { ko: "연결 오류", ja: "接続エラー" },
  "lobby.connerr.desc": { ko: "서버에 연결할 수 없습니다.", ja: "サーバーに接続できません。" },
  // game
  "game.turn": { ko: "턴", ja: "ターン" },
  "game.hp": { ko: "체력", ja: "体力" },
  "game.mana": { ko: "마나", ja: "マナ" },
  "game.deck": { ko: "덱", ja: "デッキ" },
  "game.discard": { ko: "버림", ja: "捨て札" },
  "game.std": { ko: "고정", ja: "固定" },
  "game.std.meta": { ko: "매 게임 랜덤 · 1~4 마나", ja: "毎ゲームランダム · 1~4マナ" },
  "game.supply": { ko: "제시", ja: "提示" },
  "game.supply.opp": { ko: "상대 제시", ja: "相手の提示" },
  "game.refresh.suffix": { ko: "매 턴 갱신", ja: "毎ターン更新" },
  "game.endturn": { ko: "턴 종료 ▸", ja: "ターン終了 ▸" },
  "game.log": { ko: "로그", ja: "ログ" },
  "game.surrender": { ko: "기권", ja: "降参" },
  "game.myturn": { ko: "내 차례", ja: "自分のターン" },
  "game.waiting": { ko: "대기", ja: "待機" },
  // modals
  "modal.win": { ko: "승리", ja: "勝利" },
  "modal.lose": { ko: "패배", ja: "敗北" },
  "modal.gameover": { ko: "LORE · 게임 종료", ja: "LORE · ゲーム終了" },
  "modal.again": { ko: "다시 하기", ja: "もう一度" },
  "modal.home": { ko: "홈으로", ja: "ホームへ" },
  "modal.hp.me": { ko: "내 체력", ja: "自分 体力" },
  "modal.hp.opp": { ko: "상대 체력", ja: "相手 体力" },
  "treasure.title": { ko: "보물상자", ja: "宝箱" },
  "treasure.get": { ko: "받기", ja: "受け取る" },
  "surrender.title": { ko: "기권", ja: "降参" },
  "surrender.body": { ko: "정말 기권하시겠습니까?", ja: "本当に降参しますか？" },
  "common.yes": { ko: "YES", ja: "はい" },
  "common.no": { ko: "NO", ja: "いいえ" },
  "common.cancel": { ko: "취소", ja: "キャンセル" },
  "common.confirm": { ko: "확인", ja: "確認" },
  "notice.disc.title": { ko: "연결 끊김", ja: "接続切断" },
  "notice.disc.body": { ko: "상대 또는 서버와의 연결이 끊어졌습니다.", ja: "相手またはサーバーとの接続が切れました。" },
  "tribe.suffix": { ko: "종족", ja: "種族" },
  "tribe.footer": { ko: "동족을 필드에 모으면 발동 · 게임당 각 1회", ja: "同じ種族を場に揃えると発動 · 1ゲームに各1回" },
};

export function t(key: string): string {
  const e = D[key];
  return e ? e[current] : key;
}
export function cardName(c: CardInst): string {
  return current === "ja" && c.nameJa ? c.nameJa : c.name;
}
export function cardText(c: CardInst): string {
  return current === "ja" && c.textJa ? c.textJa : c.text;
}
