// ============================================================
// LORE — game screen. Hosts a Local (vs bot) or Online controller.
// ============================================================
import type { Side } from "../shared/types";
import type { App, Screen } from "../router";
import { LocalController, type ControllerExits } from "../game/controller";
import { TutorialController } from "../game/tutorial";
import { OnlineController } from "../game/online";
import { setMyAvatar, setMySleeve } from "../ui/boardView";

type GameOpts =
  | { mode: "bot" }
  | { mode: "tutorial" }
  | { mode: "online"; roomId: string; you: Side; oppName: string };

export function mountGame(app: App, opts: GameOpts): Screen {
  const root = document.createElement("div");
  app.root.appendChild(root);
  setMyAvatar(app.user?.avatar);  // show my profile icon in the in-game meta panel
  setMySleeve(app.user?.sleeve);  // apply my equipped card sleeve to my deck/set-trap backs

  const exits: ControllerExits = {
    onHome: () => (opts.mode === "tutorial" ? app.tutorial() : app.home()),
    onRematch: () => (opts.mode === "bot" ? app.botGame() : opts.mode === "tutorial" ? app.tutorialGame() : app.onlineLobby()),
  };

  const ctrl =
    opts.mode === "bot"
      ? new LocalController(root, exits, app.user?.display ?? "PLAYER 1")
      : opts.mode === "tutorial"
        ? new TutorialController(root, exits, app.user?.display ?? "PLAYER", {
            onCredits: (c) => { if (app.user) app.user.credits = c; },
          })
        : new OnlineController(root, opts.you, opts.roomId, exits);

  return { destroy: () => ctrl.destroy() };
}
