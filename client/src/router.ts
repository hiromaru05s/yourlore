// ============================================================
// LORE — tiny screen router + auth/session context.
// ============================================================
import type { Side } from "./shared/types";
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

export interface Screen { destroy?(): void; }

export class App {
  root: HTMLElement;
  user: User | null = null;
  private current: Screen | null = null;

  constructor(root: HTMLElement) { this.root = root; }

  async start(): Promise<void> {
    // Isolated admin origin (admin.yourlore.xyz) → dashboard only, nothing else.
    if (location.hostname.startsWith("admin.")) { this.swap(() => mountAdmin(this)); return; }
    // On the game origin, /admin just bounces to the isolated admin host.
    if (location.pathname === "/admin") { location.href = `${location.protocol}//admin.${location.host.replace(/^www\./, "")}/`; return; }
    this.user = await api.me();
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
  private swap(make: () => Screen): void {
    this.current?.destroy?.();
    this.root.innerHTML = "";
    this.current = make();
  }

  login(): void { this.swap(() => mountLogin(this)); }
  home(): void { setPresence("menu"); this.swap(() => mountHome(this)); }
  tutorial(): void { setPresence("menu"); this.swap(() => mountTutorial(this)); }
  tutorialGame(): void { setPresence("bot"); aCapture("game_start", { mode: "tutorial" }); this.swap(() => mountGame(this, { mode: "tutorial" })); }
  cards(): void { setPresence("menu"); this.swap(() => mountCards(this)); }
  botGame(): void { setPresence("bot"); aCapture("game_start", { mode: "bot" }); this.swap(() => mountGame(this, { mode: "bot" })); }
  // entering a lobby with a live game still stored → rejoin it instead of re-queuing
  onlineLobby(): void { const g = loadActiveGame(); if (g) return this.onlineGame(g.roomId, g.you, "?", null, !!g.ranked); setPresence("queue"); this.swap(() => mountLobby(this)); }
  rankedLobby(): void { const g = loadActiveGame(); if (g) return this.onlineGame(g.roomId, g.you, "?", null, !!g.ranked); setPresence("queue"); this.swap(() => mountLobby(this, true)); }
  leaderboard(): void { setPresence("menu"); this.swap(() => mountLeaderboard(this)); }
  profile(userId?: string, tab?: ProfileTab): void { setPresence("menu"); this.swap(() => mountProfile(this, userId, tab)); }
  friends(): void { setPresence("menu"); this.swap(() => mountFriends(this)); }
  settings(): void { this.profile(undefined, "settings"); } // settings now lives as a profile tab
  shop(): void { setPresence("menu"); this.swap(() => mountShop(this)); }
  deck(): void { setPresence("menu"); this.swap(() => mountDeck(this)); }
  onlineGame(roomId: string, you: Side, oppName: string, oppAvatar: string | null = null, ranked = false): void {
    setPresence("online");
    aCapture("game_start", { mode: "online" });
    saveActiveGame(roomId, you, ranked); // remember it so a crash/close can rejoin this exact room
    this.swap(() => mountGame(this, { mode: "online", roomId, you, oppName, oppAvatar, ranked }));
  }

  async logout(): Promise<void> {
    await api.logout().catch(() => {});
    aReset();
    stopPresence();
    this.user = null;
    this.login();
  }
}
