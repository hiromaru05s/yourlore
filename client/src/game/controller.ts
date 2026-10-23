import {playTribePactDefeat,tribePactVerdict} from '../ui/tribePactDefeat/runtime';
import {STANDARD_FX} from '../ui/animationTempo';
import { purgeChoices } from '../shared/engine';
import {summonFaceFactory} from '../ui/summon/face';
import {syncCardEffects,localCardEffect} from '../ui/cardFinish';
import { seekerLevel, type ExperienceReceipt } from '../shared/progression';
import {createMarketCrisis} from '../ui/marketCrisis/runtime';
import {fixedMarketWasReplaced} from '../ui/marketCrisis/selection';
import {erosionPlan} from '../ui/erosion/events';
import {growthGroups,growthDrawHands} from '../ui/growth/plan';
import {isSoulHarvestDamage,soulHarvestDamageIndex} from '../ui/soulHarvest/events';
import {dungeonFloorSummons} from '../ui/dungeonFloor/events';
import {runeReplayPlan} from '../ui/runeReplay/plan';
import {TimewarpPresentation,warmTimewarp} from '../ui/timewarp/runtime';
import {spaceRiteReason,spaceRiteSourceText} from '../ui/spaceRiteStatus';
import {forbiddenBatches} from '../ui/forbiddenRitual/selection';
import {fusionPairs} from '../ui/dragonFusion/selection';
import {paintTurnUrgency} from '../ui/turnUrgency';
import {contactPlayback} from './combatTempo';
import {startCombatExit} from '../ui/combatExit';
import {clearDamageFeedback} from '../ui/damageFeedback';
import {combatCard} from '../ui/combatAnchor';
import {hatchPairs} from '../ui/hatchSummon/selection';
import { BotThinker } from './botThinker';
import { observationSample } from '../shared/botObservation';
import {tauntRollIndex} from '../ui/taunt/timing';
import {evasionRollIndex} from '../ui/evade/timing';
import {playStatusExtinction,warmStatusExtinctions,disposeStatusExtinctions} from '../ui/statusExtinction/runtime';
import {isChosenVictory,playChosenVictory,warmChosenVictory} from '../ui/chosenVictory/runtime';
import { playIntent, needsCastReview, targetOwner } from '../shared/playIntent';
import {playDewGrant,warmDewGrant} from '../ui/dew/runtime';
import {playStatusGrant,warmStatusGrants} from '../ui/statusGrant/runtime';
import { botNpc, pickNpcDeck } from "../shared/botNpcs";
import {synergyTier} from '../ui/tribePresentation/selection';
import {playTribeSynergy} from '../ui/tribeSynergy/runtime';
import type {Playback} from '../ui/elemental/runtime';
import {persistentShelfExits} from './shelfExits';
import {counterPresentationEvents,counterSurvival} from './counterPresentation';
import {installHandDiscard} from '../ui/handDiscard';
import {captureSupplyFaces,playSupplyRefresh,supplyWasRefreshed} from '../ui/marketRefresh';
import {prepareStateArtwork} from '../ui/stateArtwork';
import {captureHandLayout,arrivingHandUids} from '../ui/handGeometry';
import {playDuelOpening,warmOpening} from "../ui/duelOpeningDirector";
import {waitForDuel} from "../ui/duelReadiness";
import {releaseMonster} from '../ui/fieldLayout';
import { paintDuelClock } from '../ui/duelClock';
// ============================================================
// LORE — game controllers.
// BaseController turns engine events into log + animation + render.
// Discrete causes keep their order; impact consequences overlap with recovery.
// Public graveyard flights survive later board commits and do not gate input.
// LocalController reduces locally and drives the bot.
// (OnlineController lives in ./online and reuses BaseController.)
// ============================================================
import type { Action, CardInst, GameEvent, GameState, ReduceResult, Side } from "../shared/types";
import { logToEn } from "../shared/logEn";
import { createGame, reduce, playCost, actingSide, effectChoices, purchaseAllowed, buyCost, effAtk, effDef, curHp } from "../shared/engine";
import { safeGreedy, legalBotAction, type BotDifficulty } from "../shared/bot";
import { DB, STARTERS, hasPassive, isChestCard } from "../shared/cards";
import { GameView, type BoardHandlers } from "../ui/boardView";
import { GameLog, logToText } from "../ui/log";
import * as A from "../ui/anim";
import { reviewCast, cardPicker, cardPickerMulti, confirmDialog, winModal, closeOverlay } from "../ui/modal";
import { api } from "../net/api";
import { aCapture } from "../net/analytics";
import { sfx, stopSounds } from "../ui/sound";
import {EventSound} from "../ui/eventSound";
import { RankPresentation } from "../ui/rankPresentation";
import type { RankChange } from "../shared/rank";
import { t, getLang, cardName, onLangChange } from "../i18n";
import {openWheelDice,type WheelDice} from "../ui/fateWheel";
import { diceRollAnim, cancelDiceAnimations } from "../ui/dice";

export interface ControllerExits {
  onHome(): void;
  onRematch(): void;
  onOpeningStart?(elapsedMs:number): void;
  onBattleReady?(): void;
  onExperience?(): void;
}

// ---- coin-toss profiles (set by the game screen at mount): the two coin faces ----
interface CoinProfile { avatar: string | null; name: string; medal?:string|null; }
let COIN_ME: CoinProfile = { avatar: null, name: "YOU" };
let COIN_OPP: CoinProfile = { avatar: null, name: "OPP" };
export function setCoinProfiles(me: CoinProfile, opp: CoinProfile): void { COIN_ME = me; COIN_OPP = opp; }

/** Card IDs whose outcome is a random roll — surfaced as a result popup, not just a log line. */
import { RANDOM_CARDS } from "../shared/cards"; // 주사위·확률 카드 (결과 팝업 + 수레바퀴 재굴림 대상)

const wait = (ms: number): Promise<void> => A.fxWait(ms); // skippable: flushes when the player acts

export abstract class BaseController implements BoardHandlers {
  private timewarp:TimewarpPresentation;
  protected view: GameView;
  protected log: GameLog;
  protected state!: GameState;
  get botDifficulty(): BotDifficulty | undefined { return this.state?.botDifficulty; }
  protected you: Side;
  protected exits: ControllerExits;
  private elementalFaces: {card:CardInst;side:A.ViewSide;node:HTMLElement}[] = [];
  private wheelDice:WheelDice|null=null;
  private wheelReplayUid:string|undefined;
  private quickFaces: {card:CardInst;side:A.ViewSide;node:HTMLElement}[] = [];
  protected ranked = false;
  private rankPresentation = new RankPresentation();
  private winShown = false;
  private outcomePending = false;
  protected dead = false;
  private combatExits=new AbortController();
  private queue: Promise<void> = Promise.resolve();
  private unsubLang: () => void;
  private fxGen = 0; // batches queued so far
  private skipGen = 0; // batches up to this gen fast-forward
  // ---- turn timer ----
  private timerKey = "";
  private announcedTimerKey = "";
  private timerLeft = 0;
  private timerInt: number | null = null;
  // bot/tutorial (and casual online fallback) use a 90s turn; online games get the
  // authoritative length from the server via g.turnTotalMs (ranked 50s / casual 90s).
  private static readonly LOCAL_TURN_SECS = 90;
  private static readonly HAND_CAP_BONUS_SECS = 10; // v42: end-turn hand-discard choice
  private turnTotal = 90; // full length of the CURRENT turn (for the ring's full-scale)
  private turnStartedWall = 0; // wall-clock ms when the current turn's timer started (anti instant-skip)
  private disposeHandDiscard:(()=>void)|undefined;
  private marketCrisis:ReturnType<typeof createMarketCrisis>|undefined;
  private marketRefresh:ReturnType<typeof playSupplyRefresh>|undefined;
  private presentedHandDiscards=new Set<string>();
  private handCapBonusKey = ""; // v42: turn key that already received the +10s hand-discard bonus
  private multiPickerOpen = false; // a cardPickerMulti modal is showing (closed when its pending vanishes)
  private lastEndTurnAt = 0;   // 턴종료 연타 가드: 마지막 endTurn 제출 시각
  private purgePicks: string[] | null = null; // multi-select purge: remaining queued picks
  private autoTarget: string | null = null; // drag-to-attack: defender chosen before the pending exists
  private openingRoot:HTMLElement;
  private openingAbort=new AbortController();
  private openingActive=false;
  private openingAssets:Promise<void>|null=null;
  private openingWait:HTMLElement|null=null;
  private serverOffset=0;
  protected get openingLocked():boolean { return this.openingActive || (!!this.state?.opening && (this.state.opening.playableAt==null || Date.now()-this.serverOffset<this.state.opening.playableAt)); }
  protected openingPrepared():void {}
  protected introShown = false; // coin-toss reveal plays once at game start

  constructor(root: HTMLElement, you: Side, exits: ControllerExits) {
    this.openingRoot=root;
    // Cover before GameView inserts its first board, including async asset waits.
    root.classList.add('opening-pending');
    this.you = you;
    this.exits = exits;
    this.view = new GameView(root, you, this);
    this.timewarp = new TimewarpPresentation(root,you);
    this.log = new GameLog(this.view.logEl);
    document.addEventListener("keydown", this.onKey);
    // re-render the board (labels + card names) when language changes
    this.unsubLang = onLangChange(() => { if (this.state) this.view.render(this.state); });
  }

  private onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { A.closeZoom(); if(this.state?.pending?.reason === "attack" && this.state.cur === this.you)this.onChooseTarget(null); } };

  // ---- the only mutation entry point (subclass decides how) ----
  protected abstract submit(action: Action): void;
  protected maybeBot(): void {}
  /** Follow-up UI must wait until the authoritative batch is visible on the board. */
  protected afterPresentation(callback:()=>void):void { void this.queue.then(()=>{if(!this.dead)callback();}); }
  protected get useTurnClock(): boolean { return true; }
  /** Only public board state and the local player's hand count reach the companion. */
  guideContext() {
    const g = this.state;
    if (!g) return { yourTurn:false, pending:false, mana:0, hand:0, enemyMonsters:0, over:false };
    const p = g.players[this.you];
    return { yourTurn:g.cur===this.you, pending:!!g.pending, mana:p.mana,
      hand:p.hand.length, enemyMonsters:g.players[1-this.you].field.length, over:g.over };
  }

  /** The player acted — fast-forward any still-playing batches so input never waits. */
  protected fastForward(): void {
    this.timewarp.cancel();
    this.marketRefresh?.cancel();
    this.marketCrisis?.cancel();
    this.skipGen = this.fxGen;
    stopSounds();
    A.setFxSkip(true);
    cancelDiceAnimations();
  }

  // ---- BoardHandlers ----
  // Hand plays are looked up by uid (not index): the on-screen hand can be a
  // batch behind the logical state, and uids stay correct where indices drift.
  private castReviewState: GameState | null = null;
  async onPlay(uid: string) {
    const before=this.state;
    if(this.dead || before.over || before.pending || before.cur!==this.you || this.castReviewState)return;
    const idx=before.players[this.you].hand.findIndex(c=>c.uid===uid),card=before.players[this.you].hand[idx];
    if(!card)return;
    this.fastForward();
    if(needsCastReview(before,this.you,card)) {
      this.castReviewState=before;
      const plan=playIntent(before,this.you,card);
      const targets=await reviewCast(before,this.you,card,plan);
      this.castReviewState=null;
      if(targets===null || this.dead || this.state!==before){A.setPlayOrigin(null);return;}
      this.submit({type:'play',idx,sourceUid:uid,...(plan?{targets}:{})});
    } else this.submit({type:'play',idx,sourceUid:uid});
  }
  private choiceOwner(g:GameState,uid:string):string {
    const owner=targetOwner(g,uid);if(owner===null)return '';
    return getLang()==='ja'?(owner===this.you?'自分':'相手'):getLang()==='ko'?(owner===this.you?'자신':'상대'):(owner===this.you?'You':'Opponent');
  }
  onBlockedPlay(uid: string) {
    const g = this.state; if (!g || g.over) return;
    const me = g.players[this.you];
    const c = me.hand.find((x) => x.uid === uid);
    const spaceReason=c?spaceRiteReason(g,this.you,c):null;
    const msg = g.cur !== this.you ? t("play.block.turn")
      : g.pending ? t("play.block.pending")
      : spaceReason ? spaceReason+" "+spaceRiteSourceText(g,this.you)
      : (c && me.mana < playCost(c, me)) ? t("play.block.mana")
      : t("play.block.cond");
    this.cantPlayToast(msg);
  }
  onAttack(uid: string, targetUid?: string | null) {
    this.fastForward();
    // drag-to-attack already knows the defender: stash it so the "choose a target"
    // pending the engine raises right after is answered automatically.
    this.autoTarget = targetUid ?? null;
    this.submit({ type: "attack", uid });
  }
  onBlockedAttack() { this.cantPlayToast(t("attack.block.guarded")); }
  onReorder(from: number, to: number) { this.fastForward(); this.submit({ type: "reorder", from, to }); }
  async onChooseTarget(uid: string | null) {
    this.fastForward();const before=this.state;
    if(uid!==null && before.pending?.kind==='oppMon' && before.pending.reason!=='attack' && targetOwner(before,uid)===this.you) {
      const yes=await confirmDialog({title:getLang()==='ja'?'自分のモンスターを対象にします':getLang()==='ko'?'자신의 몬스터를 대상으로 합니다':'Target your own monster',confirm:t('picker.confirm'),cancel:t('common.cancel'),danger:true});
      if(!yes||this.dead||this.state!==before)return;
    }
    this.submit({ type: before.pending?.kind === "seek" || before.pending?.kind === "recall" ? "pick" : "chooseTarget", uid } as Action);
  }
  onBuyMarket(i: number) { void this.reviewPurchase('buyMarket',i); }
  onBuySupply(i: number) { void this.reviewPurchase('buySupply',i); }
  private async reviewPurchase(type:'buyMarket'|'buySupply',i:number) {
    this.fastForward();const before=this.state;
    if(this.dead||before.over||before.pending||before.cur!==this.you||this.castReviewState)return;
    if(type==='buySupply') {
      // Preserve the refresh guard: never buy a new offer through an old tile.
      const shown=this.view.root.querySelector<HTMLElement>(`#supplyMarket > .card[data-sup-idx="${i}"]`);
      if(!shown||shown.dataset.uid!==before.players[this.you].supply[i]?.uid)return;
    }
    const c=type==='buyMarket'?before.market[i]:before.players[this.you].supply[i];
    if(c?.quick){this.castReviewState=before;const result=await reviewCast(before,this.you,c,null,true);this.castReviewState=null;if(result===null||this.dead||this.state!==before)return;}
    this.submit({type,i});
  }
  onRefresh() { this.fastForward(); this.submit({ type: "refresh" }); }
  onEndTurn() {
    // 연타 가드 — 빠른 더블/트리플 클릭이 (봇 턴이 순식간에 끝난 뒤) 방금 시작된
    // 내 새 턴까지 즉시 끝내버리는 사고 방지. 900ms 내 재클릭과 턴 시작 직후
    // 500ms 내 클릭(이전 턴을 노린 잔여 클릭일 가능성이 높음)은 무시한다.
    const now = Date.now();
    if (now - this.lastEndTurnAt < 900) return;
    if (this.state?.cur === this.you && now - this.turnStartedWall < 500 && this.state.turn > 1) return;
    if(!this.state||this.state.over||this.state.cur!==this.you||(this.state.pending && this.state.pending.reason !== 'attack'))return;
    this.view.beginEndTurn();
    this.lastEndTurnAt = now;
    this.fastForward(); this.submit({ type: "endTurn" });
  }
  async onSurrender() {
    const ok = await confirmDialog({ title: t("surrender.title"), body: t("surrender.body"), confirm: t("common.yes"), cancel: t("common.no"), danger: true });
    if (ok) this.submit({ type: "surrender", player: this.you });
  }

  // ---- apply a reduce result: queued so batches play back one at a time ----
  protected applyResult(res: ReduceResult, animate = true): void {
    syncCardEffects(res.state,this.you);
    const prev = this.state ?? res.state;
    // Bind completed local flights to their authoritative removal batch, not
    // whichever queued snapshot happens to play next (online echoes may lag).
    const presentedHandDiscards=new Set<string>();
    const hand=new Set(res.state.players[this.you].hand.map(c=>c.uid));
    for(const uid of this.presentedHandDiscards)if(!hand.has(uid)){
      presentedHandDiscards.add(uid);this.presentedHandDiscards.delete(uid);
    }
    if(res.state.turn!==prev.turn||res.state.over)this.presentedHandDiscards.clear();
    if (animate && res.state.over && res.state.winner != null) this.outcomePending = true;
    if(res.state.opening)this.serverOffset=Date.now()-res.state.opening.serverNow;
    if(res.state.over||res.state.turn>1)this.openingAbort.abort();
    if(!animate||!res.events.some(e=>e.type==='turnSkipped'&&e.source==='TIMEWARP'))this.view.syncTurn(res.state);
    this.state = res.state; // logical state advances immediately (input guards etc.)
    // An already-running clock must follow logical state, not the animation queue.
    // Keep initial clock/announcement startup behind the opening cinematic.
    if (this.timerKey) this.syncTimer(false);
    if(this.castReviewState && this.castReviewState!==this.state && document.querySelector(".cast-review"))closeOverlay();
    const gen = ++this.fxGen;
    this.queue = this.queue
      .then(() => this.playResult(prev, res, animate, gen, presentedHandDiscards))
      .catch((err) => {
        console.error("[playback]", err);
        this.clearQuickFaces();
        // A playback exception must not strand the game: afterApply is what
        // re-arms the bot (LocalController) and pending pickers. Skipping it for
        // this batch permanently froze bot games on one animation error.
        if (!this.dead && res.state === this.state) {
          this.outcomePending = false;
          try { this.afterApply(res); } catch { this.maybeBot(); }
        }
      });
  }

  private async playResult(prev: GameState, res: ReduceResult, animate: boolean, gen: number, presentedHandDiscards:Set<string>): Promise<void> {
    if (this.dead) return;
    if(this.wheelDice && res.state.pending?.kind!=='reroll' && !res.events.some(e=>e.type==='wheelResolve')){this.wheelDice.close();this.wheelDice=null;}
    this.disposeHandDiscard?.();this.disposeHandDiscard=undefined;
    // Hold the existing complete board until newly exposed card art is decoded.
    if(prev!==res.state){const artwork=prepareStateArtwork(res.state,this.you,this.openingRoot);if(artwork){this.view.setPlaying(true);try{await artwork;}finally{if(!this.dead)this.view.setPlaying(false);}}}
    if(this.dead)return;
    // batches older than the player's latest action jump-cut; fresh ones play normally
    A.setFxSkip(gen <= this.skipGen);
    const wheelResolution=res.events.some(e=>e.type==='wheelResolve');
    if(!wheelResolution)this.consumeLogs(res.events);
    if (!animate) {
      this.clearQuickFaces();
      if(wheelResolution){this.wheelDice?.close();this.wheelDice=null;this.wheelReplayUid=undefined;this.consumeLogs(res.events);}
      this.view.render(res.state);
      this.afterApply(res);
      return;
    }
    this.view.setPlaying(true);
    try {
      await this.playEvents(prev, res, presentedHandDiscards);
      if(wheelResolution)this.consumeLogs(res.events);
    } finally {
      if(this.wheelReplayUid!==undefined){this.wheelReplayUid=undefined;this.wheelDice?.close();this.wheelDice=null;}
      this.marketCrisis?.cancel();this.marketCrisis=undefined;
      if (!this.dead) this.view.setPlaying(false);
      if (res.state.over) this.outcomePending = false;
    }
    if (this.dead) return;
    this.afterApply(res);
  }

  protected restoreLog(events: GameEvent[], reset: boolean): void {
    // Stay in the presentation queue: an older queued action must not append again
    // after the server's replacement history has already included it.
    this.queue = this.queue.then(() => {
      if (this.dead) return;
      if (reset) this.log.clear();
      this.consumeLogs(events);
    });
  }

  private consumeLogs(events: GameEvent[]): void {
    for (const e of events) {
      if (e.type === "turnHeader") this.log.turnHeader(e.turn, e.name, e.isBot, e.player != null ? e.player === this.you : undefined);
      else if (e.type === "log") {
        // "can't play/attack" rejection lines are NOT written to the battle log (they'd
        // just spam it). Only the ACTING player gets a friendly popup. Online: the server
        // never even sends the opponent these; in bot mode this guard suppresses the bot's
        // blocked attempts (cur !== you).
        if (e.rejected) {
          if (this.state.cur === this.you) {
            const reason = this.stripHtml(getLang() === "ja" ? e.htmlJa : getLang() === "en" ? logToEn(e.html) : e.html).replace(/^\s*[└·\-]\s*/, "").trim();
            this.cantPlayToast(reason || t("play.block.cond"));
          }
          continue;
        }
        this.log.line(e.html, e.htmlJa);
      }
    }
  }

  /** Play a batch of events one at a time on the OLD board, then re-render. */
  private async playEvents(prev: GameState, res: ReduceResult, presentedHandDiscards:Set<string>): Promise<void> {
    // Cards that left my hand must disappear from it IMMEDIATELY — seeing a
    // card fly onto the field while its copy still sits in the hand is confusing.
    // (The hand itself only re-renders after the whole batch has played out.)
    const newHand = new Set(res.state.players[this.you].hand.map((c) => c.uid));
    for (const c of prev.players[this.you].hand) {
      if (!newHand.has(c.uid)) {
        (document.querySelector(`#hand .card[data-uid="${c.uid}"]`) as HTMLElement | null)?.classList.add("is-played");
      }
    }
    const events = counterPresentationEvents(res.events);
    const growth=growthGroups(events),growthHands=growthDrawHands(prev,res.state,events);
    if(events.some(e=>e.type==='timewarp'||e.type==='turnSkipped'&&e.source==='TIMEWARP'))warmTimewarp();
    for(const event of events)if(event.type==='counter'||event.type==='destroy')A.warmCombat(event.uid);
    if(events.some(e=>e.type==='dice'&&e.source.id==='DUNGEON_FLOOR'))A.warmDungeonFloor();
    const floorSessions=new Map<string,{playback:ReturnType<typeof A.startDungeonFloor>;last:boolean}>();
    const hatches=hatchPairs(events),heldEggs=new Set<string>();
    const rituals=forbiddenBatches(events),ritualFaces=new Set<string>();
    if(rituals.size)A.warmForbiddenRitual();
    const fusions=fusionPairs(events),fusionMaterials=new Set([...fusions.values()].flatMap(f=>[f.dragon.uid,f.mate.uid]));
    if(events.some(e=>e.type==='dice'&&e.taunt))A.warmTaunt();
    if(events.some(e=>e.type==='curseGenerated'))A.warmCurse();
    if(events.some(e=>e.type==='playSpell'&&e.id==='CHOSEN_AREA'))warmChosenVictory();
    if(events.some(e=>e.type==='reverseDamage'))A.warmReverse();
    if(events.some(e=>e.type==='nova'))A.warmNova();
    if(events.some(e=>e.type==='treason'))A.warmTreason();
    if(events.some(e=>e.type==='voidShot'))A.warmVoidShot();
    if(events.some(e=>e.type==='elementalStart'&&e.id==='FLAME'))A.warmEmberDebt();
    if(events.some(e=>e.type==='voidGrant'))A.warmVoidGrant();
    if(events.some(e=>e.type==='summon'&&e.rebirth))A.warmRebirth();
    const runeReplays=runeReplayPlan(events);
    if(runeReplays.held.size)A.warmRuneReplay();
    const erosion=erosionPlan(events);
    const shownDraws=[0,0];
    const eventSound = new EventSound();
    const sideOf = (pl: Side): A.ViewSide => (pl === this.you ? "me" : "opp");
    const ghosts = new Map<string, { el: HTMLElement; side: A.ViewSide }>();
    const spellGhosts:HTMLElement[]=[];
    const treasonExits=new Set<string>();
    const originRiteDeaths=new Set<string>();
    const massacreDeaths=new Set<string>(),massacreCosts=new Set<Side>();
    const creationSources=new Map<string,HTMLElement>();
    const creationEvents=events.filter((e):e is Extract<GameEvent,{type:'creationBorn'}>=>e.type==='creationBorn');
    const creationGrants=events.filter((e):e is Extract<GameEvent,{type:'creationGranted'}>=>e.type==='creationGranted');
    const creationExits=new Set([...creationEvents,...creationGrants].flatMap(e=>e.sourceUid?[e.sourceUid]:[]));
    let statusSource:HTMLElement|undefined;
    if(events.some(e=>e.type==='statusExtinction'))warmStatusExtinctions();
    const hasStatusGrants=events.some(e=>e.type==='statusGrant');
    if(events.some(e=>e.type==='statusGrant'&&e.resource!=='dew'))warmStatusGrants();
    if(events.some(e=>e.type==='statusGrant'&&e.resource==='dew'))warmDewGrant();
    const questCount=prev.players.map(p=>p.quests?.length??0);
    const buffCount=[prev.players[0].traps.length+prev.players[0].enchants.length,prev.players[1].traps.length+prev.players[1].enchants.length];
    // running counters for ghost slot placement + live HP readout
    const fieldCount: [number, number] = [prev.players[0].field.length, prev.players[1].field.length];
    const hpNow: [number, number] = [prev.players[0].hp, prev.players[1].hp];
    const contactedDamage=new Set<GameEvent>();
    const elemental=new Map<string,Playback>();
    const elementalDeaths:Promise<void>[]=[];
    const draws = [0, 0];
    const gutsHits=new Set<string>();
    const counterGuts=new Set<GameEvent>();
    const motionFinishes:Promise<void>[]=[];
    let voidShotFinish:Promise<void>|undefined;
    const counterFinishes=new Map<string,Promise<void>>();
    const grantFinishes:Promise<void>[]=[];
    const grantQueues=new Map<string,Promise<void>>();
    const shownGrants=new Set<GameEvent>();
    const summonActivations=new Set<GameEvent>();
    const cullExits=new Set<string>();
    const health=new Map(prev.players.flatMap(p=>p.field.map(m=>[m.uid,m.hatch!=null?(m.dur??0):curHp(p,m)] as const)));
    const grant=(e:Extract<GameEvent,{type:'statusGrant'}>,source?:HTMLElement)=>{
      if(shownGrants.has(e)||A.isFxSkipped())return;
      shownGrants.add(e);
      const key=`${e.player}:${e.resource}`,previous=grantQueues.get(key);
      const play=()=>{if(this.dead||A.isFxSkipped())return Promise.resolve();return e.resource==='dew'?playDewGrant(sideOf(e.player),e.before,e.after,source):playStatusGrant(sideOf(e.player),e.resource,e.before,e.after,source);};
      const finished=previous?previous.then(play):play();grantQueues.set(key,finished);grantFinishes.push(finished);void finished.catch(()=>{});
    };
    const summonGrants=(index:number,uid:string,source:HTMLElement)=>{
      const activations:GameEvent[]=[];let granted=false;
      for(let j=index+1;j<events.length;j++){
        const next=events[j];
        if(next.type==='log')continue;
        if(next.type==='monsterActivate'&&next.uid===uid){activations.push(next);continue;}
        if(next.type==='statusGrant'&&(!next.sourceUid||next.sourceUid===uid)){grant(next,source);granted=true;continue;}
        break; // Never cross another cause or a player choice.
      }
      if(granted)activations.forEach(event=>summonActivations.add(event));
    };
    const diceDone = new Set<number>(); // dice events already animated (pre-rolled ahead of a result popup)
    const playDiceAt=async(index:number)=>{
      const roll=events[index];if(roll?.type!=='dice'||diceDone.has(index)||this.dead)return;
      diceDone.add(index);
      if(res.state.pending?.kind==='reroll' && roll.player===res.state.pending.owner){
        this.wheelDice?.close();
        this.wheelDice=this.createWheelDice(roll,res.state,A.isFxSkipped());
        await this.wheelDice.ready;return;
      }
      if(this.wheelReplayUid!==undefined){
        const held=this.wheelDice,uid=this.wheelReplayUid;this.wheelReplayUid=undefined;
        if(held){try{await held.finish(roll,uid);}finally{if(this.wheelDice===held)this.wheelDice=null;}return;}
      }
      if(A.isFxSkipped())return;
      const taunt=roll.taunt?A.prepareTauntActivation(roll.taunt.sourceUid):undefined;
      const evade=roll.evasion?A.prepareEvasion(roll.evasion.targetUid,sideOf(roll.player),!!roll.success):undefined;
      try{
        await taunt?.play();
        if(A.isFxSkipped()||this.dead)return;
        await diceRollAnim(roll.rolls,{need:roll.need,success:roll.success,mine:roll.player===this.you,casino:roll.variant==='casino',source:roll.source,viewer:this.you});
        if(!A.isFxSkipped()&&!this.dead)await evade?.play();
      }finally{taunt?.cancel();evade?.cancel();}
    };


    try {
    for (let i = 0; i < events.length; i++) {
      if (this.dead) return;
      const e = events[i];
      if(growth.consumed.has(i)||summonActivations.has(e)||contactedDamage.has(e)||runeReplays.suppressed.has(i))continue;
      // glanceable icon rail (topbar): key events → small icons
      if (e.type === "summon" || e.type === "attack" || e.type === "destroy" || e.type === "buy" || e.type === "draw" || e.type === "playSpell" || e.type === "trapReveal") this.view.pushIcon(e.type);
      else if (e.type === "damage" && e.player === this.you) this.view.pushIcon("hitme");
      else if (e.type === "heal" && e.player === this.you) this.view.pushIcon("heal");
      const cue = e.type==='destroy'&&(originRiteDeaths.has(e.uid)||massacreDeaths.has(e.uid)||treasonExits.has(e.uid))?undefined:(e.type==='destroy'&&([...hatches.values()].includes(e.uid)||(e.cause==='fusion'&&fusionMaterials.has(e.uid))))||(e.type==='summon'&&(fusions.has(e.uid)||e.rebirth||floorSessions.has(e.uid)))?undefined:eventSound.cue(e);
      if(cue&&!A.isFxSkipped()&&!isSoulHarvestDamage(e))sfx(cue);
      if(e.type==='trapReveal'||e.type==='turnHeader')statusSource=undefined;
      if(hasStatusGrants&&(e.type==='monsterActivate'||e.type==='enchantActivate'||e.type==='summon'))statusSource=document.querySelector<HTMLElement>(`[data-uid="${CSS.escape(e.uid)}"]`)??ghosts.get(e.uid)?.el;
      switch (e.type) {
        case 'treason': {
          const targets=e.targets.flatMap(target=>{
            const node=ghosts.get(target.uid)?.el??document.querySelector<HTMLElement>(`[data-uid="${CSS.escape(target.uid)}"]`);
            return node?[{node,voided:target.destination==='rift'}]:[];
          });
          await A.treasonChains(targets,sideOf(e.target));
          targets.forEach(({node})=>{if(node.dataset.uid)treasonExits.add(node.dataset.uid);});
          break;
        }
        case 'timewarp':
          if(!A.isFxSkipped())await this.timewarp.cast(e.player,{...DB.TIMEWARP,uid:e.sourceUid});
          break;
        case 'turnSkipped':
          if(e.source==='TIMEWARP'&&!A.isFxSkipped())await this.timewarp.release(e.player);
          break;
        case 'statusExtinction': {
          const extinct = [e];
          // One spell may clear both players: share the visual start instead of serial waits.
          while (events[i + 1]?.type === 'statusExtinction') {
            const next = events[++i];
            if (next.type === 'statusExtinction') extinct.push(next);
          }
          await Promise.all(extinct.map(event=>grantQueues.get(`${event.player}:${event.resource}`)));
          if (!A.isFxSkipped()) await Promise.all(extinct.map(event => playStatusExtinction(sideOf(event.player),event.resource,event.before,event.after)));
          break;
        }
        case 'decayCounterGrant': {
          const grants=[e],uids=new Set([e.uid]);
          // Whole-field grants share a start, but never cross a destruction/reaction or a second grant on the same card.
          let next=i+1;
          while(next<events.length){
            if(events[next].type==='log'){next++;continue;}
            const event=events[next];
            if(event.type!=='decayCounterGrant'||uids.has(event.uid))break;
            grants.push(event);uids.add(event.uid);i=next++;
          }
          if(!A.isFxSkipped())await Promise.all(grants.map(event=>{
            const target=ghosts.get(event.uid)?.el??this.openingRoot?.querySelector<HTMLElement>(`.zone-mon .card[data-uid="${CSS.escape(event.uid)}"]`);
            return target?A.decayCounterGrant(target,event.before,event.after):undefined;
          }));
          break;
        }
        case 'statusGrant': {
          const source=e.sourceUid?(ghosts.get(e.sourceUid)?.el??document.querySelector<HTMLElement>(`[data-uid="${CSS.escape(e.sourceUid)}"]`)??undefined):statusSource;
          if(!A.isFxSkipped()){
            grant(e,source);
          }
          break;
        }
        case 'elementalStart': {
          let source=this.elementalFaces.find(f=>f.card.id===e.id&&f.side===sideOf(e.player))?.node;
          if(!source&&(e.id.startsWith('FIRE_')||e.id==='FLAME')&&DB[e.id]&&!A.isFxSkipped()){
            const card={...DB[e.id],uid:e.uid};source=await A.revealSpell(card,sideOf(e.player),'discard',undefined,true)??undefined;
            if(source)this.elementalFaces.push({card,side:sideOf(e.player),node:source});
          }
          elemental.set(e.group,await A.beginElemental(e,this.you,source));break;
        }
        case 'elementalImpact': await elemental.get(e.group)?.impact(e.index);break;
        case 'elementalEnd': await elemental.get(e.group)?.finished;elemental.delete(e.group);await Promise.all(elementalDeaths.splice(0));break;
        case 'voidGrant':
          await A.grantVoid(e.uids);
          break;
        case 'infinityRelease':
          await A.infinityCull(e.sourceUid, sideOf(e.player), e.amount);
          break;
        case "enchantActivate": {
          if (res.state.defeatCause?.uid === e.uid) break; // The terminal contract owns its source.
          const erosionPair=erosion.activations.get(i);
          if(erosionPair){
            const damage=events[erosionPair.damage];
            if(damage.type==='damage'){
              contactedDamage.add(damage);
              await A.erosionDamage(sideOf(damage.player),e.uid,damage.amount,()=>{
                if(this.dead)return;
                hpNow[damage.player]-=damage.amount;
                if(damage.player===this.you)this.view.pushIcon("hitme");
                const sound=eventSound.cue(damage);if(sound&&!A.isFxSkipped())sfx(sound);
                A.hpBarSet(sideOf(damage.player),hpNow[damage.player]);
              });
              break;
            }
          }

          const growthPulses=growth.groups.get(i);
          if(growthPulses){
            await A.growthRecovery(sideOf(e.player),growthPulses,index=>{
              if(this.dead)return;const pulse=growthPulses[index];hpNow[pulse.player]+=pulse.amount;
              if(pulse.amount>0&&pulse.player===this.you)this.view.pushIcon('heal');
              A.hpBarSet(sideOf(pulse.player),hpNow[pulse.player]);
            });break;
          }
          if(e.originRite){
            const reaction=e.originRite;
            // Consume only this rite's immediately following grant; its selected light owns contact.
            if(reaction.outcome==='brand'){
              await grantQueues.get(`${reaction.targetPlayer}:brand`);
              const next=events.slice(i+1).find(event=>event.type!=='log');
              if(next?.type==='statusGrant'&&next.resource==='brand'&&next.player===reaction.targetPlayer&&next.before===reaction.brandBefore&&next.after===reaction.brandAfter)shownGrants.add(next);
            }
            await A.originRite(e.uid,reaction,sideOf(reaction.targetPlayer),ghosts.get(reaction.summonUid)?.el);
            if(reaction.outcome==='destroy'&&reaction.target?.kind==='monster')originRiteDeaths.add(reaction.target.uid);
            break;
          }
          const replay=runeReplays.replays.get(i);
          if(replay){
            const original=events[replay.playIndex];
            if(original.type==='playSpell'&&original.id==='BLACK_CURSE'){A.enchantActivation(e.uid);await wait(STANDARD_FX.milliseconds(140));break;}
            if(original.type==='playSpell'){
              const card=prev.players[e.player].hand.find(c=>c.id===original.id)??this.defOf(original.id,`rune-replay-${replay.playIndex}`);
              if(card){
                const side=sideOf(e.player);
                const held=[...this.elementalFaces,...this.quickFaces].reverse().find(x=>x.card.id===card.id&&x.side===side&&x.node.isConnected)?.node
                  ??[...creationSources.values()].find(x=>x.dataset.cardId===card.id&&x.isConnected);
                const node=await A.runeReplay(card,side,replay.sourceUids,held);
                if(node&&!held){if(this.dead)node.remove();else if(original.dest==='vanish')this.quickFaces.push({card,side,node});else this.elementalFaces.push({card,side,node});}
              }
            }
          }else{A.enchantActivation(e.uid);await wait(STANDARD_FX.milliseconds(140));}
          break;
        }
        case "summon": {
          const ritual=rituals.get(e.uid);
          if(ritual&&!A.isFxSkipped()){
            const source=this.elementalFaces.find(x=>x.card.id==='FORBIDDEN'&&x.side===sideOf(e.player))?.node;
            const cards=ritual.map(event=>{
              const card=this.findCard(res.state,event.uid)??this.defOf(event.id,event.uid);
              const grant=events.slice(i+1).find(ev=>ev.type==='decayCounterGrant'&&ev.uid===event.uid);
              return card&&grant?.type==='decayCounterGrant'?{...card,decayCnt:grant.before}:card;
            }).filter((card):card is CardInst=>!!card);
            if(source&&cards.length){
              const faces=await A.forbiddenSummon(source,cards,sideOf(e.player),summonFaceFactory(res.state,e.player,this.you));
              for(const face of faces){ghosts.set(face.dataset.uid!,{el:face,side:sideOf(e.player)});ritualFaces.add(face.dataset.uid!);}
            }
          }
          if(ritualFaces.has(e.uid)){
            const face=ghosts.get(e.uid)?.el;if(face){statusSource=face;summonGrants(i,e.uid,face);}
            fieldCount[e.player]++;break;
          }
          const card = this.findCard(res.state, e.uid) ?? (e.rebirth?{...e.rebirth.card,passive:[...new Set([...(e.rebirth.card.passive??[]),'void'])]}:this.defOf(e.id, e.uid));
          const grant=events.slice(i+1).find(ev=>ev.type==='decayCounterGrant'&&ev.uid===e.uid);
          const shown=card&&grant?.type==='decayCounterGrant'?{...card,decayCnt:grant.before}:card;
          const floor=floorSessions.get(e.uid);
          if(floor){
            const face=await floor.playback.land(e.uid);
            if(face){ghosts.set(e.uid,{el:face,side:sideOf(e.player)});statusSource=face;summonGrants(i,e.uid,face);}
            if(floor.last)await floor.playback.done;
            fieldCount[e.player]++;break;
          }
          if(e.rebirth&&shown){
            const face=await A.rebirthSummon(e.rebirth.card,shown,sideOf(e.player),source=>summonGrants(i,e.uid,source),summonFaceFactory(res.state,e.player,this.you));
            if(face){ghosts.set(e.uid,{el:face,side:sideOf(e.player)});statusSource=face;}
            fieldCount[e.player]++;break;
          }
          const fusion=fusions.get(e.uid);
          if(fusion&&shown){
            const face=await A.dragonFusionSummon(shown,sideOf(e.player),fusion,summonFaceFactory(res.state,e.player,this.you));
            ghosts.delete(fusion.dragon.uid);ghosts.delete(fusion.mate.uid);
            if(face){ghosts.set(e.uid,{el:face,side:sideOf(e.player)});statusSource=face;}
            fieldCount[e.player]++;break;
          }
          const egg=hatches.get(e.uid);
          if(egg&&heldEggs.delete(egg)){
            const g=shown?await A.hatchSummon(egg,shown,summonFaceFactory(res.state,e.player,this.you)):null;
            if(g){ghosts.delete(egg);ghosts.set(e.uid,{el:g,side:sideOf(e.player)});statusSource=g;break;}
            releaseMonster(egg);fieldCount[e.player]=Math.max(0,fieldCount[e.player]-1);
          }
          if (shown) {
            const g = await A.ghostSummon(shown, sideOf(e.player), fieldCount[e.player],source=>summonGrants(i,e.uid,source),summonFaceFactory(res.state,e.player,this.you));
            if (g) {ghosts.set(e.uid, { el: g, side: sideOf(e.player) });statusSource=g;}
          }
          fieldCount[e.player]++;
          break;
        }
        case "tribeSynergy": {
          const victory=e.tribe==='시초'&&e.threshold===6&&events.some(ev=>ev.type==='win'&&ev.winner===e.player);
          // All approved ordinary stages clamp at 3; actual Origin victory has its own seal.
          if(!A.isFxSkipped()){
            const nodes=e.uids.map(uid=>ghosts.get(uid)?.el??this.openingRoot.querySelector<HTMLElement>(`.zone-mon .card[data-uid="${CSS.escape(uid)}"]`)).filter((el):el is HTMLElement=>!!el);
            await playTribeSynergy(nodes,victory,synergyTier(e.threshold));
          }
          break;
        }
        case "trapSet":
          await A.trapSetAnim(sideOf(e.player));
          buffCount[e.player]++;
          break;
        case "trapReveal": {
          const def = DB[e.id];
          if (def) {
            await Promise.all([
              A.eventBanner(`⚡ ${t("fx.trap")}`, cardName({ uid: "fx", ...def }), "trap", 1500),
              A.trapRevealAnim({ uid: "fx", ...def }, sideOf(e.player), 1600),
            ]);
          }
          break;
        }
        case "destroy": {
          if(originRiteDeaths.has(e.uid)||treasonExits.has(e.uid)||massacreDeaths.has(e.uid)){ghosts.get(e.uid)?.el.remove();ghosts.delete(e.uid);releaseMonster(e.uid);fieldCount[e.player]=Math.max(0,fieldCount[e.player]-1);break;}
          if(e.cause==='fusion'&&fusionMaterials.has(e.uid)){fieldCount[e.player]=Math.max(0,fieldCount[e.player]-1);break;}
          if([...hatches.values()].includes(e.uid)&&document.querySelector(`.zone-mon .card[data-uid="${CSS.escape(e.uid)}"]`)){heldEggs.add(e.uid);break;}
          const destroy=async()=>{
          const gh = ghosts.get(e.uid);
          const shelved=res.state.players[e.player].discard.some(c=>c.uid===e.uid);
          const exiled=res.state.players[e.player].removed?.find(c=>c.uid===e.uid);
          const live=gh?.el??combatCard(e.uid);
          if(shelved&&!exiled&&e.cause!=='decay'&&live&&!A.isFxSkipped()){
            // Keep a lethal counter's own face until its short return is complete.
            const returning=counterFinishes.get(e.uid);if(returning)await returning;
            if(!this.dead&&!A.isFxSkipped())void startCombatExit(live,sideOf(e.player),this.combatExits.signal).catch(error=>console.warn('[combat exit]',error));
            ghosts.delete(e.uid);
          }
          else if(exiled){await (gh?A.ghostDie(gh.el,gh.side,true,false,e.cause==='decay'):A.destroyAnim(e.uid,sideOf(e.player),true,false,e.cause==='decay'));if(gh&&!gh.el.closest(".zone-mon"))gh.el.remove();ghosts.delete(e.uid);}
          else if (gh) { await A.ghostDie(gh.el, gh.side,false,shelved,e.cause==='decay'); ghosts.delete(e.uid); }
          else await A.destroyAnim(e.uid, sideOf(e.player),false,shelved,e.cause==='decay');
          releaseMonster(e.uid);
          fieldCount[e.player] = Math.max(0, fieldCount[e.player] - 1);
          };
          if(elemental.size)elementalDeaths.push(destroy());else await destroy();
          break;
        }
        case 'counter': {
          const result=counterSurvival(events,i);let survival:Promise<void>|undefined;
          const playback=contactPlayback(contact=>A.counterStrike(e.uid,e.targetUid,contact,e.contactDamage),()=>{
            if(e.contactDamage>0)eventSound.contact(e.targetUid,e.targetPlayer);
            if(result&&!survival){counterGuts.add(result);gutsHits.add(result.uid);survival=A.gutsSurvive(result,sideOf(result.player));}
          });
          counterFinishes.set(e.uid,playback.finished);motionFinishes.push(playback.finished);
          await playback.contact;if(survival)motionFinishes.push(survival);
          break;
        }
        case "attack": {
          const tauntIndex=tauntRollIndex(events,i);
          if(tauntIndex>=0)await playDiceAt(tauntIndex);
          const evadeIndex=evasionRollIndex(events,i);
          if(evadeIndex>=0){
            await playDiceAt(evadeIndex);
            const roll=events[evadeIndex];
            if(roll.type==='dice'&&roll.success)break;
          }
          // The shared attack timeline owns launch/contact cues and local target recoil.
          const targetPlayer=e.targetPlayer ?? ((e.targetUid&&prev.players[e.player].field.some(m=>m.uid===e.targetUid)?e.player:1-e.player) as Side);
          const defender=sideOf(targetPlayer);
          const attacker=this.findCard(prev,e.uid)??this.findCard(res.state,e.uid),exhaust=res.state.players[e.player].field.find(m=>m.uid===e.uid)?.exhausted!==false;
          let survival:Promise<void>|undefined;
          const contact=()=>{eventSound.contact(e.targetUid,targetPlayer,e.contactDamage!==0);if(e.guts&&!survival)survival=A.gutsSurvive(e.guts,sideOf(e.guts.player));};
          const playback=contactPlayback(impact=>attacker?.id==='NGA4'?A.berserkStrike(e.uid,e.targetUid,e.player,this.you,targetPlayer,impact,exhaust,e.contactDamage):A.attackStrike(e.uid,e.targetUid,defender,impact,exhaust,e.contactDamage),contact);
          motionFinishes.push(playback.finished);await playback.contact;
          if(survival)motionFinishes.push(survival);
          // The dedicated material already owns this target's recoil at contact.
          if(e.guts)gutsHits.add(e.guts.uid);
          break;
        }
        case "gutsSurvive":
          if(!counterGuts.delete(e))await A.gutsSurvive(e,sideOf(e.player));
          break;
        case 'cullExile': {
          e.cards.forEach(({card})=>cullExits.add(card.uid));
          await A.exileCulls(e.cards,sideOf(e.player));
          break;
        }
        case "monsterActivate": {
          // Several sources reacting to the same event should be visible together.
          const uids = new Set([e.uid]);
          while (events[i + 1]?.type === 'monsterActivate') {
            const next = events[++i];
            if (next.type === 'monsterActivate') uids.add(next.uid);
          }
          await Promise.all([...uids].map(uid => A.monsterActivation(uid)));
          break;
        }
        case "hit": {
          const next=events[i+1],recoil=!gutsHits.delete(e.uid)&&!(next?.type==='gutsSurvive'&&next.uid===e.uid);
          const before=health.get(e.uid),after=before===undefined||e.amount===undefined?undefined:Math.max(0,before-e.amount);
          if(after!==undefined)health.set(e.uid,after);
          A.monHit(e.uid,e.amount,after,recoil);
          break;
        }
        case 'wheelResolve': {
          if(e.reroll)this.wheelReplayUid=e.uid;
          else {const held=this.wheelDice;try{await held?.finish();}finally{if(this.wheelDice===held)this.wheelDice=null;}}
          break;
        }
        case "dice": {
          await playDiceAt(i);
          const summons=dungeonFloorSummons(events,i);
          const cards=summons.flatMap(event=>{
            const card=this.findCard(res.state,event.uid)??this.defOf(event.id,event.uid);
            const grant=events.slice(i+1).find(ev=>ev.type==='decayCounterGrant'&&ev.uid===event.uid);
            return card?[grant?.type==='decayCounterGrant'?{...card,decayCnt:grant.before}:card]:[];
          });
          if(cards.length){
            const playback=A.startDungeonFloor(cards,sideOf(e.player),summonFaceFactory(res.state,e.player,this.you));
            motionFinishes.push(playback.done);
            cards.forEach((card,index)=>floorSessions.set(card.uid,{playback,last:index===cards.length-1}));
          }
          break;
        }
        case 'voidShot': {
          if(voidShotFinish)await voidShotFinish;
          const card=prev.players[e.player].hand.find(c=>c.id==='EXILE_NUKE1')??{...DB.EXILE_NUKE1,uid:'void-shot-source'};
          const heldIndex=this.elementalFaces.findIndex(x=>x.card.id==='EXILE_NUKE1'&&x.side===sideOf(e.player)&&x.node.isConnected);
          const held=heldIndex<0?undefined:this.elementalFaces.splice(heldIndex,1)[0].node;
          const nextShot=events.findIndex((next,j)=>j>i&&(next.type==='voidShot'||next.type==='playSpell'));
          const damage=events.slice(i+1,nextShot<0?events.length:nextShot).find((event):event is Extract<GameEvent,{type:'damage'}>=>event.type==='damage'&&!event.reversed&&!!event.srcKo?.includes('data-card="EXILE_NUKE1"'));
          const playback=contactPlayback(contact=>A.voidShotSpell(card,sideOf(e.player),e.count,contact,sideOf(e.target),held),()=>{
            if(this.dead||!damage||contactedDamage.has(damage))return;
            contactedDamage.add(damage);hpNow[damage.player]-=damage.amount;
            if(damage.player===this.you)this.view.pushIcon('hitme');
            const cue=eventSound.cue(damage);if(cue&&!A.isFxSkipped())sfx(cue);
            A.hpFeedback(sideOf(damage.player),'dmg',damage.amount);A.hpBarSet(sideOf(damage.player),hpNow[damage.player]);
          });
          voidShotFinish=playback.finished;motionFinishes.push(playback.finished);await playback.contact;
          break;
        }
        case "reverseDamage": {
          const damage=events.find((event):event is Extract<GameEvent,{type:'damage'}>=>event.type==='damage'&&event.reversed===true&&event.reverseId===e.id);
          const playback=contactPlayback(contact=>A.reverseDamage(sideOf(e.from),sideOf(e.to),e.sourceUids,contact),()=>{
            if(this.dead||!damage||contactedDamage.has(damage))return;
            contactedDamage.add(damage);hpNow[damage.player]-=damage.amount;
            if(damage.player===this.you)this.view.pushIcon('hitme');
            const cue=eventSound.cue(damage);if(cue&&!A.isFxSkipped())sfx(cue);
            A.hpBarSet(sideOf(damage.player),hpNow[damage.player]);
          });
          motionFinishes.push(playback.finished);await playback.contact;
          break;
        }
        case "damage": {
          if(isSoulHarvestDamage(e)){
            await A.soulHarvest(null,sideOf(e.player),e.amount,()=>{if(this.dead)return;hpNow[e.player]-=e.amount;A.hpBarSet(sideOf(e.player),hpNow[e.player]);});
            break;
          }
          hpNow[e.player] -= e.amount;
          if(!e.reversed)A.hpFeedback(sideOf(e.player), "dmg", e.amount);
          A.hpBarSet(sideOf(e.player), hpNow[e.player]);
          break;
        }
        case "heal": {
          const healed=Math.max(0,e.amount);
          hpNow[e.player] += healed;
          if(e.bloodRiteSources?.length){
            await A.bloodRiteRecovery(sideOf(e.player),e.bloodRiteSources,()=>{
              if(!this.dead)A.hpBarSet(sideOf(e.player),hpNow[e.player]);
            });
          }else{
            if(healed>0)A.hpFeedback(sideOf(e.player), "heal", healed);
            A.hpBarSet(sideOf(e.player), hpNow[e.player]);
            await wait(130);
          }
          break;
        }
        case "curseGenerated": {
          const card=prev.players[e.player].hand.find(c=>c.uid===e.sourceUid)??{...DB.BLACK_CURSE,uid:e.sourceUid};
          await A.curseSpell(card,sideOf(e.player),e.before);
          break;
        }
        case "nova": {
          const card=prev.players[e.player].hand.find(c=>c.id==='BLACK_NOVA')??{...DB.BLACK_NOVA,uid:'nova-source'};
          await A.novaTimeTheft(card,sideOf(e.player),e.from,hp=>{if(!this.dead)A.hpBarSet(sideOf(e.player),hp);});
          hpNow[e.player]=e.to;
          break;
        }
        case "playSpell": {
          const nextSpell=events.findIndex((next,j)=>j>i&&next.type==='playSpell');
          if(e.id==='BLACK_CURSE'&&events.slice(i+1,nextSpell<0?events.length:nextSpell).some(next=>next.type==='curseGenerated'&&next.player===e.player))break;
          if(e.id==='EXILE_NUKE1'&&events.slice(i+1,nextSpell<0?events.length:nextSpell).some(next=>next.type==='voidShot'&&next.player===e.player))break;
          // TIMEWARP uses the existing dice first; its typed success event owns the material reveal.
          if(e.id==='TIMEWARP'&&events.slice(i+1,nextSpell<0?events.length:nextSpell).some(next=>next.type==='dice'&&next.source.id==='TIMEWARP'))break;
          // A resolved Nova owns both the source reveal and its exit; a nullified cast keeps the ordinary reveal.
          if(e.id==='BLACK_NOVA'&&events.slice(i+1,nextSpell<0?events.length:nextSpell).some(next=>next.type==='nova'&&next.player===e.player))break;
          const grants=events.slice(i+1,nextSpell<0?events.length:nextSpell).some(next=>next.type==='statusGrant'||next.type==='decayCounterGrant');
          const def = DB[e.id] ?? STARTERS[e.id]; // 컬/어튠/보물상자 live in STARTERS
          if (def) {
            // Preserve the new public source UID so reactions during this batch can find its ghost.
            const oldUids=new Set([...prev.players[e.player].enchants,...(prev.players[e.player].quests??[])].map(x=>x.card.uid));
            const shownUids=new Set(spellGhosts.map(x=>x.dataset.uid));
            const placed=e.dest==='field'?[...res.state.players[e.player].enchants,...(res.state.players[e.player].quests??[])].find(x=>x.card.id===e.id&&!oldUids.has(x.card.uid)&&!shownUids.has(x.card.uid))?.card:undefined;
            const creation=def.id==='CREATION'?[...creationEvents.filter(c=>!c.copy),...creationGrants].find(c=>c.player===e.player&&c.sourceUid&&!creationSources.has(c.sourceUid)):undefined;
            if(creation?.sourceUid){
              const face=await A.revealCreation({...def,uid:creation.sourceUid},sideOf(e.player));
              if(face)creationSources.set(creation.sourceUid,face);
            }else if(def.id==='SOUL_HARVEST'){
              const damageIndex=soulHarvestDamageIndex(events,i);
              const damage=damageIndex>=0?events[damageIndex]:undefined;
              const harvest=damage?.type==='damage'?async(node:HTMLElement)=>{
                contactedDamage.add(damage);
                await A.soulHarvest(node,sideOf(damage.player),damage.amount,()=>{
                  if(this.dead)return;
                  hpNow[damage.player]-=damage.amount;A.hpBarSet(sideOf(damage.player),hpNow[damage.player]);
                  if(damage.player===this.you)this.view.pushIcon('hitme');
                });
              }:undefined;
              await A.revealSpell(placed??{uid:'soul-harvest-source',...def},sideOf(e.player),e.dest,undefined,false,undefined,harvest);
            }else if(def.id==='EXILE_NUKE2'){
              // Consume only this spell's first actual damage event at shell contact.
              // Reflections use the engine's target; echo hits and unrelated reactions remain sequential.
              const damage=events.slice(i+1,nextSpell<0?events.length:nextSpell).find((event):event is Extract<GameEvent,{type:'damage'}>=>event.type==='damage'&&!event.reversed&&!!event.srcKo?.includes('data-card="EXILE_NUKE2"'));
              const records=prev.players[e.player].removed??[];
              const card=prev.players[e.player].hand.find(c=>c.id===e.id)??{uid:'void-crystal-source',...def};
              await A.revealSpell(card,sideOf(e.player),e.dest,undefined,false,{
                count:e.riftCount??records.length,record:records.at(-1),target:damage?sideOf(damage.player):undefined,
                onImpact:()=>{
                  if(this.dead||!damage||contactedDamage.has(damage))return;
                  contactedDamage.add(damage);hpNow[damage.player]-=damage.amount;
                  if(damage.player===this.you)this.view.pushIcon('hitme');
                  const cue=eventSound.cue(damage);if(cue&&!A.isFxSkipped())sfx(cue);
                  A.hpFeedback(sideOf(damage.player),'dmg',damage.amount);A.hpBarSet(sideOf(damage.player),hpNow[damage.player]);
                },
              });
            }else if(def.id==='MASSACRE'){
              const deaths=events.slice(i+1,nextSpell<0?events.length:nextSpell).filter((event):event is Extract<GameEvent,{type:'destroy'}>=>event.type==='destroy'&&event.cause==='massacre');
              const nodes=deaths.map(event=>ghosts.get(event.uid)?.el??combatCard(event.uid));
              const card=prev.players[e.player].hand.find(c=>c.id===e.id&&!res.state.players[e.player].hand.some(n=>n.uid===c.uid))??{uid:'massacre-source',...def};
              const handled=nodes.every((n):n is HTMLElement=>!!n)&&await A.massacreSpell(card,sideOf(e.player),nodes as HTMLElement[],res.state.players[e.player].mana,Math.min(1,Math.max(0,prev.players[e.player].maxMana-3)),new Set((res.state.players[1-e.player].removed??[]).map(c=>c.uid)));
              if(handled){deaths.forEach(event=>massacreDeaths.add(event.uid));massacreCosts.add(e.player);}
              else await A.revealSpell(card,sideOf(e.player),e.dest);
            }else if(def.id==='CHOSEN_AREA'&&isChosenVictory(events,e.player)){
              const face=await A.revealSpell({uid:'chosen-source',...def},sideOf(e.player),e.dest,undefined,true);
              try{if(!this.dead&&!A.isFxSkipped())await playChosenVictory(sideOf(e.player),face);}finally{face?.remove();}
            }else if(['FIRE_ARROW','FIRE_METEOR','FIRE_BALL','FIRE_ZONE','FORBIDDEN','FLAME'].includes(def.id)){
              const card=prev.players[e.player].hand.find(c=>c.id===e.id)??{...def,uid:`elemental-${e.id}`};
              const node=await A.revealSpell(card,sideOf(e.player),e.dest,undefined,true);
              if(node){if(this.dead)node.remove();else this.elementalFaces.push({card,side:sideOf(e.player),node});}
            }else if(def.quick){
              // A purchase and playSpell describe the same card: reveal it once and defer its exit.
              if(!this.quickFaces.some(x=>x.card.id===e.id&&x.side===sideOf(e.player))){
                const card=res.state.players[e.player].removed?.find(c=>c.id===e.id&&!(prev.players[e.player].removed??[]).some(old=>old.uid===c.uid))??{uid:'fx',...def};
                const node=await A.revealSpell(card,sideOf(e.player),'vanish',undefined,true);
                if(node){if(this.dead)node.remove();else this.quickFaces.push({card,side:sideOf(e.player),node});}
              }
            }else if(e.dest==='discard'&&(grants||runeReplays.held.has(i))){
              const face=await A.revealSpell({uid:'status-source',...def},sideOf(e.player),e.dest,undefined,true);
              if(face){if(this.dead)face.remove();else{statusSource=face;this.elementalFaces.push({card:{uid:'status-source',...def},side:sideOf(e.player),node:face});}}
            }else{
              const face=await A.revealSpell(placed??{ uid: "fx", ...def }, sideOf(e.player), e.dest,buffCount[e.player]+(def.t==='quest'?questCount[e.player]:0));
              if(face){spellGhosts.push(face);if(def.t==='quest')questCount[e.player]++;else buffCount[e.player]++;}
            }
          }
          statusSource= this.elementalFaces.find(x=>x.card.id===e.id)?.node??this.quickFaces.find(x=>x.card.id===e.id)?.node??spellGhosts.at(-1)??statusSource;
          // random-roll cards: roll the 3D dice first, THEN show the outcome popup
          if (def && RANDOM_CARDS.has(def.id) && !["FIRE_ARROW","FIRE_METEOR","FORBIDDEN"].includes(def.id)) {
            for (let j = i + 1; j < events.length; j++) {
              const e2 = events[j];
              if (e2.type==='enchantActivate'&&DB[e2.id]?.ench==='runeEcho') break;
              if (e2.type === "playSpell" || e2.type === "trapSet" || e2.type === "trapReveal" || e2.type === "buy" || e2.type === "turnHeader" || e2.type === "win") break;
              if (e2.type === "dice" && !e2.evasion && !e2.taunt && !diceDone.has(j)&&!A.isFxSkipped()) {
                await playDiceAt(j);
              }
            }
            // Chest outcomes are already conveyed by the dice, board changes, and battle log.
            const lines = isChestCard(def) ? [] : this.effectLines(events, i);
            if (lines.length) {
              const mine = e.player === this.you;
              const title = (mine ? "" : `${t("fx.opp")} · `) + cardName({ uid: "fx", ...def });
              await A.resultPopup(title, lines, mine);
            }
          }
          break;
        }
        case "buy": {
          const def = DB[e.id];
          if (def) {
            const source=this.marketCardNode(e.from,e.i);
            const stock=Number(source?.querySelector('.mkt-stock')?.textContent?.replace('×',''))||1;
            const card=def.quick?res.state.players[e.player].removed?.find(c=>c.id===e.id&&!(prev.players[e.player].removed??[]).some(old=>old.uid===c.uid)):undefined;
            const shown=card??{uid:'fx',...def};
            const node=await A.buyReveal(shown,sideOf(e.player),source?.getBoundingClientRect()??null,source,e.from==='supply'?0:Math.max(0,stock-1),buyCost(prev.players[e.player],shown),res.state.effects?.[e.player]??(e.player===this.you?localCardEffect():'default'));
            if(node){if(this.dead)node.remove();else this.quickFaces.push({card:shown,side:sideOf(e.player),node});}
          }
          else A.pileFlash(e.player === this.you ? "pile-myDisc" : "pile-oppDisc");
          break;
        }
        case "reshuffle":
          await A.animateReshuffle(sideOf(e.player), e.count);
          break;
        case "draw": {
          const early=growthHands.get(i);
          if(early){
            const hand=document.getElementById(e.player===this.you?'hand':'oppHand'),previousHand=captureHandLayout(hand);
            this.view.presentDrawHand(res.state,e.player,early.hand);
            await A.animateDraw(hand,e.count,sideOf(e.player),{previousHand,uids:early.uids,durationScale:.55});
          }else{
            draws[e.player] += e.count;
            if(erosion.draws.has(i)){
              const pl=e.player,hand=document.getElementById(pl===this.you?'hand':'oppHand');
              const before=captureHandLayout(hand),old=new Set(prev.players[pl].hand.map(c=>c.uid));
              const count=events.reduce((n,event)=>n+(event.type==='draw'&&event.player===pl?event.count:0),0);
              const arrivalIds=new Set(arrivingHandUids(prev.players[pl].hand,res.state.players[pl].hand,count));
              const arrivals=res.state.players[pl].hand.filter(c=>arrivalIds.has(c.uid));
              const incoming=arrivals.slice(shownDraws[pl],shownDraws[pl]+draws[pl]);
              shownDraws[pl]+=draws[pl];
              const visible=new Set(arrivals.slice(0,shownDraws[pl]).map(c=>c.uid));
              this.view.presentDrawHand(res.state,pl,res.state.players[pl].hand.filter(c=>old.has(c.uid)||visible.has(c.uid)));
              await A.animateDraw(hand,draws[pl],sideOf(pl),{previousHand:before,uids:incoming.map(c=>c.uid),durationScale:.5});
              draws[pl]=0; // Already landed: do not draw these cards again at final render.
            }
          }
          break;
        }
        case "win":
          if(e.cause?.kind==='tribePact' && !this.dead && !A.isFxSkipped())
            await playTribePactDefeat(e.cause,sideOf(e.cause.player));
          break;
        case "treasure":
          // Reward effects have their own board events; no additional explanation popup.
          break;
        default:
          break; // log / turnHeader / win / needTarget — no board animation
      }
    }

    // Expiry and removal of public spells/quests often emit logs rather than destroy.
    await Promise.all(persistentShelfExits(prev,res.state,events).filter(({card})=>!treasonExits.has(card.uid)).map(async({player,card})=>{
      if(!A.isFxSkipped())sfx('death');
      await A.destroyAnim(card.uid,sideOf(player));
    }));

    await Promise.all([...motionFinishes,...grantFinishes]);
    if(this.dead)return;

    // Overflow picks emit logs only; animate the public zone delta before commit.
    for(const pl of [0,1] as Side[]){
      const inHand=new Set(prev.players[pl].hand.map(c=>c.uid));
      const previousDiscard=new Set(prev.players[pl].discard.map(c=>c.uid));
      const played=new Map<string,number>();
      for(const e of events)if(e.type==='playSpell'&&e.player===pl&&e.dest==='discard')played.set(e.id,(played.get(e.id)||0)+1);
      for(const c of res.state.players[pl].discard){
        if(!inHand.has(c.uid)||previousDiscard.has(c.uid)||fusionMaterials.has(c.uid))continue;
        const n=played.get(c.id)||0;if(n){played.set(c.id,n-1);continue;}
        // The picker already landed this exact card before submitting the pick.
        if(pl===this.you&&presentedHandDiscards.has(c.uid))continue;
        await A.discardFromHand(c,sideOf(pl));
      }
    }

    // Public removed-zone deltas cover void exits, culls and effect-driven exile.
    const animatedIds=[new Map<string,number>(),new Map<string,number>()];
    // Quick purchases also emit playSpell; count the exit only once, scoped to its owner.
    for(const e of events)if(e.type==='playSpell'&&e.dest==='vanish'){
      const ids=animatedIds[e.player];ids.set(e.id,(ids.get(e.id)||0)+1);
    }
    const infinityStored = new Set(events.flatMap(e => e.type === 'infinityStored' ? e.cardUids : []));
    const destroyed=new Set(events.filter(e=>e.type==='destroy').map(e=>e.uid));
    for(const pl of [0,1] as Side[]){
      const before=prev.players[pl];
      const old=new Set((before.removed??[]).map(c=>c.uid));
      const existed=new Set([...before.hand,...before.deck,...before.discard,...before.field,...before.enchants.map(e=>e.card),...before.traps.map(t=>t.card),...(before.quests??[]).map(q=>q.card),...before.exile.map(e=>e.card)].map(c=>c.uid));
      const generated:CardInst[]=[];
      for(const c of res.state.players[pl].removed??[]){
        if(old.has(c.uid)||cullExits.has(c.uid)||treasonExits.has(c.uid)||destroyed.has(c.uid)||infinityStored.has(c.uid)||creationExits.has(c.uid))continue;
        const n=animatedIds[pl].get(c.id)||0;if(n){animatedIds[pl].set(c.id,n-1);continue;}
        if(!existed.has(c.uid)){generated.push(c);continue;}
        await A.exileCard(c,sideOf(pl),document.querySelector<HTMLElement>(`.card[data-uid="${c.uid}"],.card--back[data-uid="${c.uid}"],.buff-icon[data-uid="${c.uid}"]`));
      }
      await A.exileGeneratedCards(generated,sideOf(pl));
    }

    // ---- state-diff celebrations: max mana / HP gains ----
    // Render authoritative targets first, then start the shared visual clock.
    // Only presentation waits; resource values in game state are already final.
    const effectFinishes:Promise<void>[]=[];
    const manaGains:Array<{side:A.ViewSide;amount:number}>=[];
    for (const pl of [0, 1] as Side[]) {
      if (this.dead) return;
      const dMana = res.state.players[pl].maxMana - prev.players[pl].maxMana;
      if (dMana > 0) manaGains.push({side:sideOf(pl),amount:dMana});
      else if (dMana < 0&&!massacreCosts.has(pl)) A.manaDrop(sideOf(pl), -dMana);
    }

    if (this.dead) return;
    let statFeedbackMs=0;
    if(this.quickFaces.length)for(const pl of [0,1] as Side[]){
      for(const mon of res.state.players[pl].field){
        const old=prev.players[pl].field.find(m=>m.uid===mon.uid);if(!old)continue;
        const atk=effAtk(res.state.players[pl],mon,res.state)!==effAtk(prev.players[pl],old,prev);
        const hp=effDef(res.state.players[pl],mon)!==effDef(prev.players[pl],old);
        if(atk||hp)statFeedbackMs=Math.max(statFeedbackMs,1800);
      }
    }
    const handLayouts=[draws[this.you]>0?captureHandLayout(document.getElementById('hand')):undefined,
      draws[1-this.you]>0?captureHandLayout(document.getElementById('oppHand')):undefined];
    const supplyFaces=!A.isFxSkipped()&&supplyWasRefreshed(prev,res.state)?captureSupplyFaces(this.view.root):undefined;
    // Stat animations belong to this batch too: automatic follow-ups must not
    // replace their source cards before all targets finish their shared motion.
    if(events.some(e=>e.type==='turnSkipped'&&e.source==='TIMEWARP'))this.view.syncTurn(res.state);
    const crisis=!A.isFxSkipped()&&fixedMarketWasReplaced(prev,res.state)?createMarketCrisis(this.view.root):undefined;
    this.marketCrisis=crisis;
    if(crisis)await crisis.destroy();
    if(this.dead){crisis?.cancel();return;}
    effectFinishes.push(this.view.render(res.state));
    if(crisis)effectFinishes.push(crisis.reveal().finally(()=>{if(this.marketCrisis===crisis)this.marketCrisis=undefined}));
    // The existing draw and HP feedback run alongside birth, once each. Public new
    // UIDs come from the reducer, so a same-name original never becomes a second copy.
    for(const born of creationEvents){
      const card=this.findCard(res.state,born.uid)??this.defOf(born.id,born.uid);
      if(card)effectFinishes.push(A.creationBirth(card,sideOf(born.player),born.sourceUid?creationSources.get(born.sourceUid)??null:null,born.copy));
    }
    for(const sourceUid of new Set(creationGrants.map(e=>e.sourceUid))){
      const grants=creationGrants.filter(e=>e.sourceUid===sourceUid),player=grants[0].player;
      const hand=document.getElementById(player===this.you?'hand':'oppHand');
      const nodes=[...hand?.querySelectorAll<HTMLElement>(player===this.you?'.card':'.card--back')??[]];
      const offset=Math.max(0,res.state.players[player].hand.length-nodes.length);
      const arrivals=grants.flatMap(e=>{const card=res.state.players[player].hand[e.handIndex],target=nodes[e.handIndex-offset];return card&&target?[{card:player===this.you?card:{uid:'hidden-creation-'+e.handIndex,id:'HIDDEN',t:'spell' as const,cost:0,name:'',text:''},target}]:[];});
      effectFinishes.push(A.creationHand(arrivals,sideOf(player),creationSources.get(sourceUid)??null));
    }
    if(supplyFaces){
      const refresh=playSupplyRefresh(this.view.root,supplyFaces);this.marketRefresh=refresh;
      effectFinishes.push(refresh.done.finally(()=>{if(this.marketRefresh===refresh)this.marketRefresh=undefined;}));
    }
    for(const gain of manaGains)effectFinishes.push(A.manaSurge(gain.side,gain.amount));
    // ghosts overlap the freshly-rendered real cards — drop them next frame
    requestAnimationFrame(() => {ghosts.forEach((g) => g.el.remove());spellGhosts.forEach(g=>g.remove());});
    await Promise.all(([0, 1] as Side[]).map(player => draws[player] > 0
      ? A.animateDraw(document.getElementById(player === this.you ? "hand" : "oppHand"), draws[player], sideOf(player),{previousHand:handLayouts[player===this.you?0:1],uids:player===this.you?arrivingHandUids(prev.players[player].hand,res.state.players[player].hand,draws[player]):undefined})
      : Promise.resolve()));

    // Pending targets can span multiple reducer batches. Keep the face until the last choice,
    // board update, draw and stat feedback have completed; do not change engine timing.
    if(this.quickFaces.length&&(!res.state.pending||res.state.over)){
      // Paired stat changes share the approved 1800 ms motion.
      await Promise.all([...effectFinishes,wait(statFeedbackMs)]);
      const finished=this.quickFaces.splice(0);
      await Promise.all(finished.map(x=>A.finishQuickSpell(x.node,x.side)));
    }

    await Promise.all(effectFinishes);
    if(this.elementalFaces.length&&(!res.state.pending||res.state.over)){
      await Promise.all(this.elementalFaces.splice(0).map(x=>A.finishElementalSpell(x.node,x.side)));
    }
    } finally { floorSessions.forEach(({playback})=>playback.cancel()); creationSources.forEach(node=>node.remove()); }
  }

  /** Plain-text log lines describing the effect right after events[idx] (for result popups). */
  private effectLines(events: GameEvent[], idx: number): string[] {
    const lines: string[] = [];
    for (let j = idx + 1; j < events.length && lines.length < 5; j++) {
      const e = events[j];
      if (e.type === "log") {
        const html = getLang() === "ja" ? e.htmlJa : getLang() === "en" ? logToEn(e.html) : e.html;
        const txt = this.stripHtml(html).replace(/^\s*└\s*/, "").trim();
        if (txt) lines.push(txt);
      } else if (e.type === "playSpell" || e.type === "trapSet" || e.type === "trapReveal" || e.type === "buy" || e.type === "turnHeader" || e.type === "win") {
        break; // next discrete action — effect scope ends
      }
    }
    return lines;
  }

  /** Log HTML → plain text. MUST localize the <b class="log-card"> anchors first:
   *  the engine writes Korean card names inside them and the battle log swaps them
   *  at render time, so naive textContent leaked Korean names into the Japanese
   *  effect-result popup / blocked-play toast / defeat cause. */
  private stripHtml(html: string): string { return logToText(html); }

  private defOf(id: string | undefined, uid: string): CardInst | null {
    if (!id) return null;
    const def = DB[id] ?? STARTERS[id];
    return def ? { uid, ...def } : null;
  }

  /** Find a field monster (either side) by uid in a given state. */
  private findCard(g: GameState, uid: string): CardInst | null {
    for (const pl of g.players) { const m = pl.field.find((x) => x.uid === uid); if (m) return m; }
    return null;
  }

  /** Bounding rect of a market/supply card slot at index i (pre re-render). */
  private marketCardNode(from: "market" | "supply", i: number): HTMLElement | null {
    const host = document.getElementById(from === "market" ? "fixedMarket" : "supplyMarket");
    // 고정 renders in order; 제시 is displayed SORTED, so match its ORIGINAL index via data attr
    const node = (from === "supply"
      ? host?.querySelector(`[data-sup-idx="${i}"]`)
      : host?.children[i]) as HTMLElement | undefined;
    return node??null;
  }

  private createWheelDice(roll:Extract<GameEvent,{type:'dice'}>,state:GameState,instant:boolean):WheelDice {
    const pending=state.pending;
    return openWheelDice(roll,pending?.owner===this.you,re=>{
      if(!this.dead && this.state.pending?.kind==='reroll' && this.state.pending.owner===this.you)this.submit({type:'pick',uid:re?'re':null});
    },instant);
  }

  private afterApply(res: ReduceResult): void {
    if(this.state.over)this.releaseOpening();
    if (!this.introShown && this.state && this.state.turn === 1 && !this.state.over) {
      const opening=this.state.opening;
      if(opening?.startsAt===null){
        const game=this.openingRoot.querySelector<HTMLElement>('.game');if(game){game.inert=true;game.classList.add('opening-hands');}
        if(!this.openingWait){this.openingWait=document.createElement('div');this.openingWait.className='opening-wait';this.openingWait.setAttribute('role','status');this.openingWait.textContent=getLang()==='ja'?'対戦相手の準備を待っています':getLang()==='en'?'Waiting for your opponent':'상대 준비를 기다리는 중';document.body.append(this.openingWait);}
        void this.prepareOpeningAssets().then(()=>{if(!this.dead&&!this.openingAbort.signal.aborted)this.openingPrepared();});
        return;
      }
      this.introShown = true;
      // Rejoins into an already playable turn (and old servers) skip the cinematic.
      if(this.state.mode!=='online'||opening?.playableAt!=null&&Date.now()-this.serverOffset<opening.playableAt){
        this.openingActive=true;void this.showCoinToss(this.state.cur);return;
      }
      this.releaseOpening();
    }
    if(this.openingActive&&!this.state.over)return;
    this.releaseOpening();
    if(!this.state.over)this.exits.onBattleReady?.();
    this.syncTimer();
    if (res.state !== this.state) return; // a newer batch is queued — let it drive follow-ups
    this.timewarp.sync(this.state);
    this.disposeHandDiscard?.();this.disposeHandDiscard=undefined;
    const g = this.state;
    if(this.castReviewState && this.castReviewState!==g && document.querySelector('.cast-review'))closeOverlay();
    if (g.over) { this.showWin(); return; }
    if(g.pending?.kind==='reroll'&&!this.wheelDice){
      const roll=g.pending.data?.dice as Extract<GameEvent,{type:'dice'}>|undefined;
      if(roll?.type==='dice')this.wheelDice=this.createWheelDice(roll,g,true);
    }
    // 다중 선택 pending (대숙청 purge / 흑룡 oppRmz / 신수 oppBoard) — 모달에서 한 번에
    // 고른 뒤 1장씩 순차 제출한다 (엔진 프로토콜은 그대로 1장씩 pick)
    const multiKind = g.pending && (g.pending.kind === "purge" || g.pending.kind === "oppRmz" || g.pending.kind === "oppBoard");
    if (!multiKind) {
      this.purgePicks = null; // 선택이 끝나면 큐 정리
      if (this.multiPickerOpen) { this.multiPickerOpen = false; closeOverlay(); } // v42: 시간 초과 자동 폐기 등으로 선택이 끝나면 모달도 닫는다
    }
    if (g.pending && actingSide(g) === this.you) {
      if(g.pending.reason==='handCap'){
        this.disposeHandDiscard=installHandDiscard(this.view.root,Number(g.pending.data?.val)||1,uid=>{
          this.presentedHandDiscards.add(uid);
          this.submit({type:'pick',uid});
        },()=>this.view.reflowHand());
        return;
      }
      if (g.pending.kind === "cardChoice") {
        const pending=g.pending;
        const rebirth=pending.reason==='QUICK_REBIRTH',lang=getLang();
        const title=rebirth?(lang==='ja'?'墓地からモンスターを選択':lang==='en'?'Choose a monster from your graveyard':'묘지에서 몬스터 선택'):(lang==='ja'?pending.hintJa:lang==='en'?logToEn(pending.hint):pending.hint);
        const description=rebirth?(lang==='ja'?'購入コスト7以下なら、虚無を付与して召喚します。コスト8以上は効果がありません。':lang==='en'?'A monster costing 7 or less is summoned with Void. Cost 8 or more has no effect.':'구매 비용이 7 이하면 허무를 부여하여 소환합니다. 비용이 8 이상이면 효과가 없습니다.'):undefined;
        cardPicker(title,effectChoices(g),uid=>{if(this.state===g)this.submit({type:'pick',uid});},!!pending.allowCancel,{confirm:true,description,label:rebirth?undefined:uid=>this.choiceOwner(g,uid)});
        return;
      }
      if (multiKind) {
        const handCap = g.pending.reason === "handCap"; // v42: 턴 종료 손패 이월 — 취소 불가, 정확히 n장
        if (this.purgePicks) {
          const next = this.purgePicks.shift();
          if (next !== undefined) { setTimeout(() => this.submit({ type: "pick", uid: next }), 0); return; }
          this.purgePicks = null;
          if (!handCap) { setTimeout(() => this.submit({ type: "pick", uid: null }), 0); return; } // 남은 pending 닫기
          // handCap: 아직 남은 장수가 있으면 아래로 진행해 다시 고르게 한다
        }
        const me = g.players[this.you];
        const opp = g.players[1 - this.you];
        let pool: CardInst[];
        if (g.pending.kind === "purge") {
          // 시련의 영역(trialExile): 묘지에서만 · 리프레시: 패에서만
          pool = purgeChoices(me, g.pending).filter(c=>handCap||!hasPassive(c,"relic")).sort((a, b) => a.cost - b.cost);
        }
        else if (g.pending.kind === "oppRmz") pool = [...(opp.removed ?? [])].sort((a, b) => a.cost - b.cost);
        else { // oppBoard: 상대 몬스터(아우라 제외) + 세트 함정(뒷면) + 영구마법 · 필터: noMon(함정·영구마법만) / trapOnly / enchOnly · anySide면 내 필드도 대상
          const dd = (g.pending.data ?? {}) as { noMon?: boolean; trapOnly?: boolean; enchOnly?: boolean; anySide?: boolean };
          const wantMon = !dd.noMon && !dd.trapOnly && !dd.enchOnly;
          const wantTrap = !dd.enchOnly;
          const wantEnch = !dd.trapOnly;
          pool = [
            ...(wantMon ? opp.field.filter((m) => !hasPassive(m, "aura")) : []),
            ...(wantTrap ? opp.traps.map((t2) => ({ uid: t2.card.uid, id: "HIDDEN", t: "trap", cost: 0, name: t("picker.settrap"), text: "?" } as CardInst)) : []),
            ...(wantEnch ? opp.enchants.map((e2) => e2.card) : []),
            // 내 필드 (자기 카드도 파괴 가능 — 내 세트 함정은 정체를 그대로 보여준다)
            ...(dd.anySide ? [
              ...(wantMon ? me.field : []),
              ...(wantTrap ? me.traps.map((t2) => t2.card) : []),
              ...(wantEnch ? me.enchants.map((e2) => e2.card) : []),
            ] : []),
          ];
        }
        const hint = getLang() === "ja" ? g.pending.hintJa : getLang() === "en" ? logToEn(g.pending.hint) : g.pending.hint;
        const max = Math.min((g.pending.data?.val as number) || 1, pool.length);
        this.multiPickerOpen = true;
        cardPickerMulti(hint, pool, max, (uids) => {
          this.multiPickerOpen = false;
          if (!uids.length) { if (!handCap) this.submit({ type: "pick", uid: null }); else this.afterApply({ state: this.state, events: [] }); return; } // 아무것도 안 고름 = 취소 (handCap은 다시 묻는다)
          this.purgePicks = uids.slice(1);
          this.submit({ type: "pick", uid: uids[0] });
        }, { exact: handCap, label:uid=>this.choiceOwner(g,uid) });
        return;
      }
      if (g.pending.kind === "giantShop") {
        // 시초의 거인: 코스트 5+ 시초 카드 구매 (지불 가능한 것만 제시)
        // 고대 문명(civChoice): 알 2종 중 1장 무료 선택
        const me = g.players[this.you];
        const opts = g.pending.data?.opts as { id: string; ko: string; ja: string; en: string }[] | undefined; // v37: 카드가 아닌 선택지(도박꾼 예측/효과)
        const free = g.pending.reason === "civChoice" || g.pending.reason === "exileOppDeck" || !!g.pending.data?.free || !!opts; // 은월포(v34)는 무료 지명
        const defOf = (id: string) => DB[id] ?? STARTERS[id];
        const ids = (g.pending.data?.ids as string[] | undefined) ?? [];
        const pool = opts
          ? opts.map((op) => ({ uid: op.id, id: "OPT", t: "spell", cost: 0, name: getLang() === "ja" ? op.ja : getLang() === "en" ? op.en : op.ko, text: "" } as CardInst))
          : ids.filter((id) => defOf(id) && (free || (defOf(id).cost <= me.mana && purchaseAllowed(g, me, { ...defOf(id), uid: id })))).map((id) => ({ uid: id, ...defOf(id) }));
        const hint = getLang() === "ja" ? g.pending.hintJa : getLang() === "en" ? logToEn(g.pending.hint) : g.pending.hint;
        if (!pool.length) { this.submit({ type: "pick", uid: null }); return; }
        cardPicker(hint, pool, (uid) => {if(this.state===g)this.submit({ type: "pick", uid });},g.pending.allowCancel,{confirm:true});
        return;
      }
      if (g.pending.kind === "reroll") {
        if(this.wheelDice)return;
        // 운명의 수레바퀴: 결과 유지 / 다시 굴리기
        void confirmDialog({ title: t("wheel.title"), body: t("wheel.body"), confirm: t("wheel.reroll"), cancel: t("wheel.keep") })
          .then((re) => this.submit({ type: "pick", uid: re ? "re" : null }));
        return;
      }
      // drag-to-attack: the defender was picked during the drag → answer immediately
      if (g.pending.kind === "oppMon" && g.pending.reason === "attack" && this.autoTarget) {
        const want = this.autoTarget; this.autoTarget = null;
        if (g.players[1 - this.you].field.some((m) => m.uid === want)) {
          setTimeout(() => this.submit({ type: "chooseTarget", uid: want }), 0);
          return;
        }
      }
      if (g.pending.kind === "seek" || g.pending.kind === "recall") {
        const me = g.players[this.you];
        // 리콜: 방금 사용한 리콜 카드 자신은 이미 묘지에 들어가 있다 → 선택지에서 제외
        const ex = (g.pending.data as { exclude?: string } | undefined)?.exclude;
        const pool = g.pending.kind === "seek" ? me.deck : me.discard.filter((c) => c.uid !== ex);
        cardPicker(getLang() === "ja" ? g.pending.hintJa : getLang() === "en" ? logToEn(g.pending.hint) : g.pending.hint, pool, (uid) => this.submit({ type: "pick", uid }));
      }
      return; // oppMon/myMon resolved by board clicks
    }
    // Server force-ended my turn (or the pending resolved elsewhere) while a
    // picker modal was still open — it would cover the board through the whole
    // opponent turn and any pick it submits is stale. Close pickers only; the
    // win/notice modals must survive this sweep.
    if (document.querySelector("#overlayRoot .picker-modal")) closeOverlay();
    this.maybeBot();
  }

  // ============================================================
  // turn timer — 50s/turn. Popups at 25s (1.5s) and a countdown from
  // 5s; the timer chip shakes at ≤5s; on 0 the active player's turn
  // auto-ends (online: only my own client submits, server validates).
  // ============================================================
  private syncTimer(announce = true): void {
    if (this.dead) return;
    if (!this.useTurnClock) { this.stopTimer(); return; }
    const g = this.state;
    if (!g || g.over) { this.stopTimer(); return; }
    const key = `${g.turn}:${g.cur}`;
    if (key !== this.timerKey) {
      this.timerKey = key;
      // full turn length for THIS turn: server-authoritative online (ranked 50 / casual 90),
      // else the local 90s default (bot / tutorial).
      this.turnTotal = g.turnTotalMs != null ? Math.round(g.turnTotalMs / 1000) : BaseController.LOCAL_TURN_SECS;
      // Online: trust the server's remaining-ms so a reconnecting client resumes the
      // same clock instead of restarting the turn. Bot mode has no turnLeftMs → full turn.
      this.timerLeft = g.turnLeftMs != null
        ? Math.max(1, Math.ceil(g.turnLeftMs / 1000))
        : this.turnTotal;
      this.turnStartedWall = Date.now();    // guard against a stale ~0 clock instantly skipping the turn
      // a reconnect straight into the discard choice: the server clock already includes the bonus
      this.handCapBonusKey = g.pending?.reason === "handCap" ? key : "";
      if (this.timerInt) clearInterval(this.timerInt);
      this.renderTimer();
      this.timerInt = window.setInterval(() => this.tickTimer(key), 1000);
    } else if (g.pending?.reason === "handCap" && this.handCapBonusKey !== key) {
      // v42: the end-turn hand-discard choice appeared → +10s to pick (server adds the same bonus online)
      this.handCapBonusKey = key;
      this.timerLeft += BaseController.HAND_CAP_BONUS_SECS;
      this.turnTotal += BaseController.HAND_CAP_BONUS_SECS;
      this.turnStartedWall = Date.now();
      this.renderTimer();
    } else if (g.turnLeftMs != null) {
      // SAME turn, fresh server snapshot (reconnect init / any update): adopt the
      // authoritative remaining time when the local countdown has drifted — a
      // background-throttled tab could otherwise show ~40s while the server had ~3s.
      // only the DOWNWARD correction: the snapshot can itself be a few seconds
      // stale after long event playback, so a higher server value proves nothing.
      const serverLeft = Math.max(1, Math.ceil(g.turnLeftMs / 1000));
      if (serverLeft < this.timerLeft - 3) {
        this.timerLeft = serverLeft;
        this.renderTimer();
      }
    }
    // Presentation still follows playback; synchronizing the clock on receipt must
    // not announce a new turn over the preceding action or the opening coin.
    if (announce && this.announcedTimerKey !== key) {
      const firstTurn = this.announcedTimerKey === "";
      this.announcedTimerKey = key;
      if (!firstTurn && g.cur === this.you) sfx("turn");
      if (!(firstTurn && g.turn === 1) && !document.querySelector(".cointoss-ov")) A.turnBanner(g.cur === this.you, g.turn);
    }
  }

  private tickTimer(key = this.timerKey): void {
    if (this.dead || this.state.over) { this.stopTimer(); return; }
    // A callback already queued before clearInterval belongs to its original turn.
    if (key !== this.timerKey) return;
    if (key !== `${this.state.turn}:${this.state.cur}`) { this.syncTimer(false); return; }
    this.timerLeft--;
    this.renderTimer();
    const s = this.timerLeft;
    if (s <= 0) {
      // never auto-end within the first ~2s of a turn — a stale/near-zero clock (e.g. after a
      // skip or a reconnect) must not instantly skip the turn; give the player real time.
      if (Date.now() - this.turnStartedWall < 2000) return;
      // only the active player's own client forces the end (server validates online)
      if (this.state.cur === this.you && !this.state.over) {
        if (this.state.pending) {
          // A pending target choice (e.g. attacking a monster at the last second) would
          // otherwise block auto-end and freeze the turn indefinitely. Cancel a cancelable
          // pending now; the next tick (still ≤0) then ends the turn. Non-cancelable
          // pendings must be resolved by the player.
          if (this.state.pending.allowCancel) this.onChooseTarget(null);
          else if (this.state.pending.reason === "handCap") { // v42: time's up → engine discards from the right
            if (this.timerInt) { clearInterval(this.timerInt); this.timerInt = null; }
            this.submit({ type: "endTurn" });
          }
        } else {
          if (this.timerInt) { clearInterval(this.timerInt); this.timerInt = null; }
          this.submit({ type: "endTurn" });
        }
      } else if (this.timerInt) { clearInterval(this.timerInt); this.timerInt = null; }
    }
  }

  private renderTimer(): void {
    const active = this.state.cur === this.you ? "me" : "opp";
    const other = active === "me" ? "opp" : "me";
    const clr = document.getElementById(`clock-${other}`);
    if (clr) { clr.className = "mp-clock"; clr.setAttribute("aria-hidden", "true"); clr.replaceChildren(); }
    const el = document.getElementById(`clock-${active}`);
    if (!el) return;
    const total = this.turnTotal;
    const s = Math.max(0, this.timerLeft);
    const mine = active === "me" && !this.state.over;
    paintDuelClock(el, s, total, mine);
  }

  private prepareOpeningAssets():Promise<void>{
    if(this.openingAssets)return this.openingAssets;
    this.openingAssets=(async()=>{
      let timer:ReturnType<typeof setTimeout>|undefined;
      let cancel=()=>{};
      const cancelled=new Promise<void>(resolve=>{cancel=resolve;this.openingAbort.signal.addEventListener('abort',cancel,{once:true});});
      try{await Promise.race([Promise.all([waitForDuel(this.openingRoot),warmOpening()]),cancelled]);}
      finally{clearTimeout(timer);this.openingAbort.signal.removeEventListener('abort',cancel);}
    })();return this.openingAssets;
  }

  private releaseOpening():void{
    this.openingRoot.classList.remove('opening-pending');
    this.openingWait?.remove();this.openingWait=null;
    const game=this.openingRoot.querySelector<HTMLElement>('.game');
    if(game){game.inert=false;game.classList.remove('opening-hands');}
  }

  private async showCoinToss(firstSide:Side):Promise<void>{
    const game=this.openingRoot.querySelector<HTMLElement>('.game');
    if(game){game.inert=true;game.classList.add('opening-hands');}
    try{
      await this.prepareOpeningAssets();
      if(this.dead||this.state.over||this.openingAbort.signal.aborted)return;
      this.openingWait?.remove();this.openingWait=null;
      const opening=this.state.opening,startsAt=opening?.startsAt;
      // Rejoining a server BOT room may mount without an opponent avatar. Resolve
      // its NPC from the authoritative state, just like the board portrait.
      const opponentAvatar=this.state.botDifficulty?botNpc(this.state.botDifficulty).avatar:COIN_OPP.avatar;
      await playDuelOpening({root:this.openingRoot,me:{...COIN_ME,name:this.state.players[this.you].name,medal:this.state.medals?.[this.you]},opp:{...COIN_OPP,avatar:opponentAvatar,name:this.state.players[(1-this.you) as Side].name,medal:this.state.medals?.[(1-this.you) as Side]},firstIsMe:firstSide===this.you,signal:this.openingAbort.signal,
        onStart:this.exits.onOpeningStart,
        elapsed:startsAt!=null?()=>Date.now()-this.serverOffset-startsAt:undefined,
        durationMs:startsAt!=null&&opening?.playableAt!=null?opening.playableAt-startsAt:undefined,
        onDeal:async signal=>{
          game?.classList.remove('opening-hands');
          await Promise.all([A.animateDraw(document.getElementById('hand'),3,'me',{signal}),A.animateDraw(document.getElementById('oppHand'),3,'opp',{signal})]);
        },
      });
      if(opening?.playableAt!=null){this.state.turnLeftMs=Math.max(0,(this.state.turnTotalMs??90000)-Math.max(0,Date.now()-this.serverOffset-opening.playableAt));}
    }catch(error){
      console.error('[duel opening]',error);
      // A failed renderer cannot move the authoritative first-turn deadline.
      const remaining=(this.state.opening?.playableAt??0)-(Date.now()-this.serverOffset);
      if(remaining>0&&!this.openingAbort.signal.aborted)await new Promise<void>(resolve=>{
        const finish=()=>{clearTimeout(timer);this.openingAbort.signal.removeEventListener('abort',finish);resolve();};
        const timer=setTimeout(finish,remaining);this.openingAbort.signal.addEventListener('abort',finish,{once:true});
      });
    }
    finally{
      this.openingActive=false;this.releaseOpening();
      if(!this.dead&&!this.state.over){
        if(this.state.turn===1)A.turnBanner(this.state.cur===this.you,1);
        this.afterApply({state:this.state,events:[]});
      }
    }
  }

  /** Centered popup explaining why a card can't be played (condition not met, etc.). */
  private cantPlayToast(msg: string): void {
    sfx("error");
    document.querySelectorAll(".cant-toast").forEach((n) => n.remove());
    const el = document.createElement("div");
    el.className = "cant-toast";
    el.innerHTML = `<span class="ct-x">✕</span>${msg}`;
    document.body.appendChild(el);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 300); }, 1700);
  }

  private stopTimer(): void {
    paintTurnUrgency(0,false);
    if (this.timerInt) { clearInterval(this.timerInt); this.timerInt = null; }
    this.timerKey = "";
    this.announcedTimerKey = "";
    for (const id of ["clock-me", "clock-opp"]) {
      const el = document.getElementById(id);
      if (el) { el.className = "mp-clock"; el.replaceChildren(); }
    }
  }

  protected showWin(): void {
    this.stopTimer();
    if (this.winShown || !this.state.over || this.outcomePending) return;
    this.winShown = true;
    const won: boolean | null = this.state.winner == null ? null : this.state.winner === this.you;
    sfx(won===null ? "drawGame" : won ? "win" : "lose");
    // bot games are client-local — report the result for analytics (online games are recorded server-side)
    if (this.state.mode === "bot") this.reportBotResult(won);
    aCapture("game_end", { mode: this.state.mode, won, turns: this.state.turn });
    this.openResult();
  }

  protected reportBotResult(_won: boolean | null): void {}
  private experienceNote = '';
  protected receiveExperience(receipt: ExperienceReceipt): void {
    this.exits.onExperience?.();
    if(this.dead)return;
    const progress=seekerLevel(receipt.after);
    this.experienceNote = `+${receipt.after-receipt.before} EXP · Lv.${progress.level}${progress.max?' MAX':''}${receipt.shards?` · +${receipt.shards} ${t('home.shards')}`:''}`;
    const el=document.getElementById('winExperience');if(el)el.textContent=this.experienceNote;
  }

  /** Result modal — reopenable from the review FAB so the log can be studied (복기). */
  private openResult(): void {
    A.removeReviewFab();
    const won: boolean | null = this.state.winner == null ? null : this.state.winner === this.you;
    const meHp = Math.max(0, this.state.players[this.you].hp);
    const oppHp = Math.max(0, this.state.players[1 - this.you].hp);
    const pactReason = this.state.defeatCause?.kind === "tribePact"
      ? tribePactVerdict(this.state.defeatCause.player === this.you ? "me" : "opp") : "";
    const detail = `${t("modal.hp.me")} ${meHp} · ${t("modal.hp.opp")} ${oppHp}`
      + (pactReason ? `<br><strong>${pactReason}</strong>` : "")
      + (this.resultNote ? `<br><span class="muted">${this.resultNote}</span>` : "")
      + `<br><span id="winExperience" class="muted">${this.experienceNote}</span>`;
    winModal(
      won,
      detail,
      () => { A.removeReviewFab(); this.exits.onRematch(); },
      () => { A.removeReviewFab(); this.exits.onHome(); },
      () => A.reviewFab(() => this.openResult()),
    );
    this.renderRankDelta(); // fill the ranked MMR line if we already have the result
  }

  /** One-line reason under the result HP line (e.g. "won by opponent disconnect").
   *  Set it BEFORE the modal opens when possible; setResultNote also patches an
   *  ALREADY-OPEN modal — the server's opponentLeft arrives after the win update. */
  protected resultNote?: string;
  protected setResultNote(note: string): void {
    this.resultNote = note;
    const el = document.getElementById("winDetail");
    if (el && !el.textContent?.includes(note)) el.innerHTML += `<br><span class="muted">${note}</span>`;
  }

  protected rankChange?: RankChange;
  protected receiveRankChange(change: RankChange): void {
    if (this.dead || this.rankChange) return;
    this.rankChange = change;
    this.rankPresentation.set(change);
  }
  protected retryRankResult(): void {}
  protected rankResultPending(slow = false): void { this.rankPresentation.pending(slow); }
  protected renderRankDelta(): void {
    if (!this.ranked && !this.rankChange) return;
    const el = document.getElementById("winRankDelta");
    if (el) this.rankPresentation.mount(el, () => this.retryRankResult());
  }

  private clearQuickFaces():void {this.elementalFaces.splice(0).forEach(x=>x.node.remove());this.quickFaces.splice(0).forEach(x=>x.node.remove());}

  destroy(): void {
    this.wheelDice?.close();this.wheelDice=null;
    this.timewarp.destroy();
    this.combatExits.abort();clearDamageFeedback();
    this.marketRefresh?.cancel();
    this.marketCrisis?.cancel();
    this.disposeHandDiscard?.();
    this.dead = true;
    disposeStatusExtinctions();
    this.rankPresentation.destroy();
    stopSounds();
    this.openingAbort.abort();this.releaseOpening();
    this.clearQuickFaces();
    A.setFxSkip(true);
    cancelDiceAnimations();
    document.querySelectorAll(".fx-turnbanner,.cointoss-ov,.fx-card-flight,.cast-veil").forEach(n => n.remove());
    this.stopTimer();
    this.view.destroy();
    A.closeZoom(); // a zoom left open would sit over the NEXT screen (its Esc handler dies below)
    document.removeEventListener("keydown", this.onKey);
    A.removeReviewFab();
    this.unsubLang();
    this.log.dispose();
  }
}

// ============================================================
// LocalController — single device, you vs bot
// ============================================================
const lastNpcDecks = new Map<string, number>();

export class LocalController extends BaseController {
  private botTimer = 0;
  private thinker = new BotThinker();
  private botBusy = false;
  private botDisposed = false;
  private difficulty: BotDifficulty;

  constructor(root: HTMLElement, exits: ControllerExits, playerName = "PLAYER 1", deck?: string[], difficulty: BotDifficulty = "hard") {
    super(root, 0, exits);
    this.difficulty = difficulty;
    const npc = botNpc(difficulty);
    const { index, deck: bot } = pickNpcDeck(npc, lastNpcDecks.get(npc.id));
    lastNpcDecks.set(npc.id, index);
    const res = createGame({
      mode: "bot",
      p0: { id: "local", name: playerName, deck },
      p1: { id: "bot", name: npc.name[getLang()], isBot: true, deck: bot.cards },
      starting: (Math.random() < 0.5 ? 0 : 1) as Side, // coin toss for first turn
    });
    res.state.medals=[COIN_ME.medal??null,null];
    res.state.players[1].botTune = bot.tune; // archetype-matched buy discipline (survives structuredClone in reduce)
    this.applyResult(res, false);
  }

  protected reportBotResult(won: boolean | null): void {
    const report = async () => {
      for(let attempt=0;attempt<3;attempt++){
        try { const result=await api.trackBot(won,this.difficulty);if(result.experience)this.receiveExperience(result.experience);else this.exits.onExperience?.();return; }
        catch { if(attempt<2)await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1))); }
      }
      if(!this.dead)this.setResultNote(t('progress.saveFailed'));
    };
    void report();
  }

  protected applyResult(res: ReduceResult, animate = true): void {
    syncCardEffects(res.state,this.you);
    if(res.state.over){clearTimeout(this.botTimer);this.thinker.destroy();}
    super.applyResult(res,animate);
  }

  protected submit(action: Action): void {
    if (this.state.over || action.type!=="surrender"&&this.openingLocked) return;
    // input is never locked during playback — so out-of-turn clicks (e.g. on a
    // stale board while the bot's turn plays out) must be rejected here
    if (action.type !== "surrender" && actingSide(this.state) !== this.you) return;
    this.applyResult(reduce(this.state, action));
  }

  protected maybeBot(): void {
    const g = this.state;
    if (g.over) { this.thinker.destroy(); return; }
    if (g.players[actingSide(g)].isBot) {
      clearTimeout(this.botTimer);
      // playback has already finished by the time afterApply runs — a short beat is enough
      this.botTimer = window.setTimeout(() => this.botStep(), g.pending ? 150 : 220);
    }
  }

  private botTurnNo = -1;
  private botTurnSteps = 0;
  private async botStep(): Promise<void> {
    const g = this.state;
    if (this.botDisposed || this.botBusy || g.over || !g.players[actingSide(g)].isBot) return;
    // 안전망: 봇이 한 턴에서 비정상적으로 많은 행동을 반복하면(거부 루프 등) 강제 턴 종료.
    // 정상 턴은 수십 액션 이내 — 200회는 버그가 아니면 도달 불가.
    if (g.turn !== this.botTurnNo) { this.botTurnNo = g.turn; this.botTurnSteps = 0; }
    if (++this.botTurnSteps > 200) {
      console.warn("[bot] loop guard — forcing endTurn on turn", g.turn);
      // Finish mandatory choices before ending the turn; endTurn is refused
      // while a non-cancellable target is pending.
      const action = g.pending
        ? legalBotAction(g, { type: 'pick', uid: null })
        : { type: 'endTurn' } as Action;
      this.applyResult(reduce(g, action));
      return;
    }
    this.botBusy = true;
    try {
      const action = await this.thinker.decide(g, this.difficulty);
      if (this.botDisposed || this.state !== g || g.over) return;
      this.applyResult(reduce(g, action ?? legalBotAction(g, safeGreedy(observationSample(g, actingSide(g), 0)))));
    } finally { this.botBusy = false; }

  }

  destroy(): void { this.botDisposed = true; clearTimeout(this.botTimer); this.thinker.destroy(); super.destroy(); }
}
