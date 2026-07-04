// ============================================================
// LORE — game screen. Hosts a Local (vs bot) or Online controller.
// ============================================================
import type { Side } from "../shared/types";
import type { App, Screen } from "../router";
import { LocalController, type ControllerExits } from "../game/controller";
import { OnlineController } from "../game/online";

type GameOpts =
  | { mode: "bot" }
  | { mode: "online"; roomId: string; you: Side; oppName: string };

export function mountGame(app: App, opts: GameOpts): Screen {
  const root = document.createElement("div");
  app.root.appendChild(root);

  const exits: ControllerExits = {
    onHome: () => app.home(),
    onRematch: () => (opts.mode === "bot" ? app.botGame() : app.onlineLobby()),
  };

  const ctrl =
    opts.mode === "bot"
      ? new LocalController(root, exits, app.user?.display ?? "PLAYER 1")
      : new OnlineController(root, opts.you, opts.roomId, exits);

  return { destroy: () => ctrl.destroy() };
}
