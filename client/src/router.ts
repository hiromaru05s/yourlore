import {coverScreen} from './ui/assetReadiness';
import { mountLounge, type LoungePage } from "./ui/lounge";
// ============================================================
// LORE — tiny screen router + auth/session context.
// ============================================================
import type { Side } from "./shared/types";
import type { BotDifficulty } from "./shared/bot";
import type { User } from "./net/api";
import { api } from "./net/api";
import { aIdentify, aReset, aCapture } from "./net/analytics";
import { setPresence, stopPresence } from "./net/presence";
import { saveActiveGame, loadActiveGame } from "./net/resume";
import { mountLogin } from "./screens/login";
import { mountHome } from "./screens/home";
import { mountLobby } from "./screens/lobby";
import { mountGame } from "./screens/game";
import { mountTutorial } from "./screens/tutorial";
import { mountCards } from "./screens/cards";
import { mountLeaderboard } from "./screens/leaderboard";
import { mountAdmin } from "./screens/admin";
import { mountProfile, type ProfileTab } from "./screens/profile";
import { mountFriends } from "./screens/friends";
import { mountShop } from "./screens/shop";
import { mountDeck } from "./screens/deck";
import { LOCAL_GUEST_KEY, canUseLocalGuest, loadLocalDevDecks, loadLocalGuestProfile } from "./dev/localAccount";

export interface Screen { destroy?(): void; beforeLeave?(): Promise<boolean>; }

export class App {
  root: HTMLElement;
  user: User | null = null;
  private current: Screen | null = null;
  private leaveLounge: (() => void) | null = null;
  private navigating = false;
  private cancelCover:(()=>void)|undefined;

  constructor(root: HTMLElement) { this.root = root; }

  enterLocalGuest(): void {
    if (!canUseLocalGuest()) return;
    localStorage.setItem(LOCAL_GUEST_KEY, "1");
    const decks = loadLocalDevDecks();
    const profile = loadLocalGuestProfile();
    this.user = {
      id: "local-guest-user",
      email: "guest@local.test",
      display: "GUEST ARCHIVIST",
      wins: 47,
      losses: 19,
      credits: profile.credits,
      avatar: "M1",
      sleeve: profile.sleeve,
      decks,
      deck: decks.list[decks.sel].cards,
    };
    aIdentify(this.user.id, { verified: true, localGuest: true });
    this.home();
  }

  async start(): Promise<void> {
    // Isolated admin origin (admin.yourlore.xyz) → dashboard only, nothing else.
    if (location.hostname.startsWith("admin.")) { this.swap(() => mountAdmin(this)); return; }
    // On the game origin, /admin just bounces to the isolated admin host.
    if (location.pathname === "/admin") { location.href = `${location.protocol}//admin.${location.host.replace(/^www\./, "")}/`; return; }
    this.user = await api.me();
    if (!this.user && canUseLocalGuest()) {
      const params = new URLSearchParams(location.search);
      const devLogin = params.get("devLogin");
      if (devLogin === "1") this.enterLocalGuest();
      if (devLogin === "0") localStorage.removeItem(LOCAL_GUEST_KEY);
      if (!this.user && localStorage.getItem(LOCAL_GUEST_KEY) === "1") this.enterLocalGuest();
    }
    if (this.user) {
      aIdentify(this.user.id, { verified: true });
      // crashed / closed mid-game? reconnect to the in-progress room instead of the home screen.
      const g = loadActiveGame();
      if (g) this.onlineGame(g.roomId, g.you, "?", null, !!g.ranked);
      else this.home();
    } else this.login();
  }

  // Clear the root BEFORE mounting the next screen. (Passing a thunk matters:
  // the mount fn appends to root, so it must run after innerHTML is cleared.)
  private swap(make: () => Screen, page?: LoungePage): void {
    const mount = () => {
      this.cancelCover?.();
      this.current?.destroy?.();
      this.leaveLounge?.(); this.leaveLounge = null;
      this.root.innerHTML = "";
      this.current = make();
      if (page) { this.leaveLounge = mountLounge(this, page);const cover=coverScreen(this.root);this.cancelCover=cover.cancel;void cover.ready(); }
    };
    if (this.navigating) return;
    if (this.current?.beforeLeave) {
      this.navigating = true;
      void this.current.beforeLeave().then(ok => { if (ok) mount(); }).finally(() => { this.navigating = false; });
    } else mount();
  }

  login(): void { this.swap(() => mountLogin(this), "login"); }
  home(): void { setPresence("menu"); this.swap(() => mountHome(this), "home"); }
  tutorial(): void { setPresence("menu"); this.swap(() => mountTutorial(this), "tutorial"); }
  tutorialGame(): void { setPresence("bot"); aCapture("game_start", { mode: "tutorial" }); this.swap(() => mountGame(this, { mode: "tutorial" })); }
  cards(): void { setPresence("menu"); this.swap(() => mountCards(this), "cards"); }
  botGame(difficulty: BotDifficulty = "hard"): void { setPresence("bot"); aCapture("game_start", { mode: "bot", difficulty }); this.swap(() => mountGame(this, { mode: "bot", difficulty })); }
  // entering a lobby with a live game still stored → rejoin it instead of re-queuing
  onlineLobby(): void { const g = loadActiveGame(); if (g) return this.onlineGame(g.roomId, g.you, "?", null, !!g.ranked); setPresence("queue"); this.swap(() => mountLobby(this), "lobby"); }
  rankedLobby(): void { const g = loadActiveGame(); if (g) return this.onlineGame(g.roomId, g.you, "?", null, !!g.ranked); setPresence("queue"); this.swap(() => mountLobby(this, true), "lobby"); }
  leaderboard(): void { setPresence("menu"); this.swap(() => mountLeaderboard(this), "leaderboard"); }
  profile(userId?: string, tab?: ProfileTab): void { setPresence("menu"); this.swap(() => mountProfile(this, userId, tab), "profile"); }
  friends(): void { setPresence("menu"); this.swap(() => mountFriends(this), "friends"); }
  settings(): void { this.profile(undefined, "settings"); } // settings now lives as a profile tab
  shop(): void { setPresence("menu"); this.swap(() => mountShop(this), "shop"); }
  deck(): void { setPresence("menu"); this.swap(() => mountDeck(this), "deck"); }
  onlineGame(roomId: string, you: Side, oppName: string, oppAvatar: string | null = null, ranked = false): void {
    setPresence("online");
    aCapture("game_start", { mode: "online" });
    saveActiveGame(roomId, you, ranked); // remember it so a crash/close can rejoin this exact room
    this.swap(() => mountGame(this, { mode: "online", roomId, you, oppName, oppAvatar, ranked }));
  }

  async logout(): Promise<void> {
    if (this.user?.id === "local-guest-user") localStorage.removeItem(LOCAL_GUEST_KEY);
    await api.logout().catch(() => {});
    aReset();
    stopPresence();
    this.user = null;
    this.login();
  }
}
