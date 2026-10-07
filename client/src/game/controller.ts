import { playIntent, needsCastReview, targetOwner } from '../shared/playIntent';
import {playDewGrant,warmDewGrant} from '../ui/dew/runtime';
import {playStatusGrant,warmStatusGrants} from '../ui/statusGrant/runtime';
import { botNpc, pickNpcDeck } from "../shared/botNpcs";
import {synergyTier} from '../ui/tribePresentation/selection';
import {playTribeSynergy} from '../ui/tribeSynergy/runtime';
import type {Playback} from '../ui/elemental/runtime';
import {persistentShelfExits} from './shelfExits';
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
// Events play back SEQUENTIALLY (summon → trap → destroy …) so the
// player can follow chains without reading the log.
// LocalController reduces locally and drives the bot.
// (OnlineController lives in ./online and reuses BaseController.)
// ============================================================
import type { Action, CardInst, GameEvent, GameState, ReduceResult, Side } from "../shared/types";
import { logToEn } from "../shared/logEn";
import { createGame, reduce, playCost, actingSide, effectChoices, purchaseAllowed, buyCost, effAtk, effDef } from "../shared/engine";
import { botDecide, type BotDifficulty } from "../shared/bot";
import { DB, STARTERS, hasPassive } from "../shared/cards";
import { GameView, type BoardHandlers } from "../ui/boardView";
import { GameLog, logToText } from "../ui/log";
import * as A from "../ui/anim";
import { reviewCast, cardPicker, cardPickerMulti, confirmDialog, treasureModal, winModal, closeOverlay, closeTreasureNotices } from "../ui/modal";
import { api } from "../net/api";
import { aCapture } from "../net/analytics";
import { sfx, stopSounds } from "../ui/sound";
import {EventSound} from "../ui/eventSound";
import { RankPresentation } from "../ui/rankPresentation";
import type { RankChange } from "../shared/rank";
import { t, getLang, cardName, onLangChange } from "../i18n";
import { diceRollAnim, cancelDiceAnimations } from "../ui/dice";

export interface ControllerExits {
  onHome(): void;
  onRematch(): void;
  onOpeningStart?(elapsedMs:number): void;
  onBattleReady?(): void;
}

// ---- coin-toss profiles (set by the game screen at mount): the two coin faces ----
interface CoinProfile { avatar: string | null; name: string; }
let COIN_ME: CoinProfile = { avatar: null, name: "YOU" };
let COIN_OPP: CoinProfile = { avatar: null, name: "OPP" };
export function setCoinProfiles(me: CoinProfile, opp: CoinProfile): void { COIN_ME = me; COIN_OPP = opp; }

/** Card IDs whose outcome is a random roll — surfaced as a result popup, not just a log line. */
import { RANDOM_CARDS } from "../shared/cards"; // 주사위·확률 카드 (결과 팝업 + 수레바퀴 재굴림 대상)

const wait = (ms: number): Promise<void> => A.fxWait(ms); // skippable: flushes when the player acts

export abstract class BaseController implements BoardHandlers {
  protected view: GameView;
  protected log: GameLog;
  protected state!: GameState;
  protected you: Side;
  protected exits: ControllerExits;
  private elementalFaces: {card:CardInst;side:A.ViewSide;node:HTMLElement}[] = [];
  private quickFaces: {card:CardInst;side:A.ViewSide;node:HTMLElement}[] = [];
  protected ranked = false;
  private rankPresentation = new RankPresentation();
  private winShown = false;
  private outcomePending = false;
  private dead = false;
  private queue: Promise<void> = Promise.resolve();
  private unsubLang: () => void;
  private fxGen = 0; // batches queued so far
  private skipGen = 0; // batches up to this gen fast-forward
  // ---- turn timer ----
  private timerKey = "";
  private timerLeft = 0;
  private timerInt: number | null = null;
  // bot/tutorial (and casual online fallback) use a 90s turn; online games get the
  // authoritative length from the server via g.turnTotalMs (ranked 50s / casual 90s).
  private static readonly LOCAL_TURN_SECS = 90;
  private static readonly HAND_CAP_BONUS_SECS = 10; // v42: end-turn hand-discard choice
  private turnTotal = 90; // full length of the CURRENT turn (for the ring's full-scale)
  private turnStartedWall = 0; // wall-clock ms when the current turn's timer started (anti instant-skip)
  private disposeHandDiscard:(()=>void)|undefined;
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
    this.you = you;
    this.exits = exits;
    this.view = new GameView(root, you, this);
    this.log = new GameLog(this.view.logEl);
    document.addEventListener("keydown", this.onKey);
    // re-render the board (labels + card names) when language changes
    this.unsubLang = onLangChange(() => { if (this.state) this.view.render(this.state); });
  }

  private onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { A.closeZoom(); if(this.state?.pending?.reason === "attack" && this.state.cur === this.you)this.onChooseTarget(null); } };

  // ---- the only mutation entry point (subclass decides how) ----
  protected abstract submit(action: Action): void;
  protected maybeBot(): void {}

  /** The player acted — fast-forward any still-playing batches so input never waits. */
  protected fastForward(): void {
    this.marketRefresh?.cancel();
    this.skipGen = this.fxGen;
    stopSounds();
    A.setFxSkip(true);
    cancelDiceAnimations();
    closeTreasureNotices();
  }

  // ---- BoardHandlers ----
  // Hand plays are looked up by uid (not index): the on-screen hand can be a
  // batch behind the logical state, and uids stay correct where indices drift.
  private castReviewState: GameState | null = null;
  async onPlay(uid: string) {
    this.fastForward();
    const before=this.state;
    if(this.dead || before.over || before.pending || before.cur!==this.you || this.castReviewState)return;
    const idx=before.players[this.you].hand.findIndex(c=>c.uid===uid),card=before.players[this.you].hand[idx];
    if(!card)return;
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
    const msg = g.cur !== this.you ? t("play.block.turn")
      : g.pending ? t("play.block.pending")
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
    this.view.syncTurn(res.state);
    this.state = res.state; // logical state advances immediately (input guards etc.)
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
    this.disposeHandDiscard?.();this.disposeHandDiscard=undefined;
    // Hold the existing complete board until newly exposed card art is decoded.
    if(prev!==res.state){this.view.setPlaying(true);try{await prepareStateArtwork(res.state,this.you,this.openingRoot);}finally{if(!this.dead)this.view.setPlaying(false);}}
    if(this.dead)return;
    // batches older than the player's latest action jump-cut; fresh ones play normally
    A.setFxSkip(gen <= this.skipGen);
    this.consumeLogs(res.events);
    if (!animate) {
      this.clearQuickFaces();
      this.view.render(res.state);
      this.afterApply(res);
      return;
    }
    this.view.setPlaying(true);
    try {
      await this.playEvents(prev, res, presentedHandDiscards);
    } finally {
      if (!this.dead) this.view.setPlaying(false);
      if (res.state.over) this.outcomePending = false;
    }
    // 기합(guts): 전투 파괴를 토큰으로 버틴 순간은 보드만 봐서는 모른다 — 배지로 명시
    if (!this.dead) {
      for (const pl of [0, 1] as const) {
        const before = new Map(prev.players[pl].field.map((m) => [m.uid, m]));
        for (const m of res.state.players[pl].field) {
          const b = before.get(m.uid);
          if (b && (b.guts ?? 0) > (m.guts ?? 0)) A.flashBadge(m.uid, `💢 ${t("fx.guts")}`, "good");
        }
      }
    }
    if (this.dead) return;
    this.afterApply(res);
  }

  private consumeLogs(events: GameEvent[]): void {
    for (const e of events) {
      if (e.type === "turnHeader") this.log.turnHeader(e.turn, e.name, e.isBot, e.player != null ? e.player === this.you : undefined);
      else if (e.type === "log") {
        // "can't play/attack" rejection lines are NOT written to the battle log (they'd
        // just spam it). Only the ACTING player gets a friendly popup. Online: the server
        // never even sends the opponent these; in bot mode this guard suppresses the bot's
        // blocked attempts (cur !== you).
        if (/불가|사용할 수 없|없습니다|가득|できません|cannot|not allowed/i.test(e.html)) {
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
    const events = res.events;
    const eventSound = new EventSound();
    const sideOf = (pl: Side): A.ViewSide => (pl === this.you ? "me" : "opp");
    const ghosts = new Map<string, { el: HTMLElement; side: A.ViewSide }>();
    const spellGhosts:HTMLElement[]=[];
    let statusSource:HTMLElement|undefined;
    const hasStatusGrants=events.some(e=>e.type==='statusGrant');
    if(events.some(e=>e.type==='statusGrant'&&e.resource!=='dew'))warmStatusGrants();
    if(events.some(e=>e.type==='statusGrant'&&e.resource==='dew'))warmDewGrant();
    const questCount=prev.players.map(p=>p.quests?.length??0);
    const buffCount=[prev.players[0].traps.length+prev.players[0].enchants.length,prev.players[1].traps.length+prev.players[1].enchants.length];
    // running counters for ghost slot placement + live HP readout
    const fieldCount: [number, number] = [prev.players[0].field.length, prev.players[1].field.length];
    const hpNow: [number, number] = [prev.players[0].hp, prev.players[1].hp];
    const elemental=new Map<string,Playback>();
    const elementalDeaths:Promise<void>[]=[];
    const draws = [0, 0];
    const diceDone = new Set<number>(); // dice events already animated (pre-rolled ahead of a result popup)

    for (let i = 0; i < events.length; i++) {
      if (this.dead) return;
      const e = events[i];
      // glanceable icon rail (topbar): key events → small icons
      if (e.type === "summon" || e.type === "attack" || e.type === "destroy" || e.type === "buy" || e.type === "draw" || e.type === "playSpell" || e.type === "trapReveal") this.view.pushIcon(e.type);
      else if (e.type === "damage" && e.player === this.you) this.view.pushIcon("hitme");
      else if (e.type === "heal" && e.player === this.you) this.view.pushIcon("heal");
      const cue = eventSound.cue(e);
      if(cue&&!A.isFxSkipped())sfx(cue);
      if(e.type==='trapReveal'||e.type==='turnHeader')statusSource=undefined;
      if(hasStatusGrants&&(e.type==='monsterActivate'||e.type==='enchantActivate'||e.type==='summon'))statusSource=document.querySelector<HTMLElement>(`[data-uid="${CSS.escape(e.uid)}"]`)??ghosts.get(e.uid)?.el;
      switch (e.type) {
        case 'statusGrant': {
          const source=e.sourceUid?(ghosts.get(e.sourceUid)?.el??document.querySelector<HTMLElement>(`[data-uid="${CSS.escape(e.sourceUid)}"]`)??undefined):statusSource;
          if(!A.isFxSkipped()){
            if(e.resource==='dew')await playDewGrant(sideOf(e.player),e.before,e.after,source);
            else await playStatusGrant(sideOf(e.player),e.resource,e.before,e.after,source);
          }
          break;
        }
        case 'elementalStart': {
          let source=this.elementalFaces.find(f=>f.card.id===e.id&&f.side===sideOf(e.player))?.node;
          if(!source&&e.id.startsWith('FIRE_')&&DB[e.id]&&!A.isFxSkipped()){
            const card={...DB[e.id],uid:e.uid};source=await A.revealSpell(card,sideOf(e.player),'discard',undefined,true)??undefined;
            if(source)this.elementalFaces.push({card,side:sideOf(e.player),node:source});
          }
          elemental.set(e.group,await A.beginElemental(e,this.you,source));break;
        }
        case 'elementalImpact': await elemental.get(e.group)?.impact(e.index);break;
        case 'elementalEnd': await elemental.get(e.group)?.finished;elemental.delete(e.group);await Promise.all(elementalDeaths.splice(0));break;
        case "enchantActivate":
          A.enchantActivation(e.uid);
          await wait(140);
          break;
        case "summon": {
          const card = this.findCard(res.state, e.uid) ?? this.defOf(e.id, e.uid);
          if (card) {
            const g = await A.ghostSummon(card, sideOf(e.player), fieldCount[e.player]);
            if (g) {ghosts.set(e.uid, { el: g, side: sideOf(e.player) });statusSource=g;}
          }
          fieldCount[e.player]++;
          await wait(65);
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
          const destroy=async()=>{
          const gh = ghosts.get(e.uid);
          const shelved=res.state.players[e.player].discard.some(c=>c.uid===e.uid);
          const exiled=res.state.players[e.player].removed?.find(c=>c.uid===e.uid);
          if(exiled){await (gh?A.ghostDie(gh.el,gh.side,true,false,e.cause==='decay'):A.destroyAnim(e.uid,sideOf(e.player),true,false,e.cause==='decay'));if(gh&&!gh.el.closest(".zone-mon"))gh.el.remove();ghosts.delete(e.uid);}
          else if (gh) { await A.ghostDie(gh.el, gh.side,false,shelved,e.cause==='decay'); ghosts.delete(e.uid); }
          else await A.destroyAnim(e.uid, sideOf(e.player),false,shelved,e.cause==='decay');
          releaseMonster(e.uid);
          fieldCount[e.player] = Math.max(0, fieldCount[e.player] - 1);
          };
          if(elemental.size)elementalDeaths.push(destroy());else await destroy();
          break;
        }
        case "attack": {
          // The shared attack timeline owns launch/contact cues and local target recoil.
          const defender = sideOf((1 - e.player) as Side);
          const attacker=this.findCard(prev,e.uid)??this.findCard(res.state,e.uid),exhaust=res.state.players[e.player].field.find(m=>m.uid===e.uid)?.exhausted!==false;
          if(attacker?.id==='NGA4'){
            const targetPlayer=(e.targetUid&&prev.players[e.player].field.some(m=>m.uid===e.targetUid)?e.player:1-e.player) as Side;
            await A.berserkStrike(e.uid,e.targetUid,e.player,this.you,targetPlayer,()=>eventSound.contact(e.targetUid,targetPlayer,e.contactDamage!==0),exhaust,e.contactDamage);
          }else await A.attackStrike(e.uid,e.targetUid,defender,()=>eventSound.contact(e.targetUid,(1-e.player) as Side,e.contactDamage!==0),exhaust,e.contactDamage);
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
        case "hit":
          A.monHit(e.uid);
          if(!elemental.size)await wait(110);
          break;
        case "dice":
          if (!diceDone.has(i)&&!A.isFxSkipped()) {
            diceDone.add(i);
            await diceRollAnim(e.rolls, { need: e.need, success: e.success, mine: e.player === this.you, casino: e.variant === "casino", source: e.source, viewer: this.you });
          }
          break;
        case "damage": {
          hpNow[e.player] -= e.amount;
          A.hpFeedback(sideOf(e.player), "dmg", e.amount);
          A.hpBarSet(sideOf(e.player), hpNow[e.player]);
          if(!elemental.size)await wait(140);
          break;
        }
        case "heal": {
          const healed=Math.max(0,e.amount);
          hpNow[e.player] += healed;
          if(healed>0)A.hpFeedback(sideOf(e.player), "heal", healed);
          A.hpBarSet(sideOf(e.player), hpNow[e.player]);
          await wait(130);
          break;
        }
        case "playSpell": {
          const nextSpell=events.findIndex((next,j)=>j>i&&next.type==='playSpell');
          const grants=events.slice(i+1,nextSpell<0?events.length:nextSpell).some(next=>next.type==='statusGrant');
          const def = DB[e.id] ?? STARTERS[e.id]; // 컬/어튠/보물상자 live in STARTERS
          if (def) {
            // Preserve the new public source UID so reactions during this batch can find its ghost.
            const oldUids=new Set([...prev.players[e.player].enchants,...(prev.players[e.player].quests??[])].map(x=>x.card.uid));
            const shownUids=new Set(spellGhosts.map(x=>x.dataset.uid));
            const placed=e.dest==='field'?[...res.state.players[e.player].enchants,...(res.state.players[e.player].quests??[])].find(x=>x.card.id===e.id&&!oldUids.has(x.card.uid)&&!shownUids.has(x.card.uid))?.card:undefined;
            if(['FIRE_ARROW','FIRE_METEOR','FIRE_BALL','FIRE_ZONE'].includes(def.id)){
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
            }else if(e.dest==='discard'&&grants){
              const face=await A.revealSpell({uid:'status-source',...def},sideOf(e.player),e.dest,undefined,true);
              if(face){if(this.dead)face.remove();else{statusSource=face;this.elementalFaces.push({card:{uid:'status-source',...def},side:sideOf(e.player),node:face});}}
            }else{
              const face=await A.revealSpell(placed??{ uid: "fx", ...def }, sideOf(e.player), e.dest,buffCount[e.player]+(def.t==='quest'?questCount[e.player]:0));
              if(face){spellGhosts.push(face);if(def.t==='quest')questCount[e.player]++;else buffCount[e.player]++;}
            }
          }
          statusSource= this.elementalFaces.find(x=>x.card.id===e.id)?.node??this.quickFaces.find(x=>x.card.id===e.id)?.node??spellGhosts.at(-1)??statusSource;
          // random-roll cards: roll the 3D dice first, THEN show the outcome popup
          if (def && RANDOM_CARDS.has(def.id) && !["FIRE_ARROW","FIRE_METEOR"].includes(def.id)) {
            for (let j = i + 1; j < events.length; j++) {
              const e2 = events[j];
              if (e2.type === "playSpell" || e2.type === "trapSet" || e2.type === "trapReveal" || e2.type === "buy" || e2.type === "turnHeader" || e2.type === "win") break;
              if (e2.type === "dice" && !diceDone.has(j)&&!A.isFxSkipped()) {
                diceDone.add(j);
                await diceRollAnim(e2.rolls, { need: e2.need, success: e2.success, mine: e2.player === this.you, casino: e2.variant === "casino", source: e2.source, viewer: this.you });
              }
            }
            const lines = this.effectLines(events, i);
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
            const node=await A.buyReveal(shown,sideOf(e.player),source?.getBoundingClientRect()??null,source,e.from==='supply'?0:Math.max(0,stock-1),buyCost(prev.players[e.player],shown));
            if(node){if(this.dead)node.remove();else this.quickFaces.push({card:shown,side:sideOf(e.player),node});}
          }
          else A.pileFlash(e.player === this.you ? "pile-myDisc" : "pile-oppDisc");
          break;
        }
        case "reshuffle":
          await A.animateReshuffle(sideOf(e.player), e.count);
          break;
        case "draw":
          draws[e.player] += e.count;
          break;
        case "treasure": {
          const mine = e.player === this.you && !e.isBot;
          const text = getLang() === "ja" ? e.textJa : getLang() === "en" ? logToEn(e.text) : e.text;
          treasureModal(e.kind, (mine ? "" : `${t("fx.opp")} · `) + text);
          break;
        }
        default:
          break; // log / turnHeader / win / needTarget — no board animation
      }
    }

    // Expiry and removal of public spells/quests often emit logs rather than destroy.
    await Promise.all(persistentShelfExits(prev,res.state,events).map(async({player,card})=>{
      if(!A.isFxSkipped())sfx('death');
      await A.destroyAnim(card.uid,sideOf(player));
    }));

    // Overflow picks emit logs only; animate the public zone delta before commit.
    for(const pl of [0,1] as Side[]){
      const inHand=new Set(prev.players[pl].hand.map(c=>c.uid));
      const previousDiscard=new Set(prev.players[pl].discard.map(c=>c.uid));
      const played=new Map<string,number>();
      for(const e of events)if(e.type==='playSpell'&&e.player===pl&&e.dest==='discard')played.set(e.id,(played.get(e.id)||0)+1);
      for(const c of res.state.players[pl].discard){
        if(!inHand.has(c.uid)||previousDiscard.has(c.uid))continue;
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
    const destroyed=new Set(events.filter(e=>e.type==='destroy').map(e=>e.uid));
    for(const pl of [0,1] as Side[]){
      const before=prev.players[pl];
      const old=new Set((before.removed??[]).map(c=>c.uid));
      const existed=new Set([...before.hand,...before.deck,...before.discard,...before.field,...before.enchants.map(e=>e.card),...before.traps.map(t=>t.card),...(before.quests??[]).map(q=>q.card),...before.exile.map(e=>e.card)].map(c=>c.uid));
      const generated:CardInst[]=[];
      for(const c of res.state.players[pl].removed??[]){
        if(old.has(c.uid)||destroyed.has(c.uid))continue;
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
      else if (dMana < 0) A.manaDrop(sideOf(pl), -dMana);
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
    effectFinishes.push(this.view.render(res.state));
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
    if(!this.state.over)this.exits.onBattleReady?.();
    this.syncTimer();
    if (res.state !== this.state) return; // a newer batch is queued — let it drive follow-ups
    this.disposeHandDiscard?.();this.disposeHandDiscard=undefined;
    const g = this.state;
    if(this.castReviewState && this.castReviewState!==g && document.querySelector('.cast-review'))closeOverlay();
    if (g.over) { this.showWin(); return; }
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
        cardPicker(getLang()==='ja'?pending.hintJa:getLang()==='en'?logToEn(pending.hint):pending.hint, effectChoices(g), uid => {if(this.state===g)this.submit({ type: "pick", uid });}, !!pending.allowCancel, {confirm:true,label:uid=>this.choiceOwner(g,uid)});
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
          const zone = g.pending.data?.zone;
          pool = (zone === "hand" ? [...me.hand] : zone === "discard" ? [...me.discard] : [...me.deck, ...me.discard]).filter(c=>handCap||!hasPassive(c,"relic")).sort((a, b) => a.cost - b.cost);
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
  private syncTimer(): void {
    if (this.dead) return;
    const g = this.state;
    if (!g || g.over) { this.stopTimer(); return; }
    const key = `${g.turn}:${g.cur}`;
    if (key !== this.timerKey) {
      const firstTurn = this.timerKey === "";
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
      if (!firstTurn && g.cur === this.you) sfx("turn"); // my turn begins
      // The opening announcement belongs AFTER the coin, never underneath it.
      // Reconnected games beyond turn 1 still announce their current turn.
      if (!(firstTurn && g.turn === 1) && !document.querySelector(".cointoss-ov")) A.turnBanner(g.cur === this.you, g.turn);
      if (this.timerInt) clearInterval(this.timerInt);
      this.renderTimer();
      this.timerInt = window.setInterval(() => this.tickTimer(), 1000);
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
  }

  private tickTimer(): void {
    if (this.dead || this.state.over) { this.stopTimer(); return; }
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
      await playDuelOpening({root:this.openingRoot,me:{...COIN_ME,name:this.state.players[this.you].name},opp:{...COIN_OPP,name:this.state.players[(1-this.you) as Side].name},firstIsMe:firstSide===this.you,signal:this.openingAbort.signal,
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
    if (this.timerInt) { clearInterval(this.timerInt); this.timerInt = null; }
    this.timerKey = "";
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
    if (this.state.mode === "bot") void api.trackBot(won);
    aCapture("game_end", { mode: this.state.mode, won, turns: this.state.turn });
    this.openResult();
  }

  /** Result modal — reopenable from the review FAB so the log can be studied (복기). */
  private openResult(): void {
    A.removeReviewFab();
    const won: boolean | null = this.state.winner == null ? null : this.state.winner === this.you;
    const meHp = Math.max(0, this.state.players[this.you].hp);
    const oppHp = Math.max(0, this.state.players[1 - this.you].hp);
    const detail = `${t("modal.hp.me")} ${meHp} · ${t("modal.hp.opp")} ${oppHp}`
      + (this.resultNote ? `<br><span class="muted">${this.resultNote}</span>` : "");
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
    this.marketRefresh?.cancel();
    this.disposeHandDiscard?.();
    this.dead = true;
    this.rankPresentation.destroy();
    stopSounds();
    this.openingAbort.abort();this.releaseOpening();
    this.clearQuickFaces();
    A.setFxSkip(true);
    cancelDiceAnimations();
    closeTreasureNotices();
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
    res.state.players[1].botTune = bot.tune; // archetype-matched buy discipline (survives structuredClone in reduce)
    this.applyResult(res, false);
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
    if (g.over) return;
    if (g.players[actingSide(g)].isBot) {
      clearTimeout(this.botTimer);
      // playback has already finished by the time afterApply runs — a short beat is enough
      this.botTimer = window.setTimeout(() => this.botStep(), g.pending ? 150 : 220);
    }
  }

  private botTurnNo = -1;
  private botTurnSteps = 0;
  private botStep(): void {
    const g = this.state;
    if (g.over || !g.players[actingSide(g)].isBot) return;
    // 안전망: 봇이 한 턴에서 비정상적으로 많은 행동을 반복하면(거부 루프 등) 강제 턴 종료.
    // 정상 턴은 수십 액션 이내 — 200회는 버그가 아니면 도달 불가.
    if (g.turn !== this.botTurnNo) { this.botTurnNo = g.turn; this.botTurnSteps = 0; }
    if (++this.botTurnSteps > 200) {
      console.warn("[bot] loop guard — forcing endTurn on turn", g.turn);
      this.applyResult(reduce(g, g.pending?.allowCancel ? ({ type: "pick", uid: null } as Action) : ({ type: "endTurn" } as Action)));
      return;
    }
    const action = botDecide(g, this.difficulty);
    this.applyResult(reduce(g, action));
  }

  destroy(): void { clearTimeout(this.botTimer); super.destroy(); }
}
