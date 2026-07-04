// ============================================================
// LORE — tiny screen router + auth/session context.
// ============================================================
import type { Side } from "./shared/types";
import type { User } from "./net/api";
import { api } from "./net/api";
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
    if (location.pathname === "/admin") { this.swap(() => mountAdmin(this)); return; } // internal dashboard
    this.user = await api.me();
    if (this.user) this.home();
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
  home(): void { this.swap(() => mountHome(this)); }
  tutorial(): void { this.swap(() => mountTutorial(this)); }
  cards(): void { this.swap(() => mountCards(this)); }
  botGame(): void { this.swap(() => mountGame(this, { mode: "bot" })); }
  onlineLobby(): void { this.swap(() => mountLobby(this)); }
  rankedLobby(): void { this.swap(() => mountLobby(this, true)); }
  leaderboard(): void { this.swap(() => mountLeaderboard(this)); }
  onlineGame(roomId: string, you: Side, oppName: string): void {
    this.swap(() => mountGame(this, { mode: "online", roomId, you, oppName }));
  }

  async logout(): Promise<void> {
    await api.logout().catch(() => {});
    this.user = null;
    this.login();
  }
}
