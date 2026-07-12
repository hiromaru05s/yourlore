// ============================================================
// LORE — server error message localizer. The Worker returns error
// strings in Korean only; screens display them verbatim (alerts,
// inline form messages). This maps each known Korean message to
// ja/en at the API boundary so every screen stays language-pure.
// Unknown messages pass through unchanged (ko fallback).
// ============================================================
import { getLang } from "../i18n";

const M: Record<string, { ja: string; en: string }> = {
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
  "크레딧이 부족합니다.": { ja: "クレジットが不足しています。", en: "Not enough credits." },
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

/** Translate a known Korean server message to the current UI language. */
export function localizeServerMsg(ko: string): string {
  const lang = getLang();
  if (lang === "ko") return ko;
  const e = M[ko.trim()];
  return e ? e[lang] : ko;
}
