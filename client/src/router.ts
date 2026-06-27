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

export interface Screen { destroy?(): void; }

export class App {
  root: HTMLElement;
  user: User | null = null;
  private current: Screen | null = null;

  constructor(root: HTMLElement) { this.root = root; }

  async start(): Promise<void> {
    this.user = await api.me();
    if (this.user) this.home();
    else this.login();
  }

  private swap(s: Screen): void {
    this.current?.destroy?.();
    this.root.innerHTML = "";
    this.current = s;
  }

  login(): void { this.swap(mountLogin(this)); }
  home(): void { this.swap(mountHome(this)); }
  botGame(): void { this.swap(mountGame(this, { mode: "bot" })); }
  onlineLobby(): void { this.swap(mountLobby(this)); }
  onlineGame(roomId: string, you: Side, oppName: string): void {
    this.swap(mountGame(this, { mode: "online", roomId, you, oppName }));
  }

  async logout(): Promise<void> {
    await api.logout().catch(() => {});
    this.user = null;
    this.login();
  }
}
