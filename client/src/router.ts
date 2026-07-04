// ============================================================
// LORE — tiny screen router + auth/session context.
// ============================================================
import type { Side } from "./shared/types";
import type { User } from "./net/api";
import { api } from "./net/api";
import { aIdentify, aReset, aCapture } from "./net/analytics";
import { setPresence, stopPresence } from "./net/presence";
import { mountLogin } from "./screens/login";
import { mountHome } from "./screens/home";
import { mountLobby } from "./screens/lobby";
import { mountGame } from "./screens/game";
import { mountTutorial } from "./screens/tutorial";
import { mountCards } from "./screens/cards";
import { mountLeaderboard } from "./screens/leaderboard";
import { mountAdmin } from "./screens/admin";

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
    if (this.user) { aIdentify(this.user.id, { verified: true }); this.home(); }
    else this.login();
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
  cards(): void { setPresence("menu"); this.swap(() => mountCards(this)); }
  botGame(): void { setPresence("bot"); aCapture("game_start", { mode: "bot" }); this.swap(() => mountGame(this, { mode: "bot" })); }
  onlineLobby(): void { setPresence("queue"); this.swap(() => mountLobby(this)); }
  rankedLobby(): void { setPresence("queue"); this.swap(() => mountLobby(this, true)); }
  leaderboard(): void { setPresence("menu"); this.swap(() => mountLeaderboard(this)); }
  onlineGame(roomId: string, you: Side, oppName: string): void {
    setPresence("online");
    aCapture("game_start", { mode: "online" });
    this.swap(() => mountGame(this, { mode: "online", roomId, you, oppName }));
  }

  async logout(): Promise<void> {
    await api.logout().catch(() => {});
    aReset();
    stopPresence();
    this.user = null;
    this.login();
  }
}
