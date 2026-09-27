import {deckStoreForUser} from '../shared/cards';
// ============================================================
// LORE — game screen. Hosts a Local (vs bot) or Online controller.
// ============================================================
import type { Side } from "../shared/types";
import type { BotDifficulty } from "../shared/bot";
import type { App, Screen } from "../router";
import { LocalController, type ControllerExits } from "../game/controller";
import { TutorialController } from "../game/tutorial";
import { OnlineController } from "../game/online";
import { setMarketWatch, setMyAvatar, setMySleeve, setMyFurniture, setOppAvatar } from "../ui/boardView";
import { startBoardLayout } from "../ui/layout";
import { setCoinProfiles } from "../game/controller";
import { HOME_MUSIC_GAIN, startBackgroundMusic } from "../ui/backgroundMusic";

type GameOpts =
  | { mode: "bot"; difficulty?: BotDifficulty }
  | { mode: "tutorial" }
  | { mode: "online"; roomId: string; you: Side; oppName: string; oppAvatar?: string | null; ranked?: boolean };

export function mountGame(app: App, opts: GameOpts): Screen {
  const root = document.createElement("div");
  app.root.appendChild(root);
  setMyAvatar(app.user?.avatar);  // my profile icon on the center-bottom portrait
  setOppAvatar(opts.mode === "online" ? opts.oppAvatar ?? null : null); // opp portrait (bot → initial)
  const decks=deckStoreForUser(app.user),activeDeck=decks.list[decks.sel];
  setMySleeve(activeDeck.sleeve); setMyFurniture(activeDeck.furniture);  // apply my equipped card sleeve to my deck/set-trap backs
  // 마켓 알림이: 활성 덱 프리셋의 워치리스트를 인게임 마켓 하이라이트에 연결
  setMarketWatch(activeDeck.watch);
  // coin-toss faces = the two players' profile avatars (opponent falls back to initial)
  const ownSeeker = app.user?.avatar === "SEEKER_RED" ? "SEEKER_RED" : "SEEKER_BLUE";
  setCoinProfiles(
    { avatar: ownSeeker, name: app.user?.display ?? "YOU" },
    opts.mode === "online"
      ? { avatar: opts.oppAvatar === "SEEKER_BLUE" ? "SEEKER_BLUE" : "SEEKER_RED", name: opts.oppName }
      : { avatar: "SEEKER_RED", name: opts.mode === "tutorial" ? "TUTOR" : "BOT" },
  );

  let stopMusic: (() => void) | undefined;
  const startMusic = (elapsedMs?: number) => {
    if (stopMusic || opts.mode === "tutorial") return;
    stopMusic = startBackgroundMusic({
      url: "/music/poised-opening.mp3",
      gain: HOME_MUSIC_GAIN * .6,
      gapMs: 3000,
      intro: elapsedMs != null && elapsedMs < 6520
        ? { url: "/music/clash-of-blades.mp3", durationSeconds: 6.52, offsetSeconds: Math.max(0, elapsedMs) / 1000 }
        : undefined,
    });
  };
  const exits: ControllerExits = {
    onOpeningStart: opts.mode === "tutorial" ? undefined : startMusic,
    onBattleReady: () => startMusic(),
    onHome: () => (opts.mode === "tutorial" ? app.tutorial() : app.home()),
    // 랭크전 "다시하기"는 랭크 큐로 돌아가야 한다 (노말 큐로 새던 버그 수정)
    onRematch: () => (opts.mode === "bot" ? app.botGame(opts.difficulty) : opts.mode === "tutorial" ? app.tutorialGame() : opts.ranked ? app.rankedLobby() : app.onlineLobby()),
  };

  const ctrl =
    opts.mode === "bot"
      ? new LocalController(root, exits, app.user?.display ?? "PLAYER 1", activeDeck.cards, opts.difficulty ?? "hard")
      : opts.mode === "tutorial"
        ? new TutorialController(root, exits, app.user?.display ?? "PLAYER", {
            onCredits: (c) => { if (app.user) app.user.credits = c; },
          })
        : new OnlineController(root, opts.you, opts.roomId, exits);

  // fit-to-viewport board sizing — started AFTER the controller built the board
  // skeleton, because the solver measures the real rows (see ui/layout.ts).
  const stopLayout = startBoardLayout();

  return { destroy: () => { stopMusic?.(); stopLayout(); ctrl.destroy(); } };
}
