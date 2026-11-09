import {setLocalCardFrame,clearCardFrameContext,disposeCardFrames} from '../ui/cardFrame';
import {setLocalCardEffect,clearCardEffectContext,disposeCardEffects} from '../ui/cardFinish';
import { api } from '../net/api';
import { mountDuelSpiritGuide } from '../ui/duelSpiritGuide';
import { botNpc } from "../shared/botNpcs";
import { getLang } from "../i18n";
import {deckStoreForUser} from '../shared/cards';
// ============================================================
// LORE — game screen. Hosts a Local (vs bot) or Online controller.
// ============================================================
import type { Side } from "../shared/types";
import type { BotDifficulty } from "../shared/bot";
import type { App, Screen } from "../router";
import { LocalController, type ControllerExits } from "../game/controller";
import { TutorialController } from "../game/tutorial";
import { TutorialPartController } from "../game/tutorialParts";
import { TUTORIAL_PARTS } from '../shared/tutorialParts';
import { OnlineController } from "../game/online";
import { setMarketWatch, setMyAvatar, setMySleeve, setMyFurniture, setOppAvatar } from "../ui/boardView";
import { startBoardLayout } from "../ui/layout";
import { setCoinProfiles } from "../game/controller";
import { HOME_MUSIC_GAIN, startBackgroundMusic } from "../ui/backgroundMusic";
import type { AriesStage, StoryOpponent } from "../shared/ariesStory";
import { ARIES_COMPLETED_KEY } from "../shared/ariesStory";
import { loungeText } from "../ui/loungeText";

export type GameOpts =
  | { mode: "bot"; difficulty?: BotDifficulty; story?: StoryOpponent }
  | { mode: "tutorial"; lesson?: number; part?: number }
  | { mode: "online"; roomId: string; you: Side; oppName: string; oppAvatar?: string | null; ranked?: boolean; difficulty?:BotDifficulty };

export function mountGame(app: App, opts: GameOpts): Screen {
  const root = document.createElement("div");
  root.dataset.duelMode = opts.mode;
  app.root.appendChild(root);
  const npc = opts.mode === "bot" ? botNpc(opts.difficulty ?? "hard") : null;
  const story = opts.mode === 'bot' ? opts.story : undefined;
  setMyAvatar(app.user?.avatar);  // my profile icon on the center-bottom portrait
  setOppAvatar(opts.mode === "online" ? opts.oppAvatar ?? null : npc?.avatar ?? null);
  const decks=deckStoreForUser(app.user),activeDeck=decks.list[decks.sel];
  clearCardEffectContext();setLocalCardEffect(opts.mode==='bot'?activeDeck.effect:undefined);
  clearCardFrameContext();setLocalCardFrame(opts.mode==='bot'?activeDeck.frame:undefined);
  setMySleeve(activeDeck.sleeve); setMyFurniture(activeDeck.furniture);  // apply my equipped card sleeve to my deck/set-trap backs
  // 마켓 알림이: 활성 덱 프리셋의 워치리스트를 인게임 마켓 하이라이트에 연결
  setMarketWatch(activeDeck.watch);
  // coin-toss faces = the two players' profile avatars (opponent falls back to initial)
  const ownSeeker = app.user?.avatar === "SEEKER_RED" ? "SEEKER_RED" : "SEEKER_BLUE";
  setCoinProfiles(
    { avatar: ownSeeker, name: app.user?.display ?? "YOU", medal:app.user?.badge },
    opts.mode === "online"
      ? { avatar: opts.oppAvatar ?? "SEEKER_RED", name: opts.oppName }
      : { avatar: npc?.avatar ?? "SEEKER_RED", name: story?.name[getLang()] ?? npc?.name[getLang()] ?? "TUTOR" },
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
  const experienceUserId=app.user?.id;
  let storyWon: boolean | null = null;
  const exits: ControllerExits = {
    onExperience: () => {if(experienceUserId && experienceUserId!=="local-guest-user")void api.me().then(fresh=>{if(fresh?.id===experienceUserId && app.user?.id===experienceUserId){app.user=fresh;document.dispatchEvent(new Event("lore:user"));}});},
    onOpeningStart: opts.mode === "tutorial" ? undefined : startMusic,
    onBattleReady: () => startMusic(),
    onHome: () => (opts.mode === "tutorial" ? app.tutorial() : app.home()),
    // 랭크전 "다시하기"는 랭크 큐로 돌아가야 한다 (노말 큐로 새던 버그 수정)
    onStoryResult: won => { storyWon = won; if (story && story.stage === 2 && won) localStorage.setItem(ARIES_COMPLETED_KEY, '1'); },
    onStoryAgainLabel: won => !story ? undefined : won ? story.stage < 2 ? loungeText('次の試練へ →','Continue →','다음 시련으로 →') : loungeText('ストーリーを閉じる','Finish story','스토리 마치기') : loungeText('最初からやり直す →','Restart the sequence →','처음부터 다시 →'),
    onRematch: () => {
      if (opts.mode === 'bot' && story) {
        if (storyWon && story.stage < 2) app.storyGame((story.stage + 1) as AriesStage);
        else if (storyWon && story.stage === 2) app.home();
        else app.storyGame(0);
      } else if (opts.mode === "bot") app.botGame(opts.difficulty);
      else if (opts.mode === "tutorial") opts.part===undefined?app.tutorialGame(opts.lesson):app.tutorialPart(opts.part);
      else (opts.difficulty??ctrl.botDifficulty) ? app.botGame(opts.difficulty??ctrl.botDifficulty) : opts.ranked ? app.rankedLobby() : app.onlineLobby();
    },
  };

  const tutorialUserId = app.user?.id;
  const ctrl =
    opts.mode === "bot"
      ? new LocalController(root, exits, app.user?.display ?? "PLAYER 1", activeDeck.cards, opts.difficulty ?? "hard", story ? {name:story.name[getLang()],deck:story.deck,tune:story.tune} : undefined)
      : opts.mode === "tutorial" && opts.part!==undefined
        ? new TutorialPartController(root,exits,opts.part,(next,actions)=>next<TUTORIAL_PARTS.length?app.tutorialPart(next):app.onboarding(actions),app.user?.id)
      : opts.mode === "tutorial"
        ? new TutorialController(root, exits, app.user?.display ?? "PLAYER", {
            lesson: opts.lesson,
            guest: !app.user || app.user.id === 'local-guest-user',
            onNext: lesson => app.tutorialGame(lesson),
            accountId: app.user?.id,
            onCredits: (c) => { if (app.user?.id === tutorialUserId && app.user) { app.user.credits = c; document.dispatchEvent(new Event('lore:user')); } },
          })
        : new OnlineController(root, opts.you, opts.roomId, exits, opts.ranked);

  // fit-to-viewport board sizing — started AFTER the controller built the board
  // skeleton, because the solver measures the real rows (see ui/layout.ts).
  const stopLayout = startBoardLayout();
  const stopGuide = opts.mode === "tutorial" ? undefined : mountDuelSpiritGuide(root, () => ctrl.guideContext());

  return { destroy: () => { stopMusic?.(); stopGuide?.(); stopLayout(); ctrl.destroy(); disposeCardEffects(); clearCardEffectContext(); disposeCardFrames(); clearCardFrameContext(); } };
}
