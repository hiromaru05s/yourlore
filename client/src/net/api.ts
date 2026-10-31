import type {OnboardingStatus} from '../shared/onboarding';
import {ReadRequests} from './readRequests';
import type {GiftInbox,GiftClaim} from '../shared/gifts';
import type { ClearDifficulty, ExperienceReceipt } from '../shared/progression';
import type {CollectionState,CollectionResult,CollectionReceipt} from '../shared/collection';
import type { TutorialAction } from '../shared/tutorialLesson';
import type { LessonId } from '../shared/tutorialSteps';
import type { RankChange } from "../shared/rank";
import type {DeckStore} from '../shared/cards';
// ============================================================
// LORE — auth/API client. Talks to the Worker over /api/*.
// Sessions are cookie-based (credentials: include).
// ============================================================
import { t } from "../i18n";
import { localizeServerMsg } from "./serverMsg";
import { buyLocalGuestSleeve, isLocalDevAccount, saveLocalDevDecks } from "../dev/localAccount";

export interface User {
  id: string;
  email: string;
  display: string;
  needsUsername?: boolean;
  wins: number;
  losses: number;
  exp?: number;
  botClears?: string[];
  credits: number;
  starterCards?: Record<string,number>;
  frames?:string[];
  effects?:string[];
  frame?:string;
  effect?:string;
  avatar?: string | null; // preset avatar (card id)
  badge?: string | null;  // equipped badge key
  furniture?: string | null;
  sleeve?: string | null; // equipped card sleeve id ('default' when none)
  deck?: string[] | null; // 활성 덱 8장 카드 id (null = 기본덱 컬6+상자2)
  decks?: DeckStore | null; // 덱 프리셋 5슬롯 + 마켓 알림이
}

export interface ClaimResult {
  granted: boolean; // false = already claimed before (no credits added)
  amount: number;
  credits: number; // fresh balance
}

export interface ApiError extends Error { needVerify?: boolean; status?:number }

async function performCall<T>(path: string, body?: unknown, method = "POST", signal?: AbortSignal): Promise<T> {
  const controller=new AbortController();
  const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  const timeout=setTimeout(abort,20000);
  try {
  const res = await fetch("/api" + path, {
    method,
    signal:controller.signal,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(error => {if(controller.signal.aborted)throw error;return {};})) as { error?: string; needVerify?: boolean } & T;
  if (!res.ok) {
    const err = new Error(data?.error ? localizeServerMsg(data.error) : t("api.fail").replace("{n}", String(res.status))) as ApiError;
    err.status=res.status;
    err.needVerify = !!data?.needVerify;
    throw err;
  }
  return data;
  } catch(error) {
    if(controller.signal.aborted&&!signal?.aborted)throw new Error(localizeServerMsg('request timed out'));
    if(error instanceof TypeError)throw new Error(localizeServerMsg('network unavailable'));
    throw error;
  } finally {clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
}

const readRequests = new ReadRequests();
async function call<T>(path: string, body?: unknown, method = "POST", signal?: AbortSignal): Promise<T> {
  if (method === 'GET') {
    // A screen's AbortSignal must never cancel another screen's request.
    return signal ? performCall<T>(path, body, method, signal)
      : readRequests.get(path, () => performCall<T>(path, body, method));
  }
  readRequests.clear();
  try { return await performCall<T>(path, body, method, signal); }
  finally { readRequests.clear(); }
}

export interface RankInfo {
  season: string; mmr: number; wins: number; losses: number; peak_mmr: number;
  rank: number | null; tier: string; // null until the first completed ranked match
}
export interface RankedDeck { cards: string[]; lastUsedAt: number }
export interface LbEntry {
  purchases?:import('../shared/rankedProfile').PurchaseStats;
  userId: string;
  rank: number;
  display: string;
  mmr: number;
  wins: number;
  losses: number;
  tier: string;
  /** 이전 집계 대비 순위 변동. 서버 기록 연결 전에는 비어 있을 수 있다. */
  rankChange?: number;
  /** 현재 연승 수. 서버 기록 연결 전에는 비어 있을 수 있다. */
  winStreak?: number;
}

function acquisition(): { ref?: string; source?: string } {
  try {
    return { ref: localStorage.getItem("lore_ref") ?? undefined, source: localStorage.getItem("lore_src") ?? undefined };
  } catch { return {}; }
}

export const api = {
  onboarding: () => call<OnboardingStatus>('/onboarding',undefined,'GET'),
  completeBasics: (actions:TutorialAction[]) => call<OnboardingStatus & ClaimResult>('/onboarding/basics',{actions}),
  finishOnboarding: () => call<OnboardingStatus>('/onboarding/finish',{}),
  gifts: (signal?:AbortSignal) => call<GiftInbox>('/gifts',undefined,'GET',signal),
  readGift: (id:string) => call<{ok:true}>('/gifts/read',{id}),
  claimGifts: (id?:string) => call<GiftClaim>('/gifts/claim',id?{id}:{all:true}),
  collection: () => call<CollectionState>("/collection",undefined,"GET"),
  collectionHistory: () => call<{receipts:CollectionReceipt[]}>("/collection/history",undefined,"GET"),
  buyStarter: (id:string,requestId:string,count=1,shopDay?:string,tutorial=false) => call<CollectionResult>("/collection/buy",{id,requestId,count,shopDay,...(tutorial?{tutorial:true}:{})}),
  drawStarters: (count:number,requestId:string,tutorial=false) => call<CollectionResult>("/collection/draw",{count,requestId,...(tutorial?{tutorial:true}:{})}),
  duelRewardResult: (roomId:string) => call<{settled:boolean;amount:number}>('/rewards/result?roomId='+encodeURIComponent(roomId),undefined,'GET'),
  progression: () => call<import('../shared/progression').ProgressionState>('/rewards/progression',undefined,'GET'),
  rerollDaily: (day:string,revision:number,slot=0) => call<import('../shared/progression').ProgressionState>('/rewards/daily/reroll',{day,revision,slot}),
  startBot: (difficulty:import('../shared/bot').BotDifficulty,lang:string) => call<{roomId:string;you:0;oppName:string;oppAvatar:string}>('/rewards/bot/start',{difficulty,lang}),
  // register: {user} (즉시 입장) 또는 {needVerify:true} (인증 메일 발송됨)
  register: (email: string, password: string) => call<{ user?: User; needVerify?: boolean }>("/auth/register", { email, password, ...acquisition() }),
  login: (email: string, password: string) => call<{ user: User }>("/auth/login", { email, password }).then((r) => r.user),
  logout: () => call<{ ok: true }>("/auth/logout", {}).then(result => {
    if (result.ok !== true) throw new Error(t("login.err.generic"));
    return result;
  }),
  resendVerify: (email: string) => call<{ ok: true }>("/auth/resend-verify", { email }),
  forgot: (email: string) => call<{ ok: true }>("/auth/forgot", { email }),
  resetPassword: (token: string, password: string) => call<{ ok: true }>("/auth/reset", { token, password }),
  me: (options?: { signal?: AbortSignal; strict?: boolean }) => call<{ user: User | null }>("/auth/me", undefined, "GET", options?.signal).then((r) => {
    if (!Object.hasOwn(r, "user")) throw new Error(t("login.err.generic"));
    return r.user;
  }).catch(error => { if (options?.strict) throw error; return null; }),
  rankResult: (matchId: string) => call<{ result: RankChange | null }>("/rank/result?matchId=" + encodeURIComponent(matchId), undefined, "GET", AbortSignal.timeout(8000)).then(r => r.result),
  rankMe: () => call<{ rating: RankInfo | null }>("/rank/me", undefined, "GET").then((r) => r.rating).catch(() => null),
  trackBot: (won: boolean | null, difficulty?: ClearDifficulty) => call<{ ok: boolean; experience: ExperienceReceipt | null }>("/track/bot", { won: won === true, draw: won === null, difficulty }),
  inviteMe: () => call<{ code: string; limit: number; invites: { status: string; created_at: number; display: string }[] }>("/invite/me", undefined, "GET"),
  // 문의 접수 (홈 '문의' 모달 → 어드민 '문의' 탭). 게스트도 전송 가능(서버가 user_id NULL 저장).
  sendInquiry: (title: string, body: string) => call<{ ok: true }>("/inquiry", { title, body }),
  /** Google OAuth entry URL (carries invite ref + utm source, and an optional same-origin return path). */
  googleUrl: (returnTo?: string): string => {
    const a = acquisition();
    const q = new URLSearchParams();
    if (a.ref) q.set("ref", a.ref);
    if (a.source) q.set("source", a.source);
    if (returnTo && /^\/[^/]/.test(returnTo)) q.set("return", returnTo);
    const s = q.toString();
    return "/api/auth/google" + (s ? `?${s}` : "");
  },
  leaderboard: (season?: string, offset = 0, limit = 100) => {
    const query = new URLSearchParams();
    if (season) query.set("season", season);
    if (offset > 0) query.set("offset", String(offset));
    if (limit !== 100) query.set("limit", String(limit));
    const suffix = query.size ? `?${query}` : "";
    return call<{ season: string; total: number; entries: LbEntry[] }>(`/rank/leaderboard${suffix}`, undefined, "GET");
  },
  rankedDecks: (userId:string,signal?:AbortSignal) => call<{display:string;rank:number;decks:RankedDeck[]}>("/rank/decks?userId="+encodeURIComponent(userId),undefined,"GET",signal),
  rankHistory: () => call<{ seasons: (RankInfo & { season: string })[] }>("/rank/history", undefined, "GET").then((r) => r.seasons).catch(() => []),
  // credit rewards (server-authoritative amounts; key e.g. "tut:1")
  tutorialStatus: () => call<{ keys:string[]; credits:number; offered:boolean; awarded:number; legacyPaid:number; amounts:Record<string,number> }>("/rewards/tutorial", undefined, "GET"),
  tutorialDecision: (decision:'start'|'skip') => call<{ok:true}>("/rewards/tutorial/decision", {decision}),
  completeTutorial: (lesson:LessonId, actions:TutorialAction[]) => call<ClaimResult>("/rewards/tutorial/complete", {lesson,actions}),
  claimReward: (key: string) => call<ClaimResult>("/rewards/claim", { key }),
  claimedRewards: () => call<{ keys: string[]; credits: number }>("/rewards/claimed", undefined, "GET").catch(() => ({ keys: [] as string[], credits: 0 })),
  redeemCoupon: (code: string) => call<ClaimResult>("/rewards/coupon", { code }),
  // 덱 프리셋 저장 (덱 빌더: 5슬롯 + 마켓 알림이)
  saveDecks: async (decks: DeckStore, tutorial=false) => {
    if (isLocalDevAccount()) {
      const saved = saveLocalDevDecks(decks);
      return { ok: true as const, decks: saved, deck: saved.list[saved.sel].cards };
    }
    return call<{ ok: true; decks: DeckStore; deck: string[] }>("/deck", { decks, ...(tutorial?{tutorial:true}:{}) });
  },
  // ---- social: profile / friends / challenges ----
  profile: (id?: string) => call<{ profile: Profile }>(`/social/profile${id ? `?id=${encodeURIComponent(id)}` : ""}`, undefined, "GET").then((r) => r.profile),
  updateMe: (patch: { display?: string; avatar?: string; badge?: string; stats_public?: boolean; sleeve?: string; furniture?: string }) =>
    call<{ ok: true; display: string; needsUsername: boolean; avatar: string | null; badge: string | null; stats_public: boolean; sleeve: string; furniture: string }>("/social/me", patch),
  buyFrame: (id:string) => {
    if(isLocalDevAccount()){const result=buyLocalGuestSleeve(id);return Promise.resolve({...result,frames:result.sleeves.filter(id=>id.startsWith('frame:'))});}
    return call<{ok:true;credits:number;frames:string[]}>('/social/buy-cosmetic',{id});
  },
  buySleeve: (id: string) => {
    if (isLocalDevAccount()) return Promise.resolve({ ok: true as const, ...buyLocalGuestSleeve(id) });
    return call<{ ok: true; credits: number; sleeves: string[]; furnitures:string[] }>("/social/buy-sleeve", { id });
  },
  friends: (signal?: AbortSignal) => call<FriendsData>("/social/friends", undefined, "GET", signal),
  friendRequest: (q: string) => call<{ ok: true; display: string }>("/social/friends/request", { q }),
  friendRespond: (user_id: string, accept: boolean) => call<{ ok: true }>("/social/friends/respond", { user_id, accept }),
  friendRemove: (user_id: string) => call<{ ok: true }>("/social/friends/remove", { user_id }),
  challenge: (user_id: string) => call<{ id: string }>("/social/challenge", { user_id }),
  challengeCancel: (id: string) => call<{ ok: true }>("/social/challenge/cancel", { id }).catch(() => null),
  challengeRespond: (id: string, accept: boolean) =>
    call<{ ok: true; roomId?: string; you?: 0 | 1; oppName?: string }>("/social/challenge/respond", { id, accept }),
  challengePoll: (id: string) =>
    call<{ status: string; roomId?: string; you?: 0 | 1; oppName?: string }>(`/social/challenge/poll?id=${encodeURIComponent(id)}`, undefined, "GET"),
};

export interface Profile {
  ranked?:import('../shared/rankedProfile').RankedProfile;
  id: string; display: string; avatar: string | null; badge: string | null; created_at: number; self: boolean;
  private?: boolean;
  stats_public?: boolean;
  wins?: number; losses?: number;
  tier?: string | null; mmr?: number | null; rank?: number | null;
  recent?: { mode: string; result: "win" | "loss" | "draw"; opp: string; turns: number | null; at: number }[];
  badges?: string[]; // legacy response compatibility
  medals?: import("../shared/medals").MedalState;
  credits?: number;  // self only
  sleeve?: string;   // equipped sleeve id (self only)
  furniture?: string;
  furnitures?: string[];
  frames?:string[];
  effects?:string[];
  sleeves?: string[]; // owned sleeve ids incl. 'default' (self only)
  // per-mode W/L aggregates for the record filter (self only)
  byMode?: { ranked: { w: number; l: number }; online: { w: number; l: number }; bot: { w: number; l: number } };
  // head-to-head vs opponents faced 2+ times (self only), most-played first
  h2h?: { oppId: string; oppName: string; wins: number; losses: number; games: number }[];
}

export interface FriendEntry { id: string; display: string; avatar: string | null; badge: string | null; online: boolean; state: string | null; }
export interface FriendsData {
  friends: FriendEntry[];
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
  challenges: { id: string; from: string; fromId: string; at: number }[];
}
