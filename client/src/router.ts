import {TUTORIAL_PARTS} from './shared/tutorialParts';
import {showUsernameSetup} from './ui/usernameSetup';
import {prepareMenuCache} from './ui/menuCache';
import { getLang } from './i18n';
import {releaseHomeSpirit} from './ui/homeSpirit';
import { loungeText } from './ui/loungeText';
import { mountTutorialWelcome } from './screens/tutorialWelcome';
import {coverScreen,isMenuReady,imageUrls} from './ui/assetReadiness';
import {showGraphicsNotice} from './ui/graphicsNotice';
import { mountLounge, type LoungePage } from "./ui/lounge";
import { startHomeMusic } from "./ui/homeMusic";
// ============================================================
// LORE — tiny screen router + auth/session context.
// ============================================================
import type { Side } from "./shared/types";
import type { BotDifficulty } from "./shared/bot";
import type { User } from "./net/api";
import { api } from "./net/api";
import { aIdentify, aReset, aCapture } from "./net/analytics";
import { setPresence, stopPresence } from "./net/presence";
import { saveActiveGame, loadActiveGame, clearActiveGame } from "./net/resume";
import { mountLogin } from "./screens/login";
import { mountHome } from "./screens/home";
import { mountLobby } from "./screens/lobby";
import { mountGame, mountGamePreparation } from "./screens/lazyGame";
import { mountTutorial, type TutorialOptions } from "./screens/tutorial";
import { mountCards } from "./screens/cards";
import { mountLeaderboard } from "./screens/leaderboard";
import { mountProfile, type ProfileTab } from "./screens/profile";
import { mountFriends } from "./screens/friends";
import {mountOnboarding,basicsPendingKey} from './screens/onboarding';
import type {TutorialAction} from './shared/tutorialLesson';
import { mountShop } from "./screens/shop";
import { mountDeck } from "./screens/deck";
import { LOCAL_GUEST_KEY, canUseLocalGuest, loadLocalDevDecks, loadLocalGuestProfile } from "./dev/localAccount";

export interface Screen { destroy?(): void; beforeLeave?(): Promise<boolean>; }

const HOME_MUSIC_PAGES = new Set<LoungePage>(["home", "deck", "cards", "leaderboard", "friends", "shop", "tutorial"]);

export class App {
  root: HTMLElement;
  user: User | null = null;
  private current: Screen | null = null;
  private leaveLounge: (() => void) | null = null;
  private stopHomeMusic: (() => void) | null = null;
  private navigating = false;
  private loggingOut = false;
  private homeEntranceShown = false;
  private cancelCover:(()=>void)|undefined;
  private closeGraphicsNotice:(()=>void)|undefined;
  private graphicsChecked = false;
  private screenRevision = 0;
  private currentPage?: LoungePage;
  private closeUsernameSetup?: () => void;

  constructor(root: HTMLElement) { this.root = root; }

  enterLocalGuest(): void {
    if (!canUseLocalGuest()) return;
    localStorage.setItem(LOCAL_GUEST_KEY, "1");
    const decks = loadLocalDevDecks();
    const profile = loadLocalGuestProfile();
    this.user = {
      id: "local-guest-user",
      email: "guest@local.test",
      display: "GUEST ARCHIVIST",
      wins: 47,
      losses: 19,
      credits: profile.credits,
      avatar: "M1",
      sleeve: profile.sleeve,
      decks,
      deck: decks.list[decks.sel].cards,
    };
    aIdentify(this.user.id, { verified: true, localGuest: true });
    this.home();
  }

  async start(session?: User | null): Promise<void> {
    // Bind the current release without downloading the catalogue. Normal visible
    // requests populate the verified content cache and survive screen/reload changes.
    void prepareMenuCache(()=>{},new AbortController().signal,[]).catch(()=>{});
    // Isolated admin origin (admin.yourlore.xyz) → dashboard only, nothing else.
    if (location.hostname.startsWith("admin.")) { const {mountAdmin}=await import("./screens/admin"); this.swap(() => mountAdmin(this)); return; }
    // On the game origin, /admin just bounces to the isolated admin host.
    if (location.pathname === "/admin") { location.href = `${location.protocol}//admin.${location.host.replace(/^www\./, "")}/`; return; }
    this.user = session !== undefined ? session : await api.me({ signal: AbortSignal.timeout(10000), strict: true });
    if (!this.user && canUseLocalGuest()) {
      const params = new URLSearchParams(location.search);
      const devLogin = params.get("devLogin");
      if (devLogin === "1") this.enterLocalGuest();
      if (devLogin === "0") localStorage.removeItem(LOCAL_GUEST_KEY);
      if (!this.user && localStorage.getItem(LOCAL_GUEST_KEY) === "1") this.enterLocalGuest();
    }
    if (this.user) {
      aIdentify(this.user.id, { verified: true });
      // crashed / closed mid-game? reconnect to the in-progress room instead of the home screen.
      this.afterLogin();
    } else this.login();
  }

  // Clear the root BEFORE mounting the next screen. (Passing a thunk matters:
  // the mount fn appends to root, so it must run after innerHTML is cleared.)
  private swap(make: () => Screen, page?: LoungePage): void {
    // Unconfirmed accounts enter the real HOME, then choose their public name.
    // Keep that HOME mounted while its entrance or naming dialog is active.
    if (this.user?.needsUsername) {
      if (this.currentPage === 'home') return;
      make = () => mountHome(this); page = 'home';
    }
    const mount = () => {
      const revision = ++this.screenRevision;
      this.closeUsernameSetup?.(); this.closeUsernameSetup = undefined;
      this.closeGraphicsNotice?.(); this.closeGraphicsNotice = undefined;
      this.currentPage = page;
      this.cancelCover?.();
      this.current?.destroy?.();
      this.leaveLounge?.(); this.leaveLounge = null;
      const keepHomeMusic = page !== undefined && HOME_MUSIC_PAGES.has(page);
      if (!keepHomeMusic) { this.stopHomeMusic?.(); this.stopHomeMusic = null; }
      this.root.innerHTML = "";
      this.current = make();
      if (keepHomeMusic && !this.stopHomeMusic) this.stopHomeMusic = startHomeMusic();
      if (page) {
        const onReady = () => {
          if (revision !== this.screenRevision) return;
          if (page === 'home' && this.user?.needsUsername) {
            this.closeUsernameSetup = showUsernameSetup(this, () => {
              this.closeUsernameSetup?.(); this.closeUsernameSetup = undefined;
              this.afterLogin(true);
            });
          } else this.checkGraphics(page, revision);
        };
        this.leaveLounge = mountLounge(this, page);
        const entrance=page==='home'&&!this.homeEntranceShown;
        // Admission belongs to startup. Later pages keep navigation usable while
        // their visible art loads; card galleries already own a local reveal gate.
        if(page==='login'||!isMenuReady()||entrance){
          const assets=imageUrls(this.root);
          const cover=coverScreen(this.root,page!=='login'&&!isMenuReady(),entrance,assets);this.cancelCover=cover.cancel;
          void cover.ready().then(ready=>{if(revision!==this.screenRevision)return;if(ready&&entrance)this.homeEntranceShown=true;if(ready)onReady();});
        } else onReady();
      }
    };
    if (this.navigating || this.loggingOut) return;
    if (this.current?.beforeLeave) {
      this.navigating = true;
      void this.current.beforeLeave().then(ok => { if (ok) mount(); }).finally(() => { this.navigating = false; });
    } else mount();
  }

  login(): void { this.swap(() => mountLogin(this), "login"); }
  home(): void { setPresence("menu"); this.swap(() => mountHome(this), "home"); }
  private checkGraphics(page: LoungePage | undefined, revision: number): void {
    if (revision !== this.screenRevision || this.graphicsChecked || (page !== 'login' && page !== 'home')) return;
    this.graphicsChecked = true;
    this.closeGraphicsNotice = showGraphicsNotice();
  }
  afterLogin(homeReady = false): void {
    if(this.user?.needsUsername){this.home();return;}
    const active=loadActiveGame(this.user?.id);
    if(active){this.onlineGame(active.roomId,active.you,"?",null,!!active.ranked);return;}
    if(!homeReady)this.home();
    if(!this.user || this.user.id==='local-guest-user')return;
    const id=this.user.id,revision=this.screenRevision;
    void Promise.all([api.tutorialStatus(),api.onboarding()]).then(([status,journey])=>{
      if(this.user?.id!==id || this.screenRevision!==revision)return;
      let pending=false;try{pending=!!localStorage.getItem(basicsPendingKey(id));}catch{}
      if(pending||journey.stage!=='basics'&&journey.stage!=='complete'){this.onboarding();return;}
      if(!status.offered)this.swap(()=>mountTutorialWelcome(this), 'tutorial');
      else if(homeReady)this.checkGraphics('home',revision);
    }).catch(()=>{
      if(this.user?.id!==id || this.screenRevision!==revision)return;
      const retry=document.createElement('button');retry.className='onboarding-retry';
      retry.textContent=loungeText('チュートリアル案内を読み込めませんでした。再試行','Could not load your tutorial invitation. Retry','튜토리얼 안내를 불러오지 못했어요. 다시 시도');
      retry.onclick=()=>this.afterLogin();this.root.append(retry);
    });
  }
  tutorial(options:TutorialOptions = {}): void { setPresence("menu"); this.swap(() => mountTutorial(this,options), "tutorial"); }
  tutorialGame(lesson = 0): void { setPresence("bot"); aCapture("game_start", { mode: "tutorial" }); this.swap(() => mountGame(this, { mode: "tutorial", lesson })); }
  tutorialPart(part = 0): void {
    const index=Number.isFinite(part)?Math.max(0,Math.min(TUTORIAL_PARTS.length-1,Math.floor(part))):0;
    setPresence('bot');aCapture('game_start',{mode:'tutorial_part',part:index+1});this.swap(()=>mountGame(this,{mode:'tutorial',part:index}));
  }
  cards(): void { setPresence("menu"); this.swap(() => mountCards(this), "cards"); }
  private startingBot=false;
  botGame(difficulty: BotDifficulty = "hard"): void {
    const live=loadActiveGame(this.user?.id);if(live)return this.onlineGame(live.roomId,live.you,'?',null,!!live.ranked);
    if(!this.user || this.user.id==='local-guest-user'){setPresence('bot');this.swap(()=>mountGame(this,{mode:'bot',difficulty}));return;}
    if(this.startingBot)return;this.startingBot=true;
    const account=this.user.id;
    this.swap(()=>mountGamePreparation(this,async()=>{
      try {
        const revision=this.screenRevision;
        const r=await api.startBot(difficulty,getLang());
        if(this.user?.id===account&&this.screenRevision===revision)this.onlineGame(r.roomId,r.you,r.oppName,r.oppAvatar,false,difficulty);
      } finally {this.startingBot=false;}
    },()=>{this.startingBot=false;}));
  }
  // entering a lobby with a live game still stored → rejoin it instead of re-queuing
  onlineLobby(): void { const g = loadActiveGame(this.user?.id); if (g) return this.onlineGame(g.roomId, g.you, "?", null, !!g.ranked); setPresence("queue"); this.swap(() => mountLobby(this), "lobby"); }
  rankedLobby(): void { const g = loadActiveGame(this.user?.id); if (g) return this.onlineGame(g.roomId, g.you, "?", null, !!g.ranked); setPresence("queue"); this.swap(() => mountLobby(this, true), "lobby"); }
  leaderboard(): void { setPresence("menu"); this.swap(() => mountLeaderboard(this), "leaderboard"); }
  profile(userId?: string, tab?: ProfileTab): void { setPresence("menu"); this.swap(() => mountProfile(this, userId, tab), "profile"); }
  friends(): void { setPresence("menu"); this.swap(() => mountFriends(this), "friends"); }
  settings(): void { this.profile(undefined, "settings"); } // settings now lives as a profile tab
  onboarding(actions?:TutorialAction[]):void {setPresence("menu");this.swap(()=>mountOnboarding(this,actions),"tutorial");}
  shop(options:Parameters<typeof mountShop>[1]={}): void { setPresence("menu"); this.swap(() => mountShop(this,options), "shop"); }
  deck(options:Parameters<typeof mountDeck>[1]={}): void { setPresence("menu"); this.swap(() => mountDeck(this,options), "deck"); }
  onlineGame(roomId: string, you: Side, oppName: string, oppAvatar: string | null = null, ranked = false, difficulty?: BotDifficulty): void {
    setPresence("online");
    aCapture("game_start", { mode: "online" });
    saveActiveGame(roomId, you, ranked, this.user?.id); // remember it so a crash/close can rejoin this exact room
    this.swap(() => mountGame(this, { mode: "online", roomId, you, oppName, oppAvatar, ranked, difficulty }));
  }

  async logout(): Promise<void> {
    if (this.loggingOut) return;
    this.loggingOut = true;
    try {
      if (this.user?.id === "local-guest-user") localStorage.removeItem(LOCAL_GUEST_KEY);
      else await api.logout();
    } finally { this.loggingOut = false; }
    // Only announce logout once the server has invalidated its HttpOnly session.
    // A failed request must retain the account and allow a visible retry.
    clearActiveGame();
    aReset();
    stopPresence();
    this.user = null;
    releaseHomeSpirit(this);
    this.login();
  }
}
