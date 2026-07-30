// ============================================================
// LORE — post-login HOME. Choose Random Online or Bot match.
// ============================================================
import type { App, Screen } from "../router";
import type { BotDifficulty } from "../shared/bot";
import type { CardInst, CardType } from "../shared/types";
import { api, type FriendEntry, type LbEntry, type RankInfo } from "../net/api";
import { t, getLang, onLangChange } from "../i18n";
import { tierChipHtml, tierLabel } from "../ui/tier";
import { avatarHtml } from "../ui/social";
import { watchSocial } from "./friends";
import { DB, DECK_MAX_COPIES, DECK_POOL, DECK_SIZE, DECK_SLOTS, SLEEVE_LIST, SLEEVES, STARTERS, sanitizeDecks } from "../shared/cards";
import { cardEl } from "../ui/cardView";
import { zoomCard } from "../ui/anim";
import { noticeModal } from "../ui/modal";

const HOME_ALL_CARDS: CardInst[] = [...Object.values(DB), ...Object.values(STARTERS)]
  .map((d) => ({ ...d, uid: d.id }))
  .sort((a, b) => {
    const order: Record<CardType, number> = { mon: 0, spell: 1, trap: 2, starter: 3 };
    if (order[a.t] !== order[b.t]) return order[a.t] - order[b.t];
    if (a.cost !== b.cost) return a.cost - b.cost;
    return a.id.localeCompare(b.id);
  });

type HomeCardTypeFilter = "all" | CardType;

export function mountHome(app: App): Screen {
  const u = app.user;
  new Image().src = "/ui/panel-frame-lit.webp"; // preload hover frame (no first-hover flash)
  const wrap = document.createElement("div");
  wrap.className = "screen";
  // Restore the original archive shell; live content is layered over its parchment page.
  wrap.style.cssText = "background:#050308 url('/bg/archive-library-codex-sidebar-paper-wide-clean-sidebar-v8.webp') center center/100% 100% no-repeat;";
  wrap.innerHTML = `
    <div class="home home-field home-archive home-archive-exact">
      <div class="archive-centered-shell" aria-hidden="true"></div>
      <div class="archive-content-layer" data-section="ranked" aria-label="${t("arch.mode.ranked")}">
        <div class="archive-ranked-header-slot">
          <div class="archive-ranked-header-copy">
            <h1 id="archiveBattleHeaderTitle">${t("arch.mode.ranked")}</h1>
            <p class="archive-ranked-header-description" id="archiveBattleHeaderDescription">${t("arch.head.ranked.desc")}</p>
          </div>
          <img class="archive-ranked-header-wordmark" src="/art/brand/lore-archive-header-wordmark.webp" alt="LORE">
          <div class="archive-ranked-header-divider" aria-hidden="true"></div>
        </div>
        <section class="archive-season-rank" aria-label="${t("arch.season.title")}">
          <header class="archive-season-rank-head"><h2>${t("arch.season.title")}</h2></header>
          <div class="archive-season-rank-main">
            <img class="archive-season-rank-emblem" id="archiveSeasonRankEmblem" src="/art/tiers/iron.webp" alt="${t("arch.tierAlt").replace("{t}", tierLabel("iron"))}">
            <dl class="archive-season-rank-summary">
              <div><dt>${t("arch.tier")}</dt><dd id="archiveSeasonTier">${tierLabel("iron")}</dd></div>
              <div><dt>${t("arch.points")}</dt><dd id="archiveSeasonPoints">${t("arch.pts").replace("{n}", "0")}</dd></div>
              <div><dt>${t("arch.position")}</dt><dd id="archiveSeasonPosition">-</dd></div>
            </dl>
          </div>
          <footer class="archive-season-rank-stats">
            <div><span>${t("arch.wins")}</span><b id="archiveSeasonWins">0</b></div>
            <div><span>${t("arch.losses")}</span><b id="archiveSeasonLosses">0</b></div>
            <div><span>${t("arch.winrate")}</span><b id="archiveSeasonWinRate">0%</b></div>
          </footer>
        </section>
        <section class="archive-normal-record" aria-label="${t("arch.normal.title")}">
          <header class="archive-normal-record-head"><h2>${t("arch.normal.title")}</h2></header>
          <div class="archive-normal-record-main">
            ${avatarHtml(u?.avatar, u?.display ?? "G", 74)}
            <div class="archive-normal-record-profile">
              <b>${u?.display ?? t("arch.defaultName")}</b>
              <span>${t("arch.normal.sub")}</span>
              <dl>
                <div><dt>${t("arch.wins")}</dt><dd id="archiveNormalWins">0</dd></div>
                <div><dt>${t("arch.losses")}</dt><dd id="archiveNormalLosses">0</dd></div>
                <div><dt>${t("arch.winrate")}</dt><dd id="archiveNormalWinRate">0%</dd></div>
              </dl>
            </div>
          </div>
        </section>
        <section class="archive-bot-guide" aria-label="${t("arch.mode.bot")}">
          <header class="archive-bot-guide-head"><h2>${t("arch.mode.bot")}</h2></header>
          <div class="archive-bot-guide-main">
            <b>${t("arch.bot.practice")}</b>
            <p>${t("arch.bot.desc")}</p>
            <section class="archive-bot-difficulty" aria-label="${t("bot.diff.title")}">
              <header><h2>${t("bot.diff.title")}</h2></header>
              <div class="archive-bot-difficulty-grid">
                <button type="button" class="archive-bot-difficulty-button" data-difficulty="easy"><b>${t("bot.diff.easy")}</b><span>${t("arch.diff.easy.sub")}</span></button>
                <button type="button" class="archive-bot-difficulty-button is-selected" data-difficulty="normal"><b>${t("bot.diff.normal")}</b><span>${t("arch.diff.normal.sub")}</span></button>
                <button type="button" class="archive-bot-difficulty-button" data-difficulty="hard"><b>${t("bot.diff.hard")}</b><span>${t("arch.diff.hard.sub")}</span></button>
                <button type="button" class="archive-bot-difficulty-button" data-difficulty="hell"><b>${t("bot.diff.hell")}</b><span>${t("arch.diff.hell.sub")}</span></button>
              </div>
            </section>
          </div>
        </section>
        <section class="archive-leaderboard-panel" aria-label="${t("home.lb.title")}">
          <header class="archive-leaderboard-hall-head"><h2>${t("arch.hall.title")}</h2><span id="archiveLeaderboardSeason">${t("arch.hall.season")}</span></header>
          <div class="archive-leaderboard-hall" id="archiveLeaderboardHall"></div>
          <header class="archive-leaderboard-table-head"><span>${t("arch.position")}</span><span>${t("arch.lb.player")}</span><span>${t("arch.tier")}</span><span>${t("arch.lb.rating")}</span><span>${t("arch.lb.wins")}</span></header>
          <div class="archive-leaderboard-table" id="archiveLeaderboardTable"></div>
        </section>
        <button class="archive-ranked-start" id="archiveMatchStart" type="button" aria-label="${t("arch.startGame")}"><span>${t("arch.start.l1")}</span><span>${t("arch.start.l2")}</span></button>
        <section class="archive-current-deck" aria-label="${t("deck.current")}">
          <header class="archive-current-deck-head">
            <h2>${t("deck.current")}</h2>
            <div class="archive-current-deck-tabs" id="archiveRankDeckTabs" aria-label="${t("arch.deck.pickSaved")}"></div>
            <button class="archive-current-deck-change" id="archiveChangeDeck" type="button">${t("arch.deck.apply")}</button>
          </header>
          <p class="archive-current-deck-name" id="archiveRankDeckName">${t("deck.slot").replace("{n}", "1")}</p>
          <div class="archive-live-deck-row" id="archiveLiveDeck" aria-label="${t("arch.deck.cardsAria")}"></div>
        </section>
      </div>
      <aside class="archive-left">
        <img class="archive-sidebar-wordmark" src="/art/brand/lore-archive-header-wordmark.webp" alt="LORE">
        <div class="archive-menu">
          <button class="archive-menu-item is-active" id="ranked" data-mode="ranked">
            <span>${t("arch.mode.ranked")}</span>
          </button>
          <button class="archive-menu-item" id="online" data-mode="online">
            <span>${t("arch.mode.online")}</span>
          </button>
          <button class="archive-menu-item" id="bot" data-mode="bot">
            <span>${t("arch.mode.bot")}</span>
          </button>
          <button class="archive-menu-item" id="single">
            <span>${t("arch.menu.single")}</span>
          </button>
          <button class="archive-menu-item" id="deck">
            <span>${t("arch.menu.deckbuild")}</span>
          </button>
          <button class="archive-menu-item" id="cards">
            <span>${t("cards.title")}</span>
          </button>
          <button class="archive-menu-item" id="lb">
            <span>${t("home.lb.title")}</span>
          </button>
          <button class="archive-menu-item" id="tutorial">
            <span>${t("home.tutorial.title")}</span>
          </button>
          <button class="archive-menu-item" id="shop">
            <span>${t("shop.title")}</span>
          </button>
          <button class="archive-menu-item" id="invite">
            <span>${t("arch.menu.invite")}</span>
          </button>
        </div>
      </aside>

      <header class="archive-top">
        <button class="archive-top-control archive-top-profile" id="profile" title="${t("home.profile.title")}">
          ${avatarHtml(u?.avatar, u?.display ?? "P", 42)}
          <span class="archive-top-profile-name">${u?.display ?? t("arch.defaultName")}</span>
        </button>
        <button class="archive-top-control archive-top-currency" id="credits" title="${t("home.shop.title")}">
          <img class="archive-top-gem" src="/ui/shop-diamond.webp" alt="" aria-hidden="true"><b>${u?.credits ?? 0}</b>
        </button>
        <button class="archive-top-control archive-top-icon archive-top-friends" id="archiveFriendsButton" title="${t("friends.title")}" aria-expanded="false" aria-controls="archiveFriendsPanel">
          <span class="archive-top-friends-icon" aria-hidden="true"></span><span class="archive-top-badge" id="friendBadge" hidden></span>
        </button>
        <button class="archive-top-control archive-top-icon archive-top-settings" id="settings" title="${t("settings.title")}">
          <span aria-hidden="true">⚙</span>
        </button>
      </header>
      <aside class="archive-message-panel archive-friends-panel" id="archiveFriendsPanel" hidden aria-label="${t("friends.title")}">
        <div class="archive-message-panel-head"><b>${t("friends.title")}</b><button id="archiveFriendsClose" aria-label="${t("arch.close")}">×</button></div>
        <div class="archive-friends-list" id="archiveFriendsList"><p>${t("arch.friends.loading")}</p></div>
      </aside>

      <main class="archive-book" aria-label="ranked archive dossier">
        <div class="archive-page-tabs" aria-hidden="true">
          <span class="is-active" data-mode="ranked"><b>I</b><small>RANKED</small></span>
          <span data-mode="online"><b>II</b><small>NORMAL</small></span>
          <span data-mode="bot"><b>III</b><small>BOT</small></span>
          <span><b>IV</b><small>DECK</small></span>
          <span><b>V</b><small>SHOP</small></span>
        </div>
        <section class="archive-paper">
          <div class="archive-paper-head">
            <div class="archive-stamp"><img id="archiveModeIcon" src="/icons/menu_ranked.png" alt=""></div>
            <div>
              <h1 id="archiveModeTitle">${t("home.ranked.title")}</h1>
              <p id="archiveModeDesc">${t("arch.paper.ranked.desc")}</p>
            </div>
            <div class="archive-compass" aria-hidden="true"></div>
          </div>

          <div class="archive-paper-grid">
            <section class="archive-paper-panel archive-rank-panel">
              <h2><span id="archiveRankHeading">${t("arch.season.title")}</span> <small id="archiveRankSubhead">${t("arch.paper.seasonEnd")}</small></h2>
              <div class="archive-rank-body">
                <img src="/icons/menu_ranked.png" alt="">
                <div class="archive-rank-details">
                  <b>${t("arch.paper.rankMock")}</b>
                  <span id="myTier"></span>
                  <div class="archive-progress"><i style="width:41%"></i></div>
                  <small>${t("arch.paper.rankNextMock")}</small>
                </div>
              </div>
              <div class="archive-stats">
                <span><b id="archiveWins">${u?.wins ?? 0}</b><small>${t("arch.wins")}</small></span>
                <span><b id="archiveLosses">${u?.losses ?? 0}</b><small>${t("arch.losses")}</small></span>
                <span><b id="archiveWinRate">0%</b><small>${t("arch.winrate")}</small></span>
              </div>
            </section>

            <section class="archive-paper-panel archive-deck-panel">
              <h2>${t("deck.current")}</h2>
              <div class="archive-deck-title">${t("arch.deckname.oblivion")}</div>
              <div class="archive-card-strip">
                <img src="/icons/menu_cards.png" alt="">
                <span></span><span></span><span></span><span></span>
              </div>
              <div class="archive-deck-meta">
                <span>${t("arch.cardCount")} <b>40 / 40</b></span>
                <button id="archiveDeck">${t("home.deck.title")}</button>
              </div>
              <button class="archive-start" id="archiveStart">${t("arch.paper.ranked.start")}</button>
            </section>
          </div>

          <section class="archive-recent">
            <h2><span id="archiveRecordHeading">${t("arch.paper.seasonRec")}</span> <small id="archiveRecordSubhead">${t("arch.paper.rankedRec")}</small></h2>
            <div class="archive-result-list">
              <span><b>${t("modal.win")}</b><small>VS ${t("arch.npc.darkknight")}<br>${t("arch.time.minAgo").replace("{n}", "2")}</small></span>
              <span><b>${t("modal.win")}</b><small>VS ${t("arch.npc.shadowmage")}<br>${t("arch.time.minAgo").replace("{n}", "12")}</small></span>
              <span class="loss"><b>${t("modal.lose")}</b><small>VS ${t("arch.npc.paladin")}<br>${t("arch.time.minAgo").replace("{n}", "25")}</small></span>
              <span><b>${t("modal.win")}</b><small>VS ${t("arch.npc.oracle")}<br>${t("arch.time.hourAgo").replace("{n}", "1")}</small></span>
              <span><b>${t("modal.win")}</b><small>VS ${t("arch.npc.ruinlord")}<br>${t("arch.time.hourAgo").replace("{n}", "2")}</small></span>
            </div>
          </section>
        </section>
      </main>

      <section class="archive-cards-panel" aria-label="card archive">
        <header class="archive-cards-head">
          <div>
            <h1 aria-label="${t("cards.title")}"></h1>
            <span id="archiveCardCount"></span>
          </div>
        </header>
        <div class="archive-cards-divider" aria-hidden="true"></div>
        <div class="archive-cards-filters">
          <div class="archive-card-filter-row" id="archiveCardTypeFilters"></div>
          <div class="archive-card-filter-row archive-card-cost-row" id="archiveCardCostFilters"></div>
        </div>
        <div class="archive-cards-grid" id="archiveCardsGrid"></div>
      </section>

      <section class="archive-shop-panel" id="archiveLiveShop" aria-label="${t("shop.title")}">
        <header class="archive-shop-head">
          <div><h1>${t("shop.title")}</h1><p>${t("shop.sleeves")}</p></div>
          <span>💎 <b id="archiveShopCredits">${u?.credits ?? 0}</b></span>
        </header>
        <p class="archive-shop-desc">${t("arch.shop.desc")}</p>
        <div class="archive-shop-grid" id="archiveShopGrid"></div>
      </section>

      <section class="archive-deck-panel" id="archiveDeckPanel" aria-label="${t("arch.deck.builder")}">
        <header class="archive-deck-head">
          <div><h1>${t("arch.deck.h1")}</h1><p>${t("arch.deck.builder")}</p></div>
        </header>
        <div class="archive-deck-tabs" id="archiveDeckTabs"></div>
        <div class="archive-deck-current-head">
          <span>${t("deck.current")} <b id="archiveDeckCount"></b></span>
          <div class="archive-deck-current-actions">
            <button id="archiveDeckSave">${t("arch.deck.save")}</button>
            <button id="archiveDeckUse"></button>
          </div>
        </div>
        <div class="archive-deck-current" id="archiveDeckCurrent"></div>
        <div class="archive-deck-pool-head">${t("arch.deck.pool")} <small>${t("arch.deck.poolHint")}</small></div>
        <div class="archive-deck-pool" id="archiveDeckPool"></div>
        <p class="archive-deck-message" id="archiveDeckMessage"></p>
      </section>

      <div class="archive-hotspots" aria-label="archive controls">
        <button class="archive-hotspot archive-hotspot-mode" data-mode="ranked" aria-label="${t("arch.mode.ranked")}"></button>
        <button class="archive-hotspot archive-hotspot-mode" data-mode="online" aria-label="${t("arch.mode.online")}"></button>
        <button class="archive-hotspot archive-hotspot-mode" data-mode="bot" aria-label="${t("arch.mode.bot")}"></button>
        <button class="archive-hotspot archive-hotspot-menu" data-action="deck" aria-label="${t("arch.deck.h1")}"></button>
        <button class="archive-hotspot archive-hotspot-menu" data-action="cards" aria-label="${t("arch.head.cards.title")}"></button>
        <button class="archive-hotspot archive-hotspot-menu" data-action="shop" aria-label="${t("shop.title")}"></button>
        <button class="archive-hotspot archive-hotspot-menu" data-action="leaderboard" aria-label="${t("home.lb.title")}"></button>
      </div>
    </div>`;
  app.root.appendChild(wrap);

  type ArchiveMode = "ranked" | "online" | "bot";
  type ArchiveSection = ArchiveMode | "deck" | "cards" | "shop" | "leaderboard";
  type RecentRankMatch = {
    result: "win" | "loss";
    deck: number;
    opponent: string;
    ratingBefore: number;
    ratingChange: number;
  };
  let selectedSection: ArchiveSection = "ranked";
  let selectedBotDifficulty: BotDifficulty = "normal";
  let modeRecords: { ranked: { w: number; l: number }; online: { w: number; l: number }; bot: { w: number; l: number } } | undefined;
  let cardTypeFilter: HomeCardTypeFilter = "all";
  let cardCostFilter = -1;
  const cardTypeFilters = wrap.querySelector<HTMLElement>("#archiveCardTypeFilters");
  const cardCostFilters = wrap.querySelector<HTMLElement>("#archiveCardCostFilters");
  const archiveCardsGrid = wrap.querySelector<HTMLElement>("#archiveCardsGrid");
  const archiveCardCount = wrap.querySelector<HTMLElement>("#archiveCardCount");
  const cardTypeChips: { key: HomeCardTypeFilter; el: HTMLButtonElement }[] = [];
  const cardCostChips: { key: number; el: HTMLButtonElement }[] = [];
  const archiveLiveDeck = wrap.querySelector<HTMLElement>("#archiveLiveDeck");
  const archiveRecentMatches = wrap.querySelector<HTMLElement>("#archiveRecentMatches");
  const archiveRankDeckTabs = wrap.querySelector<HTMLElement>("#archiveRankDeckTabs");
  const archiveRankDeckName = wrap.querySelector<HTMLElement>("#archiveRankDeckName");
  const archiveChangeDeck = wrap.querySelector<HTMLButtonElement>("#archiveChangeDeck");
  const archiveDeckTabs = wrap.querySelector<HTMLElement>("#archiveDeckTabs");
  const archiveDeckCurrent = wrap.querySelector<HTMLElement>("#archiveDeckCurrent");
  const archiveDeckPool = wrap.querySelector<HTMLElement>("#archiveDeckPool");
  const archiveDeckCount = wrap.querySelector<HTMLElement>("#archiveDeckCount");
  const archiveDeckUse = wrap.querySelector<HTMLButtonElement>("#archiveDeckUse");
  const archiveDeckMessage = wrap.querySelector<HTMLElement>("#archiveDeckMessage");
  const deckStore = sanitizeDecks(app.user?.decks ?? (app.user?.deck ? { sel: 0, list: [{ cards: app.user.deck, watch: [] }] } : null));
  let editingDeck = deckStore.sel;
  let rankDeckPreview = deckStore.sel;
  const archiveShopGrid = wrap.querySelector<HTMLElement>("#archiveShopGrid");
  const archiveShopCredits = wrap.querySelector<HTMLElement>("#archiveShopCredits");
  const archiveLeaderboardHall = wrap.querySelector<HTMLElement>("#archiveLeaderboardHall");
  const archiveLeaderboardTable = wrap.querySelector<HTMLElement>("#archiveLeaderboardTable");
  const archiveLeaderboardSeason = wrap.querySelector<HTMLElement>("#archiveLeaderboardSeason");
  const archiveBotDifficultyButtons = [...wrap.querySelectorAll<HTMLButtonElement>(".archive-bot-difficulty-button")];
  let shopCredits = u?.credits ?? 0;
  let ownedSleeves = new Set<string>(["default"]);
  const modeCopy: Record<ArchiveMode, { title: string; desc: string; icon: string; start: string; deck: string; rank: string; meta: string; progress: string; rankHeading: string; rankSubhead: string; recordHeading: string; recordSubhead: string; logoOnly?: boolean }> = {
    ranked: {
      title: t("home.ranked.title"),
      desc: t("arch.paper.ranked.desc"),
      icon: "/icons/menu_ranked.png",
      start: t("arch.paper.ranked.start"),
      deck: t("arch.deckname.oblivion"),
      rank: t("arch.paper.rankMock"),
      meta: t("arch.paper.rankNextMock"),
      progress: "41%",
      rankHeading: t("arch.season.title"),
      rankSubhead: t("arch.paper.seasonEnd"),
      recordHeading: t("arch.paper.seasonRec"),
      recordSubhead: t("arch.paper.rankedRec"),
    },
    online: {
      title: t("home.online.title"),
      desc: t("arch.paper.online.desc"),
      icon: "/icons/menu_online.png",
      start: t("arch.paper.online.start"),
      deck: t("arch.deckname.oblivion"),
      rank: "",
      meta: "",
      progress: "0%",
      rankHeading: t("arch.paper.online.head"),
      rankSubhead: "",
      recordHeading: t("arch.paper.online.rec"),
      recordSubhead: t("arch.normal.sub"),
      logoOnly: true,
    },
    bot: {
      title: t("arch.mode.bot"),
      desc: t("arch.paper.bot.desc"),
      icon: "/icons/menu_bot.png",
      start: t("arch.paper.bot.start"),
      deck: t("arch.deckname.training"),
      rank: t("bot.diff.title"),
      meta: t("arch.paper.bot.meta"),
      progress: "58%",
      rankHeading: t("arch.mode.bot"),
      rankSubhead: t("arch.paper.bot.practice"),
      recordHeading: t("arch.paper.bot.rec"),
      recordSubhead: t("arch.paper.bot.rec"),
    },
  };

  const updateMatchRecord = (mode: ArchiveMode) => {
    const record = modeRecords?.[mode] ?? (mode === "ranked"
      ? { w: u?.wins ?? 0, l: u?.losses ?? 0 }
      : { w: 0, l: 0 });
    const total = record.w + record.l;
    const wins = wrap.querySelector<HTMLElement>("#archiveWins");
    const losses = wrap.querySelector<HTMLElement>("#archiveLosses");
    const winRate = wrap.querySelector<HTMLElement>("#archiveWinRate");
    if (wins) wins.textContent = String(record.w);
    if (losses) losses.textContent = String(record.l);
    if (winRate) winRate.textContent = `${total ? Math.round(record.w / total * 100) : 0}%`;
  };

  const renderArchiveSeasonRank = (rating: RankInfo | null) => {
    const tiers = {
      iron: { label: tierLabel("iron"), asset: "/art/tiers/iron.webp" },
      bronze: { label: tierLabel("bronze"), asset: "/art/tiers/bronze.webp" },
      silver: { label: tierLabel("silver"), asset: "/art/tiers/silver.webp" },
      gold: { label: tierLabel("gold"), asset: "/art/tiers/gold.webp" },
    } as const;
    const tierKey = rating?.tier?.toLowerCase();
    const tier = tierKey && tierKey in tiers ? tiers[tierKey as keyof typeof tiers] : tiers.iron;
    const wins = rating?.wins ?? 0;
    const losses = rating?.losses ?? 0;
    const total = wins + losses;
    const set = (id: string, value: string) => {
      const element = wrap.querySelector<HTMLElement>(`#${id}`);
      if (element) element.textContent = value;
    };

    const emblem = wrap.querySelector<HTMLImageElement>("#archiveSeasonRankEmblem");
    if (emblem) {
      emblem.src = tier.asset;
      emblem.alt = t("arch.tierAlt").replace("{t}", tier.label);
    }
    set("archiveSeasonTier", tier.label);
    set("archiveSeasonPoints", t("arch.pts").replace("{n}", String(rating?.mmr ?? 0)));
    set("archiveSeasonPosition", rating?.rank ? t("arch.place").replace("{n}", String(rating.rank)) : "-");
    set("archiveSeasonWins", String(wins));
    set("archiveSeasonLosses", String(losses));
    set("archiveSeasonWinRate", `${total ? Math.round(wins / total * 100) : 0}%`);
  };

  const renderArchiveNormalRecord = (): void => {
    const record = modeRecords?.online ?? { w: 0, l: 0 };
    const total = record.w + record.l;
    const set = (id: string, value: string) => {
      const element = wrap.querySelector<HTMLElement>(`#${id}`);
      if (element) element.textContent = value;
    };
    set("archiveNormalWins", String(record.w));
    set("archiveNormalLosses", String(record.l));
    set("archiveNormalWinRate", `${total ? Math.round(record.w / total * 100) : 0}%`);
  };

  const leaderboardFallback: LbEntry[] = [
    { rank: 1, rankChange: 2, display: t("arch.defaultName"), tier: "gold", winStreak: 8, mmr: 3842, wins: 128, losses: 24 },
    { rank: 2, rankChange: -1, display: t("arch.npc.shadowhunter"), tier: "silver", winStreak: 3, mmr: 3671, wins: 112, losses: 31 },
    { rank: 3, rankChange: 0, display: t("arch.npc.moonpaladin"), tier: "bronze", winStreak: 5, mmr: 3512, wins: 97, losses: 36 },
    { rank: 4, rankChange: 4, display: t("arch.npc.silentmage"), tier: "silver", winStreak: 2, mmr: 3386, wins: 89, losses: 40 },
    { rank: 5, rankChange: -2, display: t("arch.npc.ruinlord"), tier: "bronze", winStreak: 1, mmr: 3241, wins: 76, losses: 44 },
  ];
  const tierName = (tier: string): string => tierLabel(tier.toLowerCase());
  const appendArchiveLeaderboardRows = (entries: LbEntry[]): void => {
    if (!archiveLeaderboardTable) return;
    entries.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "archive-leaderboard-row";
      const values = [
        { text: String(entry.rank), className: "" },
        { text: entry.display, className: "archive-leaderboard-player" },
        { text: tierName(entry.tier), className: "" },
        { text: entry.mmr.toLocaleString(), className: "archive-leaderboard-score" },
        { text: String(entry.wins), className: "" },
      ];
      values.forEach(({ text, className }) => {
        const cell = document.createElement("span");
        cell.textContent = text;
        if (className) cell.className = className;
        row.appendChild(cell);
      });
      archiveLeaderboardTable.appendChild(row);
    });
  };
  const renderArchiveLeaderboard = (entries: LbEntry[] = leaderboardFallback, season = ""): void => {
    if (!archiveLeaderboardHall || !archiveLeaderboardTable) return;
    if (archiveLeaderboardSeason) archiveLeaderboardSeason.textContent = season ? `${t("lb.season")} ${season}` : t("arch.hall.season");
    const topThree = entries.filter((entry) => entry.rank <= 3).sort((a, b) => a.rank - b.rank);
    const trophies: Record<number, string> = {
      1: "/ui/hall-trophy-gold.webp",
      2: "/ui/hall-trophy-silver.webp",
      3: "/ui/hall-trophy-bronze.webp",
    };
    archiveLeaderboardHall.innerHTML = "";
    [topThree[1], topThree[0], topThree[2]].filter((entry): entry is LbEntry => !!entry).forEach((entry) => {
      const card = document.createElement("article");
      card.className = `archive-leaderboard-honor archive-leaderboard-honor--${entry.rank}`;
      const trophy = document.createElement("img");
      trophy.className = "archive-leaderboard-trophy";
      trophy.src = trophies[entry.rank];
      trophy.alt = t("arch.trophyAlt").replace("{n}", String(entry.rank));
      const player = document.createElement("div");
      player.className = "archive-leaderboard-honor-player";
      player.innerHTML = avatarHtml(entry.display === u?.display ? u?.avatar : null, entry.display, 22);
      const name = document.createElement("b");
      name.textContent = entry.display;
      player.appendChild(name);
      const score = document.createElement("strong");
      score.textContent = t("arch.pts").replace("{n}", entry.mmr.toLocaleString());
      score.title = tierName(entry.tier);
      card.append(trophy, player, score);
      archiveLeaderboardHall.appendChild(card);
    });
    archiveLeaderboardTable.innerHTML = "";
    appendArchiveLeaderboardRows(entries);
  };
  let leaderboardSeason = "";
  let leaderboardLoaded = 0;
  let leaderboardTotal = 0;
  let leaderboardLoading = false;
  const loadMoreArchiveLeaderboard = (): void => {
    if (leaderboardLoading || !leaderboardSeason || leaderboardLoaded >= leaderboardTotal) return;
    leaderboardLoading = true;
    void api.leaderboard(leaderboardSeason, leaderboardLoaded).then(({ entries, total }) => {
      appendArchiveLeaderboardRows(entries);
      leaderboardLoaded += entries.length;
      leaderboardTotal = total;
    }).catch(() => { /* keep the loaded ranking rows visible */ }).finally(() => {
      leaderboardLoading = false;
    });
  };
  archiveLeaderboardTable?.addEventListener("scroll", () => {
    const nearEnd = archiveLeaderboardTable.scrollTop + archiveLeaderboardTable.clientHeight >= archiveLeaderboardTable.scrollHeight - 48;
    if (nearEnd) loadMoreArchiveLeaderboard();
  });

  // 서버의 최근 랭크전 기록 API가 연결되면 이 배열에 최신순으로 넣는다.
  // 첫 줄은 UI 확인용 예시이고, 실제 기록은 그 아래 최대 3건까지 표시한다.
  const recentRankMatches: RecentRankMatch[] = [];
  const recentOnlineMatches: RecentRankMatch[] = [];
  const previewRankMatch: RecentRankMatch = {
    result: "win",
    deck: 1,
    opponent: t("arch.npc.arcana"),
    ratingBefore: 1218,
    ratingChange: 18,
  };
  const previewOnlineMatch: RecentRankMatch = {
    result: "win",
    deck: 2,
    opponent: t("arch.npc.nova"),
    ratingBefore: 0,
    ratingChange: 0,
  };
  const renderArchiveRecentMatches = (mode: "ranked" | "online" = "ranked"): void => {
    if (!archiveRecentMatches) return;
    archiveRecentMatches.innerHTML = "";
    const matches = mode === "ranked"
      ? [previewRankMatch, ...recentRankMatches]
      : [previewOnlineMatch, ...recentOnlineMatches];
    matches.slice(0, 4).forEach((match) => {
      const row = document.createElement("article");
      row.className = `archive-recent-match is-${match.result} is-profile-link`;
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      row.setAttribute("aria-label", t("arch.openProfile"));
      const result = document.createElement("b");
      result.textContent = match.result === "win" ? t("home.win") : t("home.loss");
      const detail = document.createElement("div");
      detail.className = "archive-recent-match-detail";
      const name = document.createElement("span");
      name.textContent = `${t("deck.slot").replace("{n}", String(match.deck))} · VS ${match.opponent}`;
      const before = document.createElement("small");
      const ratingAfter = match.ratingBefore + match.ratingChange;
      before.textContent = mode === "ranked" ? `${t("arch.pts").replace("{n}", match.ratingBefore.toLocaleString())} → ${t("arch.pts").replace("{n}", ratingAfter.toLocaleString())}` : t("arch.vsGame");
      detail.append(name, before);
      const change = document.createElement("em");
      change.textContent = mode === "ranked" ? t("arch.pts").replace("{n}", `${match.ratingChange > 0 ? "+" : ""}${match.ratingChange}`) : "";
      if (mode === "online") change.hidden = true;
      row.append(result, detail, change);
      row.onclick = () => app.profile();
      row.onkeydown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          app.profile();
        }
      };
      archiveRecentMatches.appendChild(row);
    });
  };

  const renderArchiveLiveDeck = (): void => {
    if (!archiveLiveDeck) return;
    const ids = ["STARTER_MANA", ...deckStore.list[rankDeckPreview].cards].slice(0, 9);
    archiveLiveDeck.innerHTML = "";
    ids.forEach((id, index) => {
      const def = STARTERS[id] ?? DB[id];
      if (!def) return;
      const card: CardInst = { ...structuredClone(def), uid: `archive_deck_${index}_${id}` };
      const element = cardEl(card, { size: "mkt" });
      element.title = t("arch.cardZoom");
      element.onclick = () => zoomCard(card);
      archiveLiveDeck.appendChild(element);
    });
  };

  const renderArchiveRankDeck = (): void => {
    if (!archiveRankDeckTabs || !archiveRankDeckName) return;
    archiveRankDeckTabs.innerHTML = "";
    for (let index = 0; index < DECK_SLOTS; index++) {
      const tab = document.createElement("button");
      const isPreview = index === rankDeckPreview;
      const isApplied = index === deckStore.sel;
      tab.className = "archive-current-deck-tab" + (isPreview ? " is-selected" : "") + (isApplied ? " is-active" : "");
      tab.textContent = t("deck.slot").replace("{n}", String(index + 1));
      tab.setAttribute("aria-pressed", String(isPreview));
      tab.setAttribute("aria-label", `${t("deck.slot").replace("{n}", String(index + 1))}${isApplied ? `, ${t("arch.deck.appliedTab")}` : ""}`);
      tab.onclick = () => {
        rankDeckPreview = index;
        renderArchiveRankDeck();
        renderArchiveLiveDeck();
      };
      archiveRankDeckTabs.appendChild(tab);
    }
    archiveRankDeckName.textContent = `${t("deck.slot").replace("{n}", String(rankDeckPreview + 1))}${rankDeckPreview === deckStore.sel ? ` · ${t("arch.deck.applied")}` : ""}`;
    if (archiveChangeDeck) {
      archiveChangeDeck.disabled = rankDeckPreview === deckStore.sel;
      archiveChangeDeck.setAttribute("aria-label", rankDeckPreview === deckStore.sel ? t("arch.deck.alreadyApplied") : t("arch.deck.applyN").replace("{n}", String(rankDeckPreview + 1)));
    }
  };

  const renderArchiveDeck = (): void => {
    if (!archiveDeckTabs || !archiveDeckCurrent || !archiveDeckPool || !archiveDeckCount || !archiveDeckUse) return;
    const deck = deckStore.list[editingDeck].cards;
    const countOf = (id: string) => deck.filter((card) => card === id).length;
    archiveDeckTabs.innerHTML = "";
    for (let index = 0; index < DECK_SLOTS; index++) {
      const tab = document.createElement("button");
      tab.className = "archive-deck-tab" + (index === editingDeck ? " is-on" : "") + (index === deckStore.sel ? " is-active" : "");
      tab.textContent = t("deck.slot").replace("{n}", String(index + 1));
      tab.setAttribute("aria-label", `${t("deck.slot").replace("{n}", String(index + 1))}${index === deckStore.sel ? `, ${t("arch.deck.appliedTab")}` : ""}`);
      tab.onclick = () => { editingDeck = index; renderArchiveDeck(); };
      archiveDeckTabs.appendChild(tab);
    }
    archiveDeckCount.textContent = `${deck.length + 1} / ${DECK_SIZE + 1}`;
    // 덱 탭의 금색 구체가 적용 상태를 표시한다. 이 버튼은 적용 후에도
    // 같은 실행 버튼 모양을 유지해, 회색의 "적용됨" 상태로 고정되지 않는다.
    archiveDeckUse.textContent = t("arch.deck.apply");
    archiveDeckUse.setAttribute("aria-label", t("arch.deck.applyN").replace("{n}", String(editingDeck + 1)));
    archiveDeckUse.disabled = false;
    archiveDeckCurrent.innerHTML = "";
    const fixed = STARTERS.STARTER_MANA;
    if (fixed) {
      const fixedCard = cardEl({ ...structuredClone(fixed), uid: "archive-fixed" }, { size: "mkt" });
      fixedCard.classList.add("archive-deck-fixed");
      archiveDeckCurrent.appendChild(fixedCard);
    }
    deck.forEach((id, index) => {
      const def = STARTERS[id] ?? DB[id];
      if (!def) return;
      const card = cardEl({ ...structuredClone(def), uid: `archive-deck-${index}-${id}` }, { size: "mkt" });
      card.title = t("deck.remove");
      card.onclick = () => { deck.splice(index, 1); renderArchiveDeck(); renderArchiveLiveDeck(); };
      archiveDeckCurrent.appendChild(card);
    });
    for (let index = deck.length; index < DECK_SIZE; index++) {
      const slot = document.createElement("div");
      slot.className = "archive-deck-slot";
      slot.textContent = "+";
      archiveDeckCurrent.appendChild(slot);
    }
    archiveDeckPool.innerHTML = "";
    DECK_POOL.forEach((id) => {
      const def = DB[id];
      if (!def) return;
      const amount = countOf(id);
      const full = deck.length >= DECK_SIZE || amount >= DECK_MAX_COPIES;
      const card = cardEl({ ...structuredClone(def), uid: `archive-pool-${id}` }, { size: "mkt", dim: full, playable: !full });
      const owned = document.createElement("span");
      owned.className = "archive-deck-owned";
      owned.textContent = `${amount}/${DECK_MAX_COPIES}`;
      card.appendChild(owned);
      if (!full) card.onclick = () => { deck.push(id); renderArchiveDeck(); };
      archiveDeckPool.appendChild(card);
    });
  };

  const saveArchiveDeck = async (): Promise<void> => {
    if (archiveDeckMessage) archiveDeckMessage.textContent = t("arch.saving");
    try {
      const result = await api.saveDecks(deckStore);
      Object.assign(deckStore, result.decks);
      if (app.user) { app.user.decks = result.decks; app.user.deck = result.deck; }
      if (archiveDeckMessage) archiveDeckMessage.textContent = t("arch.saved");
      renderArchiveDeck();
      renderArchiveLiveDeck();
    } catch (error) {
      if (archiveDeckMessage) archiveDeckMessage.textContent = (error as Error).message || t("arch.saveFail");
    }
  };

  // 덱 설정 종이와 대전 종이에서 공통으로 사용하는 활성 덱 적용 동작.
  const applyArchiveDeck = (index: number): void => {
    if (index === deckStore.sel) return;
    deckStore.sel = index;
    editingDeck = index;
    rankDeckPreview = index;
    if (app.user) app.user.deck = [...deckStore.list[index].cards];
    renderArchiveRankDeck();
    renderArchiveLiveDeck();
    renderArchiveDeck();
    void saveArchiveDeck();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  };

  const sleeveName = (id: string): string => {
    const sleeve = SLEEVES[id];
    if (!sleeve) return id;
    const lang = getLang();
    return lang === "ja" ? sleeve.ja : lang === "en" ? sleeve.en : sleeve.ko;
  };

  const renderArchiveShop = (): void => {
    if (!archiveShopGrid) return;
    if (archiveShopCredits) archiveShopCredits.textContent = String(shopCredits);
    archiveShopGrid.innerHTML = SLEEVE_LIST.filter((sleeve) => sleeve.price > 0).map((sleeve) => {
      const owned = ownedSleeves.has(sleeve.id);
      return `<article class="archive-shop-item ${owned ? "is-owned" : ""}">
        <div class="archive-sleeve-preview" style="background-image:url('${sleeve.url}')"></div>
        <strong>${sleeveName(sleeve.id)}</strong>
        ${owned
          ? `<button disabled>${t("shop.owned")}</button>`
          : `<button data-buy-sleeve="${sleeve.id}">${t("shop.buy")} <span>💎 ${sleeve.price}</span></button>`}
      </article>`;
    }).join("");
    archiveShopGrid.querySelectorAll<HTMLButtonElement>("[data-buy-sleeve]").forEach((button) => {
      button.onclick = () => {
        const id = button.dataset.buySleeve!;
        const sleeve = SLEEVES[id];
        if (!sleeve || shopCredits < sleeve.price) { alert(t("shop.nocredit")); return; }
        if (!confirm(t("arch.shop.confirm").replace("{name}", sleeveName(id)).replace("{n}", String(sleeve.price)))) return;
        button.disabled = true;
        void api.buySleeve(id).then((result) => {
          shopCredits = result.credits;
          ownedSleeves = new Set(result.sleeves);
          if (app.user) app.user.credits = result.credits;
          const headerCredits = wrap.querySelector<HTMLElement>("#credits b");
          if (headerCredits) headerCredits.textContent = String(result.credits);
          renderArchiveShop();
        }).catch((error) => {
          button.disabled = false;
          alert((error as Error).message || t("arch.shop.fail"));
        });
      };
    });
  };

  const renderArchiveCards = () => {
    cardTypeChips.forEach((chip) => chip.el.classList.toggle("is-active", chip.key === cardTypeFilter));
    cardCostChips.forEach((chip) => chip.el.classList.toggle("is-active", chip.key === cardCostFilter));
    if (!archiveCardsGrid) return;
    const list = HOME_ALL_CARDS.filter((card) => {
      if (cardTypeFilter === "starter") {
        if (!(card.t === "starter" || card.noShop)) return false;
      } else if (cardTypeFilter !== "all" && card.t !== cardTypeFilter) {
        return false;
      }
      return cardCostFilter === -1 || card.cost === cardCostFilter;
    });
    if (archiveCardCount) archiveCardCount.textContent = `${list.length}${t("cards.count")}`;
    archiveCardsGrid.innerHTML = "";
    const frag = document.createDocumentFragment();
    list.forEach((card) => {
      const node = cardEl(card, { size: "mkt" });
      node.onclick = () => zoomCard(card);
      frag.appendChild(node);
    });
    archiveCardsGrid.appendChild(frag);
  };

  const addCardTypeFilter = (key: HomeCardTypeFilter, label: string) => {
    if (!cardTypeFilters) return;
    const button = document.createElement("button");
    button.className = "archive-card-filter";
    button.textContent = label;
    button.onclick = () => {
      cardTypeFilter = key;
      renderArchiveCards();
    };
    cardTypeFilters.appendChild(button);
    cardTypeChips.push({ key, el: button });
  };

  const addCardCostFilter = (key: number, label: string) => {
    if (!cardCostFilters) return;
    const button = document.createElement("button");
    button.className = "archive-card-filter archive-card-filter--cost";
    button.textContent = label;
    button.onclick = () => {
      cardCostFilter = key;
      renderArchiveCards();
    };
    cardCostFilters.appendChild(button);
    cardCostChips.push({ key, el: button });
  };

  addCardTypeFilter("all", t("cards.f.all"));
  addCardTypeFilter("mon", t("cards.f.mon"));
  addCardTypeFilter("spell", t("cards.f.spell"));
  addCardTypeFilter("trap", t("cards.f.trap"));
  addCardTypeFilter("starter", t("cards.f.starter"));
  addCardCostFilter(-1, t("cards.cost.all"));
  for (let cost = 0; cost <= 14; cost++) addCardCostFilter(cost, String(cost));
  renderArchiveCards();
  renderArchiveRankDeck();
  renderArchiveRecentMatches();
  renderArchiveNormalRecord();
  renderArchiveLeaderboard();
  renderArchiveLiveDeck();
  renderArchiveDeck();
  renderArchiveShop();
  archiveBotDifficultyButtons.forEach((button) => {
    button.onclick = () => {
      selectedBotDifficulty = button.dataset.difficulty as BotDifficulty;
      archiveBotDifficultyButtons.forEach((item) => item.classList.toggle("is-selected", item === button));
    };
  });
  if (archiveDeckUse) archiveDeckUse.onclick = () => applyArchiveDeck(editingDeck);
  (wrap.querySelector("#archiveDeckSave") as HTMLButtonElement).onclick = () => { void saveArchiveDeck(); };

  const isEditingIncompleteDeck = (): boolean =>
    selectedSection === "deck" && deckStore.list[editingDeck].cards.length < DECK_SIZE;

  const allowDeckExit = (): boolean => {
    if (!isEditingIncompleteDeck()) return true;
    noticeModal(
      t("arch.deckIncomplete.title"),
      t("arch.deckIncomplete.body")
        .replace("{a}", String(deckStore.list[editingDeck].cards.length + 1))
        .replaceAll("{b}", String(DECK_SIZE + 1)),
      t("common.confirm"),
      () => {},
    );
    return false;
  };

  const selectSection = (section: ArchiveSection) => {
    if (section !== "deck" && !allowDeckExit()) return;
    selectedSection = section;
    wrap.dataset.mode = section;
    const contentLayer = wrap.querySelector<HTMLElement>(".archive-content-layer");
    contentLayer?.setAttribute("data-section", section);
    const copy = section === "online" ? modeCopy.online : section === "bot" ? modeCopy.bot : modeCopy.ranked;
    wrap.querySelectorAll<HTMLElement>(".archive-menu-item[data-mode]").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.mode === section);
    });
    wrap.querySelectorAll<HTMLElement>(".archive-menu-item:not([data-mode])").forEach((el) => {
      const action = el.id === "lb" ? "leaderboard" : el.id;
      el.classList.toggle("is-active", action === section);
    });
    wrap.querySelectorAll<HTMLElement>(".archive-page-tabs [data-mode]").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.mode === section);
    });
    wrap.querySelectorAll<HTMLElement>(".archive-hotspot-mode").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.mode === section);
    });
    wrap.querySelectorAll<HTMLElement>(".archive-hotspot-menu").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.action === section);
    });
    const hotspots = wrap.querySelector<HTMLElement>(".archive-hotspots");
    if (hotspots) hotspots.dataset.active = section;
    const icon = wrap.querySelector<HTMLImageElement>("#archiveModeIcon");
    const title = wrap.querySelector<HTMLElement>("#archiveModeTitle");
    const desc = wrap.querySelector<HTMLElement>("#archiveModeDesc");
    const start = wrap.querySelector<HTMLButtonElement>("#archiveStart");
    const rankIcon = wrap.querySelector<HTMLImageElement>(".archive-rank-body img");
    const rankName = wrap.querySelector<HTMLElement>(".archive-rank-body b");
    const rankMeta = wrap.querySelector<HTMLElement>(".archive-rank-body small");
    const progress = wrap.querySelector<HTMLElement>(".archive-progress i");
    const deckTitle = wrap.querySelector<HTMLElement>(".archive-deck-title");
    const rankPanel = wrap.querySelector<HTMLElement>(".archive-rank-panel");
    const rankHeading = wrap.querySelector<HTMLElement>("#archiveRankHeading");
    const rankSubhead = wrap.querySelector<HTMLElement>("#archiveRankSubhead");
    const recordHeading = wrap.querySelector<HTMLElement>("#archiveRecordHeading");
    const recordSubhead = wrap.querySelector<HTMLElement>("#archiveRecordSubhead");
    const battleHeaderTitle = wrap.querySelector<HTMLElement>("#archiveBattleHeaderTitle");
    const battleHeaderDescription = wrap.querySelector<HTMLElement>("#archiveBattleHeaderDescription");
    const recentMatchesTitle = wrap.querySelector<HTMLElement>("#archiveRecentMatchesTitle");
    const matchStart = wrap.querySelector<HTMLButtonElement>("#archiveMatchStart");
    if (icon) icon.src = copy.icon;
    if (rankIcon) rankIcon.src = copy.icon;
    if (title) title.innerHTML = copy.title;
    if (desc) desc.innerHTML = copy.desc;
    if (start) start.textContent = copy.start;
    if (rankName) rankName.textContent = copy.rank;
    if (rankMeta) rankMeta.textContent = copy.meta;
    if (progress) progress.style.width = copy.progress;
    if (deckTitle) deckTitle.textContent = copy.deck;
    if (rankPanel) rankPanel.classList.toggle("archive-rank-panel--logo-only", !!copy.logoOnly);
    if (rankHeading) rankHeading.textContent = copy.rankHeading;
    if (rankSubhead) rankSubhead.textContent = copy.rankSubhead;
    if (recordHeading) recordHeading.textContent = copy.recordHeading;
    if (recordSubhead) recordSubhead.textContent = copy.recordSubhead;
    const archiveHeaderCopy: Record<ArchiveSection, { icon: string; title: string; description: string }> = {
      ranked: { icon: "/icons/menu_ranked.png", title: t("arch.mode.ranked"), description: t("arch.head.ranked.desc") },
      online: { icon: "/icons/menu_online.png", title: t("arch.mode.online"), description: t("arch.head.online.desc") },
      bot: { icon: "/icons/menu_bot.png", title: t("arch.mode.bot"), description: t("arch.head.bot.desc") },
      deck: { icon: "/icons/menu_cards.png", title: t("arch.menu.deckbuild"), description: t("arch.head.deck.desc") },
      cards: { icon: "/icons/menu_cards.png", title: t("arch.head.cards.title"), description: t("arch.head.cards.desc") },
      shop: { icon: "/icons/menu_shop.png", title: t("shop.title"), description: t("arch.head.shop.desc") },
      leaderboard: { icon: "/icons/menu_leaderboard.png", title: t("home.lb.title"), description: t("arch.head.lb.desc") },
    };
    const archiveHeader = archiveHeaderCopy[section];
    if (battleHeaderTitle) battleHeaderTitle.textContent = archiveHeader.title;
    if (battleHeaderDescription) battleHeaderDescription.innerHTML = archiveHeader.description;
    if (section === "ranked" || section === "online" || section === "bot") {
      const isOnline = section === "online";
      if (recentMatchesTitle) recentMatchesTitle.textContent = t("arch.recent");
      if (matchStart) matchStart.innerHTML = `<span>${t("arch.start.l1")}</span><span>${t("arch.start.l2")}</span>`;
      if (section === "ranked" || section === "online") renderArchiveRecentMatches(section);
      if (isOnline) renderArchiveNormalRecord();
    }
    if (section === "ranked" || section === "online" || section === "bot") updateMatchRecord(section);
    if (section === "shop") renderArchiveShop();
    if (section === "deck") renderArchiveDeck();
  };

  (wrap.querySelector("#ranked") as HTMLElement).onclick = () => selectSection("ranked");
  (wrap.querySelector("#online") as HTMLElement).onclick = () => selectSection("online");
  (wrap.querySelector("#bot") as HTMLElement).onclick = () => selectSection("bot");
  const showComingSoon = (): void => noticeModal(
    t("arch.soon.title"),
    t("arch.soon.body"),
    t("common.confirm"),
    () => {},
  );
  (wrap.querySelector("#tutorial") as HTMLElement).onclick = showComingSoon;
  (wrap.querySelector("#single") as HTMLElement).onclick = showComingSoon;
  wrap.querySelectorAll<HTMLElement>(".archive-hotspot-mode").forEach((el) => {
    el.onclick = () => selectSection(el.dataset.mode as ArchiveMode);
  });
  wrap.querySelectorAll<HTMLElement>(".archive-hotspot-menu").forEach((el) => {
    el.onclick = () => {
      selectSection(el.dataset.action as ArchiveSection);
    };
  });
  const startSelectedMode = () => {
    if (!allowDeckExit()) return;
    if (selectedSection === "ranked") app.rankedLobby();
    else if (selectedSection === "online") app.onlineLobby();
    else if (selectedSection === "bot") app.botGame(selectedBotDifficulty);
  };
  (wrap.querySelector("#archiveStart") as HTMLElement).onclick = startSelectedMode;
  (wrap.querySelector("#archiveMatchStart") as HTMLElement).onclick = startSelectedMode;
  if (archiveChangeDeck) archiveChangeDeck.onclick = () => applyArchiveDeck(rankDeckPreview);
  (wrap.querySelector("#deck") as HTMLElement).onclick = () => selectSection("deck");
  (wrap.querySelector("#archiveDeck") as HTMLElement).onclick = () => selectSection("deck");
  (wrap.querySelector("#lb") as HTMLElement).onclick = () => selectSection("leaderboard");
  (wrap.querySelector("#invite") as HTMLElement).onclick = showComingSoon;
  const friendsButton = wrap.querySelector<HTMLButtonElement>("#archiveFriendsButton");
  const friendsPanel = wrap.querySelector<HTMLElement>("#archiveFriendsPanel");
  const friendsClose = wrap.querySelector<HTMLButtonElement>("#archiveFriendsClose");
  const friendsList = wrap.querySelector<HTMLElement>("#archiveFriendsList");
  const renderFriendsPopup = (friends: FriendEntry[]): void => {
    if (!friendsList) return;
    friendsList.replaceChildren();
    if (!friends.length) {
      const empty = document.createElement("p");
      empty.textContent = t("arch.friends.none");
      friendsList.append(empty);
      return;
    }
    friends.forEach((friend) => {
      const row = document.createElement("div");
      row.className = "archive-friend-row";
      row.innerHTML = avatarHtml(friend.avatar, friend.display, 30);
      const info = document.createElement("span");
      info.className = "archive-friend-info";
      const name = document.createElement("b");
      name.textContent = friend.display;
      const state = document.createElement("small");
      state.className = friend.online ? "is-online" : "";
      state.textContent = friend.online ? (friend.state === "online" || friend.state === "bot" ? t("friends.ingame") : t("friends.online")) : t("friends.offline");
      info.append(name, state);
      row.append(info);
      friendsList.append(row);
    });
  };
  const setFriendsPanel = (open: boolean) => {
    if (!friendsPanel || !friendsButton) return;
    friendsPanel.hidden = !open;
    friendsButton.setAttribute("aria-expanded", String(open));
    if (!open) return;
    if (friendsList) friendsList.innerHTML = `<p>${t("arch.friends.loading")}</p>`;
    void api.friends().then((data) => renderFriendsPopup(data.friends)).catch(() => {
      if (friendsList) friendsList.innerHTML = `<p>${t("arch.friends.fail")}</p>`;
    });
  };
  friendsButton?.addEventListener("click", () => setFriendsPanel(friendsPanel?.hidden ?? true));
  friendsClose?.addEventListener("click", () => setFriendsPanel(false));

  // current season tier badge (async, best-effort)
  void api.rankMe().then((r) => {
    const el = wrap.querySelector("#myTier");
    if (el && r) el.innerHTML = tierChipHtml(r.tier, r.mmr);
    renderArchiveSeasonRank(r);
  }).catch(() => { /* not logged in / offline */ });
  void api.leaderboard().then(({ season, total, entries }) => {
    if (entries.length) {
      leaderboardSeason = season;
      leaderboardLoaded = entries.length;
      leaderboardTotal = total;
      renderArchiveLeaderboard(entries, season);
    }
  }).catch(() => { /* show the prepared sample leaderboard offline */ });
  void api.profile().then((p) => {
    modeRecords = p.byMode;
    ownedSleeves = new Set(p.sleeves ?? ["default"]);
    shopCredits = p.credits ?? shopCredits;
    renderArchiveShop();
    renderArchiveNormalRecord();
    if (selectedSection === "ranked" || selectedSection === "online" || selectedSection === "bot") updateMatchRecord(selectedSection);
  }).catch(() => { /* profile statistics are optional on the home screen */ });
  (wrap.querySelector("#cards") as HTMLElement).onclick = () => selectSection("cards");
  (wrap.querySelector("#shop") as HTMLElement).onclick = () => selectSection("shop");
  (wrap.querySelector("#profile") as HTMLElement).onclick = () => {
    if (allowDeckExit()) app.profile();
  };
  (wrap.querySelector("#credits") as HTMLElement).onclick = () => selectSection("shop");
  (wrap.querySelector("#settings") as HTMLElement).onclick = () => {
    if (allowDeckExit()) app.settings();
  };

  // incoming friend requests badge + friendly-challenge popups while on HOME
  const unwatch = watchSocial(app, (n) => {
    const b = wrap.querySelector("#friendBadge") as HTMLElement | null;
    if (!b) return;
    b.hidden = n === 0;
    b.textContent = n > 0 ? String(n) : "";
  });

  const unsub = onLangChange(() => app.home());
  return { destroy: () => { unsub(); unwatch(); } };
}
