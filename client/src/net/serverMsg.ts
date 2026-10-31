// ============================================================
// LORE — server error message localizer. The Worker returns error
// error codes or legacy sentences; screens display them in alerts and
// inline forms. This maps each known message to
// ja/en at the API boundary so every screen stays language-pure.
// Unknown errors use localized recovery copy, never foreign server text.
// ============================================================
import { getLang } from "../i18n";

const M: Record<string, { ja: string; en: string; ko?:string }> = {
  "daily quest is not ready to claim": {ja:"このデイリークエストは、まだ報酬を受け取れる状態ではありません。",en:"This daily quest is not ready to claim yet.",ko:"아직 이 일일 퀘스트의 보상을 받을 수 없습니다."},
  "unauthorized": {"ja": "アクセス権限がありません。", "en": "You do not have permission to access this.", "ko": "접근 권한이 없습니다."},
  "not found": {"ja": "対象が見つかりません。", "en": "The requested item was not found.", "ko": "요청한 항목을 찾을 수 없습니다."},
  "invalid tutorial purchase": {"ja": "チュートリアルの案内に沿って購入してください。", "en": "Follow the tutorial instructions for this purchase.", "ko": "튜토리얼 안내에 따라 구매해 주세요."},
  "reserved request": {"ja": "チュートリアル専用の操作です。案内から進めてください。", "en": "This action is reserved for the tutorial. Follow its instructions.", "ko": "튜토리얼 전용 작업입니다. 안내에 따라 진행해 주세요."},
  "invalid gift": {"ja": "このプレゼントは受け取れません。", "en": "This gift cannot be claimed.", "ko": "이 선물은 받을 수 없습니다."},
  "unknown recipient": {"ja": "受取人が見つかりません。", "en": "The recipient was not found.", "ko": "받는 사람을 찾을 수 없습니다."},
  "gift id already used with different content": {"ja": "同じIDのプレゼントが別の内容で登録済みです。", "en": "A gift with this ID already exists with different contents.", "ko": "같은 ID의 선물이 다른 내용으로 등록되어 있습니다."},
  "maintenance": {"ja": "メンテナンス中です。しばらくしてから再試行してください。", "en": "Maintenance is in progress. Please try again later.", "ko": "점검 중입니다. 잠시 후 다시 시도해 주세요."},
  "invalid difficulty": {"ja": "難易度を選び直してください。", "en": "Please select a valid difficulty.", "ko": "난이도를 다시 선택해 주세요."},
  "제목과 내용을 입력해주세요": {"ja": "件名と内容を入力してください。", "en": "Enter a subject and message.", "ko": "제목과 내용을 입력해 주세요."},
  "잠시 후 다시 시도해주세요": {"ja": "しばらくしてから再試行してください。", "en": "Please try again later.", "ko": "잠시 후 다시 시도해 주세요."},
  "invalid or unowned deck contents": {"ja": "デッキに使用できないカードや未所持のカードが含まれています。", "en": "The deck contains invalid cards or cards you do not own.", "ko": "덱에 사용할 수 없거나 보유하지 않은 카드가 포함되어 있습니다."},
  "transcript too large": {"ja": "対戦記録が長すぎます。", "en": "The duel record is too long.", "ko": "듀얼 기록이 너무 깁니다."},
  "invalid transcript": {"ja": "対戦記録を確認できませんでした。", "en": "The duel record could not be verified.", "ko": "듀얼 기록을 확인할 수 없습니다."},
  "invalid match": {"ja": "対戦情報を確認できませんでした。", "en": "The match could not be verified.", "ko": "대전 정보를 확인할 수 없습니다."},
  "method not allowed": {"ja": "この操作には対応していません。", "en": "This operation is not supported.", "ko": "지원하지 않는 작업입니다."},
  "invalid user": {"ja": "ユーザー情報を確認できませんでした。", "en": "The user could not be verified.", "ko": "사용자 정보를 확인할 수 없습니다."},
  "진행 중인 시즌은 확정할 수 없습니다.": {"ja": "開催中のシーズンは確定できません。", "en": "An ongoing season cannot be finalized.", "ko": "진행 중인 시즌은 확정할 수 없습니다."},
  "invalid room": {"ja": "対戦ルームが無効です。", "en": "This duel room is invalid.", "ko": "유효하지 않은 대전 방입니다."},
  "could not select opponent": {"ja": "対戦相手を選べませんでした。再試行してください。", "en": "Could not select an opponent. Please retry.", "ko": "상대를 선택하지 못했습니다. 다시 시도해 주세요."},
  "could not start duel": {"ja": "デュエルを開始できませんでした。再試行してください。", "en": "Could not start the duel. Please retry.", "ko": "듀얼을 시작하지 못했습니다. 다시 시도해 주세요."},
  "invalid decision": {"ja": "その選択は無効です。選び直してください。", "en": "That choice is invalid. Please choose again.", "ko": "유효하지 않은 선택입니다. 다시 선택해 주세요."},
  "tutorial transcript too large": {"ja": "チュートリアルの操作記録が長すぎます。最初からやり直してください。", "en": "The tutorial action record is too long. Please restart the lesson.", "ko": "튜토리얼 작업 기록이 너무 깁니다. 수업을 다시 시작해 주세요."},
  "lesson not completed": {"ja": "このレッスンはまだ完了していません。", "en": "This lesson is not complete yet.", "ko": "아직 이 수업을 완료하지 않았습니다."},
  "unknown reward": {"ja": "報酬が見つかりません。", "en": "The reward was not found.", "ko": "보상을 찾을 수 없습니다."},
  "legacy reward retired; complete the current tutorial": {"ja": "以前の報酬は終了しました。現在のチュートリアルを完了してください。", "en": "This older reward has ended. Complete the current tutorial.", "ko": "이전 보상은 종료되었습니다. 현재 튜토리얼을 완료해 주세요."},
  "未獲得の勲章は装着できません。": {"ja": "未獲得の勲章は装着できません。", "en": "You cannot equip an honor you have not earned.", "ko": "획득하지 않은 훈장은 장착할 수 없습니다."},
  "未所持の商品です": {"ja": "未所持の商品です。", "en": "You do not own this item.", "ko": "보유하지 않은 상품입니다."},
  "no changes": {"ja": "変更はありません。", "en": "There are no changes.", "ko": "변경 사항이 없습니다."},
  "販売中の商品ではありません": {"ja": "販売中の商品ではありません。", "en": "This item is not for sale.", "ko": "판매 중인 상품이 아닙니다."},
  "bad request": {"ja": "入力内容を確認してください。", "en": "Check your input.", "ko": "입력 내용을 확인해 주세요."},
  "starter not offered today": {"ja": "このカードは本日の商品に含まれていません。", "en": "This card is not offered in today’s shop.", "ko": "오늘 판매하는 카드가 아닙니다."},
  "daily starter limit reached": {"ja": "このカードの本日の購入上限に達しました。", "en": "You have reached today’s purchase limit for this card.", "ko": "이 카드의 오늘 구매 한도에 도달했습니다."},
  "소진되었거나 만료된 쿠폰입니다.": {"ja": "使用上限に達したか、期限切れのクーポンです。", "en": "This coupon is used up or expired.", "ko": "소진되었거나 만료된 쿠폰입니다."},
  "network unavailable": {"ja": "接続できませんでした。通信環境を確認して再試行してください。", "en": "Could not connect. Check your connection and retry.", "ko": "연결할 수 없습니다. 네트워크를 확인하고 다시 시도해 주세요."},
  "unknown error": {"ja": "操作に失敗しました。しばらくしてから再試行してください。", "en": "The operation failed. Please try again later.", "ko": "작업에 실패했습니다. 잠시 후 다시 시도해 주세요."},
  "rate limited": {"ja": "操作が多すぎます。1分ほど待って再試行してください。", "en": "Too many requests. Try again in a minute.", "ko": "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."},
  "invalid request": {"ja": "入力内容を確認してください。", "en": "Check your input.", "ko": "입력 내용을 확인해주세요."},
  "request too large": {"ja": "入力が長すぎます。", "en": "Input is too long.", "ko": "입력 내용이 너무 깁니다."},
  "request timed out": {"ja": "通信がタイムアウトしました。接続を確認して再試行してください。", "en": "Request timed out. Check your connection and retry.", "ko": "요청 시간이 초과되었습니다. 연결을 확인하고 다시 시도해주세요."},
  "challenge changed; retry": {"ja": "対戦申請が更新されました。再試行してください。", "en": "Challenge changed. Please retry.", "ko": "대전 신청이 변경되었습니다. 다시 시도해주세요."},
  "room setup failed; retry": {"ja": "対戦の準備に失敗しました。再試行してください。", "en": "Room setup failed. Please retry.", "ko": "대전 준비에 실패했습니다. 다시 시도해주세요."},
  "not enough shards": {ja:"シャードが不足しています。",en:"Not enough Shards.",ko:"샤드가 부족합니다."},
  "starter limit reached": {ja:"このカードは8枚所持しています。",en:"You already own eight copies.",ko:"이미 8장을 보유하고 있습니다."},
  "unowned deck contents": {ja:"未所持のカード・外観は使用できません。",en:"You cannot use cards or cosmetics you do not own.",ko:"보유하지 않은 카드·외형은 사용할 수 없습니다."},
  "collection busy; retry": {ja:"処理が混み合っています。再試行してください。",en:"Collection busy. Please retry.",ko:"처리가 혼잡합니다. 다시 시도해 주세요."},
  "collection request conflict": {ja:"前の購入結果を確認してから再試行してください。",en:"Check your previous purchase before retrying.",ko:"이전 구매 결과를 확인한 후 다시 시도해 주세요."},
  "invalid username": {ja:"ユーザー名は2〜24文字で、文字・数字・スペース・._-を使ってください。メールアドレスは使えません。",en:"Use 2–24 letters, numbers, spaces, or ._-. Email addresses are not allowed.",ko:"사용자 이름은 2~24자의 문자, 숫자, 공백 또는 ._-를 사용하세요. 이메일 주소는 사용할 수 없어요."},
  "shop refreshed": {ja:"本日の商品が更新されました。ラインナップを確認してください。",en:"The daily shop has refreshed. Check the new lineup.",ko:"오늘의 상품이 갱신되었습니다. 라인업을 확인해 주세요."},
  "complete the preceding tutorial first": {ja:"前のチュートリアルから順番に進めてください。",en:"Complete the preceding tutorial step first.",ko:"앞의 튜토리얼부터 순서대로 진행해 주세요."},
  "basics not completed": {ja:"デュエルの基本の完了を確認できませんでした。もう一度練習してください。",en:"Could not confirm completion of Duel basics. Please replay it.",ko:"듀얼의 기본 완료를 확인하지 못했습니다. 다시 실습해 주세요."},
  "finish the starter deck first": {ja:"先にスターターデッキを確定してください。",en:"Confirm your starter deck first.",ko:"먼저 스타터 덱을 확정해 주세요."},
  // auth
  "올바른 이메일이 아닙니다.": { ja: "正しいメールアドレスではありません。", en: "That's not a valid email." },
  "비밀번호는 6자 이상이어야 합니다.": { ja: "パスワードは6文字以上にしてください。", en: "Password must be at least 6 characters." },
  "이미 가입된 이메일입니다.": { ja: "このメールアドレスは既に登録されています。", en: "This email is already registered." },
  "이메일 또는 비밀번호가 올바르지 않습니다.": { ja: "メールアドレスまたはパスワードが正しくありません。", en: "Incorrect email or password." },
  "이메일 인증이 필요합니다. 받은편지함을 확인하세요.": { ja: "メール認証が必要です。受信トレイをご確認ください。", en: "Email verification required — check your inbox." },
  "로그인이 필요합니다.": { ja: "ログインが必要です。", en: "You need to log in." },
  "링크가 만료되었거나 잘못되었습니다.": { ja: "リンクが期限切れか無効です。", en: "The link is expired or invalid." },
  // social / profile / shop
  "방 생성 실패": { ja: "ルーム作成に失敗しました", en: "Failed to create the room" },
  "잘못된 아바타": { ja: "無効なアバター", en: "Invalid avatar" },
  "보유하지 않은 뱃지입니다.": { ja: "所持していないバッジです。", en: "You don't own that badge." },
  "잘못된 슬리브": { ja: "無効なスリーブ", en: "Invalid sleeve" },
  "보유하지 않은 슬리브입니다.": { ja: "所持していないスリーブです。", en: "You don't own that sleeve." },
  "잘못된 상품입니다.": { ja: "無効な商品です。", en: "Invalid item." },
  "사용자를 찾을 수 없습니다.": { ja: "ユーザーが見つかりません。", en: "User not found." },
  "이미 보유한 슬리브입니다.": { ja: "既に所持しているスリーブです。", en: "You already own this sleeve." },
  "크레딧이 부족합니다.": { ja: "シャードが不足しています。", en: "Not enough Shards.", ko: "샤드가 부족합니다." },
  // friends / challenges
  "이름 또는 이메일을 입력하세요.": { ja: "名前またはメールアドレスを入力してください。", en: "Enter a nickname or email." },
  "해당 유저를 찾을 수 없습니다.": { ja: "該当するユーザーが見つかりません。", en: "Couldn't find that player." },
  "동명 유저가 여럿입니다 — 이메일로 시도해주세요.": { ja: "同名のユーザーが複数います — メールアドレスでお試しください。", en: "Multiple players share that name — try their email." },
  "이미 요청이 진행 중입니다.": { ja: "既にリクエストが進行中です。", en: "A request is already pending." },
  "이미 친구입니다.": { ja: "既にフレンドです。", en: "You're already friends." },
  "친구는 최대 100명까지입니다.": { ja: "フレンドは最大100人までです。", en: "Friends are capped at 100." },
  "친구에게만 대전을 신청할 수 있습니다.": { ja: "対戦申請はフレンドにのみ送れます。", en: "You can only challenge friends." },
  "이미 만료된 신청입니다.": { ja: "この申請は既に期限切れです。", en: "That challenge has already expired." },
  // coupons
  "쿠폰 코드를 입력하세요.": { ja: "クーポンコードを入力してください。", en: "Enter a coupon code." },
  "존재하지 않는 쿠폰입니다.": { ja: "存在しないクーポンです。", en: "That coupon doesn't exist." },
  "만료된 쿠폰입니다.": { ja: "期限切れのクーポンです。", en: "That coupon has expired." },
  "소진된 쿠폰입니다.": { ja: "使用上限に達したクーポンです。", en: "That coupon is used up." },
  "이미 사용한 쿠폰입니다.": { ja: "既に使用済みのクーポンです。", en: "You've already used this coupon." },
  // game room
  "상대가 참가하지 않아 매칭이 취소되었습니다 (점수 변동 없음)": { ja: "相手が参加しなかったため、マッチングは中止されました（レート変動なし）", en: "Your opponent never joined, so the match was canceled (no rating change)" },
};

/** Resolve both legacy sentence errors and newer protocol codes in the UI locale. */
export function localizeServerMsg(message: string): string {
  const key = message.trim();
  const alias: Record<string,string> = {'로그인이 필요합니다':'로그인이 필요합니다.', 'login required':'로그인이 필요합니다.'};
  const canonical = alias[key] ?? key;
  const entry = M[canonical];
  if (!entry) return M['unknown error'][getLang()]!;
  return entry[getLang()] ?? canonical;
}
