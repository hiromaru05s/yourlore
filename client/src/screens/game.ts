// ============================================================
// LORE — game screen. Hosts a Local (vs bot) or Online controller.
// ============================================================
import type { Side } from "../shared/types";
import type { App, Screen } from "../router";
import { LocalController, type ControllerExits } from "../game/controller";
import { TutorialController } from "../game/tutorial";
import { OnlineController } from "../game/online";
import { setMarketWatch, setMyAvatar, setMySleeve } from "../ui/boardView";
import { setCoinProfiles } from "../game/controller";

type GameOpts =
  | { mode: "bot" }
  | { mode: "tutorial" }
  | { mode: "online"; roomId: string; you: Side; oppName: string; oppAvatar?: string | null; ranked?: boolean };

export function mountGame(app: App, opts: GameOpts): Screen {
  const root = document.createElement("div");
  app.root.appendChild(root);
  setMyAvatar(app.user?.avatar);  // show my profile icon in the in-game meta panel
  setMySleeve(app.user?.sleeve);  // apply my equipped card sleeve to my deck/set-trap backs
  // 마켓 알림이: 활성 덱 프리셋의 워치리스트를 인게임 마켓 하이라이트에 연결
  const dks = app.user?.decks;
  setMarketWatch(dks?.list?.[dks.sel]?.watch ?? null);
  // coin-toss faces = the two players' profile avatars (opponent falls back to initial)
  setCoinProfiles(
    { avatar: app.user?.avatar ?? null, name: app.user?.display ?? "YOU" },
    opts.mode === "online"
      ? { avatar: opts.oppAvatar ?? null, name: opts.oppName }
      : { avatar: null, name: opts.mode === "tutorial" ? "TUTOR" : "BOT" },
  );

  const exits: ControllerExits = {
    onHome: () => (opts.mode === "tutorial" ? app.tutorial() : app.home()),
    // 랭크전 "다시하기"는 랭크 큐로 돌아가야 한다 (노말 큐로 새던 버그 수정)
    onRematch: () => (opts.mode === "bot" ? app.botGame() : opts.mode === "tutorial" ? app.tutorialGame() : opts.ranked ? app.rankedLobby() : app.onlineLobby()),
  };

  const ctrl =
    opts.mode === "bot"
      ? new LocalController(root, exits, app.user?.display ?? "PLAYER 1", app.user?.deck ?? undefined)
      : opts.mode === "tutorial"
        ? new TutorialController(root, exits, app.user?.display ?? "PLAYER", {
            onCredits: (c) => { if (app.user) app.user.credits = c; },
          })
        : new OnlineController(root, opts.you, opts.roomId, exits);

  return { destroy: () => ctrl.destroy() };
}
