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
  "login.forgot": { ko: "비밀번호를 잊으셨나요?", ja: "パスワードをお忘れですか？", en: "Forgot your password?" },
  "login.forgot.sub": { ko: "가입한 이메일을 입력하면 재설정 링크를 보내드립니다.", ja: "登録したメールアドレスに再設定リンクを送ります。", en: "Enter your email and we'll send a reset link." },
  "login.forgot.submit": { ko: "재설정 링크 받기", ja: "再設定リンクを送る", en: "Send reset link" },
  "login.forgot.sent": { ko: "재설정 메일을 보냈습니다. 받은편지함을 확인하세요.", ja: "再設定メールを送りました。受信トレイをご確認ください。", en: "Reset email sent — check your inbox." },
  "login.reset.sub": { ko: "새 비밀번호를 입력하세요.", ja: "新しいパスワードを入力してください。", en: "Enter your new password." },
  "login.reset.newpw": { ko: "새 비밀번호", ja: "新しいパスワード", en: "New password" },
  "login.reset.submit": { ko: "비밀번호 변경", ja: "パスワードを変更", en: "Change password" },
  "login.reset.done": { ko: "비밀번호가 변경되었습니다. 로그인하세요.", ja: "パスワードを変更しました。ログインしてください。", en: "Password changed — please log in." },
  "login.verify.sent": { ko: "인증 메일을 보냈습니다. 받은편지함에서 링크를 눌러 가입을 완료하세요.", ja: "認証メールを送りました。受信トレイのリンクを押して登録を完了してください。", en: "Verification email sent — click the link in your inbox to finish signing up." },
  "login.verify.needed": { ko: "이메일 인증이 필요합니다.", ja: "メール認証が必要です。", en: "Email verification required." },
  "login.verify.resend": { ko: "인증 메일 재발송", ja: "認証メールを再送", en: "Resend verification email" },
  "login.verify.resent": { ko: "인증 메일을 다시 보냈습니다.", ja: "認証メールを再送しました。", en: "Verification email resent." },
  "login.verified": { ko: "이메일 인증 완료! 이제 로그인하세요.", ja: "メール認証が完了しました！ログインしてください。", en: "Email verified — you can log in now." },
  "login.back": { ko: "로그인으로 돌아가기", ja: "ログインに戻る", en: "Back to login" },
  "login.help": { ko: "로그인이 안 되나요?", ja: "ログインできませんか？", en: "Can't log in?" },
  "login.help.reset": { ko: "등록한 이메일로 비밀번호 재설정", ja: "登録メールでパスワードを再設定", en: "Reset password via your email" },
  "login.help.mail": { ko: "이메일로 문의하기", ja: "メールで問い合わせる", en: "Contact us by email" },
  "login.help.discord": { ko: "공식 디스코드에서 문의하기", ja: "公式Discordで問い合わせる", en: "Ask in our official Discord" },
  // invite campaign
  "invite.title": { ko: "친구 초대 이벤트", ja: "友達招待イベント", en: "Invite Friends" },
  "invite.desc": { ko: "친구가 골드 달성 시 서로 1,000크레딧! (최대 3명)", ja: "友達がゴールド到達で互いに1,000クレジット！(最大3人)", en: "You both get 1,000 credits when your friend hits Gold! (up to 3)" },
  "invite.link": { ko: "내 초대 링크", ja: "自分の招待リンク", en: "Your invite link" },
  "invite.copy": { ko: "복사", ja: "コピー", en: "Copy" },
  "invite.copied": { ko: "복사됨!", ja: "コピーしました！", en: "Copied!" },
  "invite.status.pending": { ko: "골드 도전 중", ja: "ゴールド挑戦中", en: "Climbing to Gold" },
  "invite.status.earned": { ko: "달성! 보상 대기", ja: "達成！報酬待ち", en: "Earned — reward pending" },
  "invite.status.paid": { ko: "지급 완료", ja: "付与済み", en: "Paid" },
  "invite.empty": { ko: "아직 초대한 친구가 없습니다.", ja: "まだ招待した友達がいません。", en: "No invites yet." },
  "invite.note": { ko: "크레딧은 크레딧 시스템 오픈 시 일괄 지급됩니다.", ja: "クレジットはクレジットシステム公開時にまとめて付与されます。", en: "Credits are granted when the credit system launches." },
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
  // interactive tutorial (step-by-step, credit rewards)
  "tutorial.inter.title": { ko: "인터랙티브 튜토리얼", ja: "インタラクティブチュートリアル", en: "Interactive Tutorial" },
  "tutorial.inter.desc": { ko: "실제 게임 화면에서 단계별로 배워요. 단계를 클리어할 때마다 크레딧을 드립니다!", ja: "実際のゲーム画面でステップごとに学べます。ステップクリアごとにクレジットがもらえます！", en: "Learn step by step on the real board. Earn credits for every step you clear!" },
  "tutorial.inter.start": { ko: "시작하기", ja: "はじめる", en: "Start" },
  "tutorial.inter.done": { ko: "획득 완료", ja: "獲得済み", en: "Claimed" },
  "tutorial.rules": { ko: "규칙 레퍼런스", ja: "ルールリファレンス", en: "Rule Reference" },
  "tut.ok": { ko: "확인했어요", ja: "わかった", en: "Got it" },
  "tut.exit": { ko: "나가기", ja: "退出", en: "Exit" },
  "tut.toast.done": { ko: "단계 완료!", ja: "ステップクリア！", en: "Step complete!" },
  "tut.complete.detail": { ko: "튜토리얼 완료! 이번에 얻은 크레딧: {n} 💎", ja: "チュートリアル完了！今回獲得したクレジット: {n} 💎", en: "Tutorial complete! Credits earned this run: {n} 💎" },
  "tut.s1.title": { ko: "화면 살펴보기", ja: "画面を見てみよう", en: "Meet the Board" },
  "tut.s1.body": { ko: "위쪽이 <b>상대</b>, 아래쪽이 <b>나</b>입니다. 내 턴이 오면 <b>마나가 최대치까지</b> 차고 카드를 <b>3장 드로우</b>해요. 목표는 상대 <b>체력을 0</b>으로 만드는 것!", ja: "上が<b>相手</b>、下が<b>自分</b>です。自分のターンが来ると<b>マナが最大まで</b>回復し、カードを<b>3枚ドロー</b>します。目標は相手の<b>体力を0</b>にすること！", en: "Top is your <b>opponent</b>, bottom is <b>you</b>. Each turn your <b>mana refills</b> and you <b>draw 3 cards</b>. The goal: drop the opponent's <b>HP to 0</b>!" },
  "tut.s2.title": { ko: "카드 구매", ja: "カード購入", en: "Buy a Card" },
  "tut.s2.body": { ko: "가운데 <b>마켓</b>에서 마나로 카드를 사서 덱을 키웁니다. 산 카드는 <b>묘지</b>로 갔다가 덱이 떨어지면 섞여 들어와요. 아무 카드나 <b>1장 구매</b>해보세요!", ja: "中央の<b>マーケット</b>でマナを使いカードを買ってデッキを強化します。買ったカードは<b>墓地</b>へ行き、デッキが尽きると混ざって戻ります。どれでも<b>1枚購入</b>してみましょう！", en: "Spend mana in the central <b>market</b> to grow your deck. Purchases go to your <b>graveyard</b> and shuffle back in later. Try <b>buying any card</b>!" },
  "tut.s3.title": { ko: "몬스터 소환", ja: "モンスター召喚", en: "Summon a Monster" },
  "tut.s3.body": { ko: "손패에 <b>몬스터 카드</b>를 넣어드렸어요. 카드를 눌러 필드에 <b>소환</b>해보세요. 몬스터가 공격과 수비를 담당합니다.", ja: "手札に<b>モンスターカード</b>を入れておきました。カードを押して場に<b>召喚</b>してみましょう。モンスターが攻守の要です。", en: "We slipped a <b>monster card</b> into your hand. Tap it to <b>summon</b> it — monsters do your fighting." },
  "tut.s4.title": { ko: "공격", ja: "攻撃", en: "Attack" },
  "tut.s4.body": { ko: "필드의 <b>몬스터를 눌러</b> 상대를 공격하세요. 상대 필드가 비어 있으면 <b>체력을 직접</b> 때립니다. 몬스터는 턴마다 한 번만 공격할 수 있어요.", ja: "場の<b>モンスターを押して</b>相手を攻撃しましょう。相手の場が空なら<b>体力を直接</b>攻撃します。モンスターは1ターンに1回だけ攻撃できます。", en: "Tap your <b>field monster</b> to attack. With no enemy monsters, you hit their <b>HP directly</b>. Each monster attacks once per turn." },
  "tut.s5.title": { ko: "함정", ja: "罠", en: "Traps" },
  "tut.s5.p0": { ko: "<b>함정 카드</b>를 드렸어요. 함정은 <b>비공개로 세트</b>되고 조건이 맞으면 자동 발동합니다. 카드를 눌러 <b>세트</b>해보세요.", ja: "<b>罠カード</b>を渡しました。罠は<b>非公開でセット</b>され、条件が合うと自動発動します。カードを押して<b>セット</b>してみましょう。", en: "Here's a <b>trap card</b>. Traps are <b>set face-down</b> and fire automatically. Tap it to <b>set</b> it." },
  "tut.s5.p1": { ko: "좋아요! 이제 <b>턴을 종료</b>하고 상대의 공격을 지켜보세요. 함정이 당신을 지켜줄 거예요…", ja: "いいですね！では<b>ターンを終了</b>して相手の攻撃を見てみましょう。罠が守ってくれるはず…", en: "Nice! Now <b>end your turn</b> and watch the opponent attack. Your trap has you covered…" },
  "tut.s6.title": { ko: "승리", ja: "勝利", en: "Victory" },
  "tut.s6.body": { ko: "함정이 상대 몬스터를 처리했습니다! 상대 체력이 <b>거의 남지 않았어요</b>. 몬스터로 <b>직접 공격</b>해서 마무리하세요!", ja: "罠が相手モンスターを処理しました！相手の体力は<b>残りわずか</b>。モンスターで<b>直接攻撃</b>してとどめを！", en: "Your trap dealt with their monster! The opponent is <b>nearly defeated</b> — <b>attack directly</b> to finish them!" },
  "home.credits": { ko: "크레딧", ja: "クレジット", en: "Credits" },
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
  "game.discard": { ko: "묘지", ja: "墓地", en: "Graveyard" },
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
  "modal.draw": { ko: "무승부", ja: "引き分け", en: "Draw" },
  "modal.draw.body": { ko: "75턴이 지나 게임이 무승부로 끝났습니다.", ja: "75ターン経過でゲームは引き分けになりました。", en: "The game reached turn 75 and ended in a draw." },
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
  // in-game FX / event playback
  "fx.trap": { ko: "함정 발동!", ja: "罠発動！", en: "Trap Activated!" },
  "fx.destroyed": { ko: "파괴!", ja: "破壊！", en: "Destroyed!" },
  "fx.mana": { ko: "최대 마나", ja: "最大マナ", en: "Max Mana" },
  "fx.maxhp": { ko: "최대 체력", ja: "最大体力", en: "Max HP" },
  "fx.opp": { ko: "상대", ja: "相手", en: "Opponent" },
  "fx.roll": { ko: "결과", ja: "結果", en: "Result" },
  "death.cause": { ko: "원인", ja: "原因", en: "Cause" },
  "modal.review": { ko: "로그 보기 (복기)", ja: "ログを見る (振り返り)", en: "Review Log" },
  "modal.result": { ko: "결과 보기", ja: "結果を見る", en: "Show Result" },
  // home entries
  "home.profile.title": { ko: "프로필", ja: "プロフィール", en: "Profile" },
  "home.profile.desc": { ko: "이름·아바타·뱃지·전적을 관리하세요.", ja: "名前・アバター・バッジ・戦績を管理。", en: "Manage your name, avatar, badge and record." },
  "home.friends.title": { ko: "친구", ja: "フレンド", en: "Friends" },
  "home.friends.desc": { ko: "친구를 추가하고 친선전을 즐기세요.", ja: "友達を追加して親善戦を楽しもう。", en: "Add friends and play friendly matches." },
  "home.settings": { ko: "설정", ja: "設定", en: "Settings" },
  // profile
  "profile.title": { ko: "프로필", ja: "プロフィール", en: "Profile" },
  "profile.rename": { ko: "이름 변경", ja: "名前を変更", en: "Rename" },
  "profile.rename.ph": { ko: "새 이름 (2~24자)", ja: "新しい名前 (2~24字)", en: "New name (2-24 chars)" },
  "profile.avatar": { ko: "아바타 변경", ja: "アバターを変更", en: "Change Avatar" },
  "profile.avatar.pick": { ko: "아바타 선택", ja: "アバターを選択", en: "Pick an Avatar" },
  "profile.badge": { ko: "뱃지", ja: "バッジ", en: "Badges" },
  "profile.badge.none": { ko: "장착한 뱃지 없음", ja: "装着バッジなし", en: "No badge equipped" },
  "profile.badge.equip": { ko: "장착", ja: "装着", en: "Equip" },
  "profile.badge.unequip": { ko: "해제", ja: "外す", en: "Unequip" },
  "profile.badge.locked": { ko: "미보유 — 조건을 달성하면 열립니다", ja: "未所持 — 条件達成で解放", en: "Locked — earn it in game" },
  "profile.stats": { ko: "전적", ja: "戦績", en: "Record" },
  "profile.winrate": { ko: "승률", ja: "勝率", en: "Win rate" },
  "profile.recent": { ko: "최근 대전", ja: "最近の対戦", en: "Recent Matches" },
  "profile.recent.empty": { ko: "아직 대전 기록이 없습니다.", ja: "まだ対戦記録がありません。", en: "No matches yet." },
  "profile.private": { ko: "비공개 프로필입니다.", ja: "非公開プロフィールです。", en: "This profile is private." },
  "profile.saved": { ko: "저장됨!", ja: "保存しました！", en: "Saved!" },
  "profile.turns": { ko: "턴", ja: "ターン", en: "T" },
  "mode.ranked": { ko: "랭크", ja: "ランク", en: "Ranked" },
  "mode.online": { ko: "온라인", ja: "オンライン", en: "Online" },
  "mode.bot": { ko: "봇", ja: "BOT", en: "Bot" },
  // friends
  "friends.title": { ko: "친구", ja: "フレンド", en: "Friends" },
  "friends.add": { ko: "친구 추가", ja: "友達を追加", en: "Add Friend" },
  "friends.add.ph": { ko: "닉네임 또는 이메일", ja: "ニックネームまたはメール", en: "Nickname or email" },
  "friends.add.sent": { ko: "요청을 보냈습니다!", ja: "リクエストを送りました！", en: "Request sent!" },
  "friends.incoming": { ko: "받은 요청", ja: "受信リクエスト", en: "Incoming Requests" },
  "friends.outgoing": { ko: "보낸 요청", ja: "送信リクエスト", en: "Sent Requests" },
  "friends.empty": { ko: "아직 친구가 없습니다. 닉네임으로 친구를 추가해보세요!", ja: "まだ友達がいません。ニックネームで追加してみましょう！", en: "No friends yet — add one by nickname!" },
  "friends.online": { ko: "온라인", ja: "オンライン", en: "Online" },
  "friends.offline": { ko: "오프라인", ja: "オフライン", en: "Offline" },
  "friends.ingame": { ko: "게임 중", ja: "ゲーム中", en: "In game" },
  "friends.accept": { ko: "수락", ja: "承認", en: "Accept" },
  "friends.decline": { ko: "거절", ja: "拒否", en: "Decline" },
  "friends.remove": { ko: "삭제", ja: "削除", en: "Remove" },
  "friends.remove.confirm": { ko: "친구를 삭제할까요?", ja: "友達を削除しますか？", en: "Remove this friend?" },
  "friends.challenge": { ko: "대전 신청", ja: "対戦申請", en: "Challenge" },
  "friends.challenge.waiting": { ko: "상대의 응답을 기다리는 중…", ja: "相手の応答を待っています…", en: "Waiting for a response…" },
  "friends.challenge.expired": { ko: "응답이 없어 만료되었습니다.", ja: "応答がなく期限切れになりました。", en: "No response — the challenge expired." },
  "friends.challenge.declined": { ko: "상대가 거절했습니다.", ja: "相手が断りました。", en: "They declined." },
  "friends.challenge.from": { ko: "님의 대전 신청!", ja: "さんから対戦申請！", en: " sent you a challenge!" },
  "friends.challenge.body": { ko: "수락하면 바로 친선전이 시작됩니다.", ja: "承認するとすぐ親善戦が始まります。", en: "Accept to start a friendly match right away." },
  "friends.profile": { ko: "프로필", ja: "プロフィール", en: "Profile" },
  // settings
  "settings.title": { ko: "설정", ja: "設定", en: "Settings" },
  "settings.sound": { ko: "효과음", ja: "効果音", en: "Sound Effects" },
  "settings.sound.volume": { ko: "효과음 볼륨", ja: "効果音の音量", en: "SFX volume" },
  "settings.sound.test": { ko: "테스트", ja: "テスト", en: "Test" },
  "settings.privacy": { ko: "프로필 공개", ja: "プロフィール公開", en: "Profile Visibility" },
  "settings.privacy.public": { ko: "전적 공개", ja: "戦績を公開", en: "Public record" },
  "settings.privacy.desc": { ko: "끄면 다른 유저에게 전적·티어가 보이지 않습니다.", ja: "オフにすると他のユーザーに戦績・ティアが表示されません。", en: "When off, other players can't see your record or tier." },
  "settings.coupon": { ko: "쿠폰 코드", ja: "クーポンコード", en: "Coupon Code" },
  "settings.coupon.ph": { ko: "코드 입력", ja: "コードを入力", en: "Enter code" },
  "settings.coupon.apply": { ko: "적용", ja: "適用", en: "Redeem" },
  "settings.coupon.ok": { ko: "쿠폰 적용 완료!", ja: "クーポン適用完了！", en: "Coupon redeemed!" },
  "settings.billing": { ko: "결제 / 구독", ja: "決済 / サブスク", en: "Billing" },
  "settings.billing.credits": { ko: "보유 크레딧", ja: "所持クレジット", en: "Credits" },
  "settings.billing.sub": { ko: "구독 상태", ja: "サブスク状態", en: "Subscription" },
  "settings.billing.none": { ko: "구독 중이 아닙니다", ja: "未加入", en: "Not subscribed" },
  "settings.billing.plan": { ko: "$7/월 — 모든 광고 제거 + 매월 1,000크레딧 + 매일 가챠 5회", ja: "$7/月 — 全広告除去 + 毎月1,000クレジット + 毎日ガチャ5回", en: "$7/mo — no ads + 1,000 credits monthly + 5 daily gacha rolls" },
  "settings.billing.soon": { ko: "결제 시스템 준비 중입니다. 곧 만나요!", ja: "決済システムは準備中です。お楽しみに！", en: "Payments are coming soon — stay tuned!" },
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
