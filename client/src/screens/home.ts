// ============================================================
// LORE — post-login HOME. Choose Random Online or Bot match.
// ============================================================
import type { App, Screen } from "../router";
import type { CardInst, CardType } from "../shared/types";
import { api, type FriendEntry, type LbEntry, type RankInfo } from "../net/api";
import { t, getLang, onLangChange } from "../i18n";
import { tierChipHtml } from "../ui/tier";
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
      <section class="mobile-archive-home" data-mobile-mode="ranked" aria-label="LORE 모바일 홈">
        <header class="mobile-archive-header">
          <img class="mobile-archive-wordmark" src="/art/brand/lore-archive-header-wordmark.webp" alt="LORE">
          <div class="mobile-archive-header-actions">
            <button type="button" data-mobile-route="friends" aria-label="친구">
              <span class="mobile-archive-friends-icon" aria-hidden="true"></span>
              <span class="mobile-archive-notice" id="mobileFriendBadge" hidden></span>
            </button>
            <button type="button" data-mobile-route="settings" aria-label="${t("settings.title")}">⚙</button>
          </div>
        </header>

        <div class="mobile-archive-userbar">
          <button type="button" class="mobile-archive-profile" data-mobile-route="profile" aria-label="${t("home.profile.title")}">
            ${avatarHtml(u?.avatar, u?.display ?? "P", 42)}
            <span><b>${u?.display ?? "기록수집가"}</b><small>${t("home.record")} ${u?.wins ?? 0}${t("home.win")} ${u?.losses ?? 0}${t("home.loss")}</small></span>
          </button>
          <button type="button" class="mobile-archive-currency" data-mobile-route="shop" aria-label="${t("home.shop.title")}">
            <img src="/ui/shop-diamond.webp" alt="" aria-hidden="true"><b>${u?.credits ?? 0}</b>
          </button>
        </div>

        <nav class="mobile-archive-modes" aria-label="대전 모드">
          <button type="button" class="is-active" data-mobile-mode="ranked">
            <img src="/icons/menu_ranked.png" alt=""><span><b>랭크전</b><small>RANKED</small></span>
          </button>
          <button type="button" data-mobile-mode="online">
            <img src="/icons/menu_online.png" alt=""><span><b>일반전</b><small>NORMAL</small></span>
          </button>
          <button type="button" data-mobile-mode="bot">
            <img src="/icons/menu_bot.png" alt=""><span><b>봇전</b><small>BOT</small></span>
          </button>
        </nav>

        <main class="mobile-archive-dossier">
          <div class="mobile-archive-dossier-head">
            <span class="mobile-archive-kicker">LORE ARCHIVE · DUEL RECORD</span>
            <div class="mobile-archive-mode-title">
              <img id="mobileModeIcon" src="/icons/menu_ranked.png" alt="">
              <div><h1 id="mobileModeTitle">랭크전</h1><p id="mobileModeDescription">승리로 기록을 새기고 더 높은 등급에 도전하세요.</p></div>
            </div>
          </div>

          <section class="mobile-archive-rankcard">
            <img class="mobile-archive-rank-emblem" id="mobileRankEmblem" src="/art/tiers/iron.webp" alt="아이언 티어">
            <div class="mobile-archive-rank-copy">
              <small id="mobileRankEyebrow">시즌 랭크</small>
              <strong id="mobileRankTier">아이언</strong>
              <span><b id="mobileRankPoints">0</b> PTS · <b id="mobileRankPosition">-</b></span>
            </div>
            <dl class="mobile-archive-record">
              <div><dt>승</dt><dd id="mobileModeWins">${u?.wins ?? 0}</dd></div>
              <div><dt>패</dt><dd id="mobileModeLosses">${u?.losses ?? 0}</dd></div>
              <div><dt>승률</dt><dd id="mobileModeWinRate">0%</dd></div>
            </dl>
          </section>

          <section class="mobile-archive-bot-levels" aria-label="봇 난이도 선택">
            <button type="button" data-mobile-difficulty="easy">쉬움</button>
            <button type="button" class="is-active" data-mobile-difficulty="normal">보통</button>
            <button type="button" data-mobile-difficulty="hard">어려움</button>
            <button type="button" data-mobile-difficulty="hell">헬</button>
          </section>

          <section class="mobile-archive-deck">
            <header>
              <div><small>CURRENT DECK</small><h2 id="mobileDeckName">덱 ${(u?.decks?.sel ?? 0) + 1}</h2></div>
              <button type="button" data-mobile-route="deck">${t("home.deck.title")} →</button>
            </header>
            <div class="mobile-archive-deck-cards" id="mobileLiveDeck" aria-label="현재 덱 카드 미리보기"></div>
          </section>

          <button type="button" class="mobile-archive-start" id="mobileMatchStart">
            <span id="mobileStartLabel">랭크 대전 시작</span><small>ENTER THE ARCHIVE</small>
          </button>
        </main>

        <nav class="mobile-archive-quick" aria-label="빠른 메뉴">
          <button type="button" data-mobile-route="deck"><img src="/icons/menu_cards.png" alt=""><span>덱 빌딩</span></button>
          <button type="button" data-mobile-route="cards"><img src="/icons/menu_cards.png" alt=""><span>카드</span></button>
          <button type="button" data-mobile-route="leaderboard"><img src="/icons/menu_leaderboard.png" alt=""><span>리더보드</span></button>
          <button type="button" data-mobile-route="shop"><img src="/icons/menu_shop.png" alt=""><span>상점</span></button>
          <button type="button" data-mobile-route="tutorial"><img src="/icons/menu_tutorial.png" alt=""><span>튜토리얼</span></button>
          <button type="button" data-mobile-route="invite"><img src="/icons/menu_invite.png" alt=""><span>친구초대</span></button>
        </nav>
      </section>

      <div class="archive-centered-shell" aria-hidden="true"></div>
      <div class="archive-content-layer" data-section="ranked" aria-label="랭크전 정보">
        <div class="archive-ranked-header-slot">
          <div class="archive-ranked-header-copy">
            <h1 id="archiveBattleHeaderTitle">랭크전</h1>
            <p class="archive-ranked-header-description" id="archiveBattleHeaderDescription">랭크전은 온라인 유저들과 매칭될 수 있는 점수제 매칭입니다.<br>여러분만의 덱을 사용하여 타 유저들과의 결투에서 승리하고 등급을 올려보세요.</p>
          </div>
          <img class="archive-ranked-header-wordmark" src="/art/brand/lore-archive-header-wordmark.webp" alt="LORE">
          <div class="archive-ranked-header-divider" aria-hidden="true"></div>
        </div>
        <section class="archive-season-rank" aria-label="시즌 랭크">
          <header class="archive-season-rank-head"><h2>시즌 랭크</h2></header>
          <div class="archive-season-rank-main">
            <img class="archive-season-rank-emblem" id="archiveSeasonRankEmblem" src="/art/tiers/iron.webp" alt="아이언 티어">
            <dl class="archive-season-rank-summary">
              <div><dt>티어</dt><dd id="archiveSeasonTier">아이언</dd></div>
              <div><dt>점수</dt><dd id="archiveSeasonPoints">0점</dd></div>
              <div><dt>순위</dt><dd id="archiveSeasonPosition">-</dd></div>
            </dl>
          </div>
          <footer class="archive-season-rank-stats">
            <div><span>승리</span><b id="archiveSeasonWins">0</b></div>
            <div><span>패배</span><b id="archiveSeasonLosses">0</b></div>
            <div><span>승률</span><b id="archiveSeasonWinRate">0%</b></div>
          </footer>
        </section>
        <section class="archive-normal-record" aria-label="일반전 전적">
          <header class="archive-normal-record-head"><h2>일반전 전적</h2></header>
          <div class="archive-normal-record-main">
            ${avatarHtml(u?.avatar, u?.display ?? "G", 74)}
            <div class="archive-normal-record-profile">
              <b>${u?.display ?? "GUEST ARCHIVIST"}</b>
              <span>일반 대전 기록</span>
              <dl>
                <div><dt>승리</dt><dd id="archiveNormalWins">0</dd></div>
                <div><dt>패배</dt><dd id="archiveNormalLosses">0</dd></div>
                <div><dt>승률</dt><dd id="archiveNormalWinRate">0%</dd></div>
              </dl>
            </div>
          </div>
        </section>
        <section class="archive-bot-guide" aria-label="봇전 안내">
          <header class="archive-bot-guide-head"><h2>봇전</h2></header>
          <div class="archive-bot-guide-main">
            <b>연습 대전</b>
            <p>다양한 난이도의 봇과 대전하며 덱의 전략을 시험해보세요.<br>승패나 랭크 점수에 부담 없이 카드 조합을 익힐 수 있습니다.</p>
            <section class="archive-bot-difficulty" aria-label="봇 난이도 선택">
              <header><h2>난이도 선택</h2></header>
              <div class="archive-bot-difficulty-grid">
                <button type="button" class="archive-bot-difficulty-button" data-difficulty="easy"><b>쉬움</b><span>기본 규칙 연습</span></button>
                <button type="button" class="archive-bot-difficulty-button is-selected" data-difficulty="normal"><b>보통</b><span>균형 잡힌 대전</span></button>
                <button type="button" class="archive-bot-difficulty-button" data-difficulty="hard"><b>어려움</b><span>고급 전략 대응</span></button>
                <button type="button" class="archive-bot-difficulty-button" data-difficulty="hell"><b>헬</b><span>최고 난이도</span></button>
              </div>
            </section>
          </div>
        </section>
        <section class="archive-leaderboard-panel" aria-label="리더보드">
          <header class="archive-leaderboard-hall-head"><h2>명예의 전당</h2><span id="archiveLeaderboardSeason">이번 시즌</span></header>
          <div class="archive-leaderboard-hall" id="archiveLeaderboardHall"></div>
          <header class="archive-leaderboard-table-head"><span>순위</span><span>플레이어</span><span>티어</span><span>레이팅</span><span>승리 수</span></header>
          <div class="archive-leaderboard-table" id="archiveLeaderboardTable"></div>
        </section>
        <button class="archive-ranked-start" id="archiveMatchStart" type="button" aria-label="게임 시작"><span>게임</span><span>시작</span></button>
        <section class="archive-current-deck" aria-label="현재 덱">
          <header class="archive-current-deck-head">
            <h2>현재 덱</h2>
            <div class="archive-current-deck-tabs" id="archiveRankDeckTabs" aria-label="저장한 덱 선택"></div>
            <button class="archive-current-deck-change" id="archiveChangeDeck" type="button">현재 덱 적용</button>
          </header>
          <p class="archive-current-deck-name" id="archiveRankDeckName">덱 1</p>
          <div class="archive-live-deck-row" id="archiveLiveDeck" aria-label="선택한 덱 카드"></div>
        </section>
      </div>
      <aside class="archive-left">
        <img class="archive-sidebar-wordmark" src="/art/brand/lore-archive-header-wordmark.webp" alt="LORE">
        <div class="archive-menu">
          <button class="archive-menu-item is-active" id="ranked" data-mode="ranked">
            <span>랭크전</span>
          </button>
          <button class="archive-menu-item" id="online" data-mode="online">
            <span>일반전</span>
          </button>
          <button class="archive-menu-item" id="bot" data-mode="bot">
            <span>봇전</span>
          </button>
          <button class="archive-menu-item" id="single">
            <span>싱글모드</span>
          </button>
          <button class="archive-menu-item" id="deck">
            <span>덱 빌딩</span>
          </button>
          <button class="archive-menu-item" id="cards">
            <span>카드 리스트</span>
          </button>
          <button class="archive-menu-item" id="lb">
            <span>리더보드</span>
          </button>
          <button class="archive-menu-item" id="tutorial">
            <span>튜토리얼</span>
          </button>
          <button class="archive-menu-item" id="shop">
            <span>상점</span>
          </button>
          <button class="archive-menu-item" id="invite">
            <span>친구초대</span>
          </button>
        </div>
      </aside>

      <header class="archive-top">
        <button class="archive-top-control archive-top-profile" id="profile" title="${t("home.profile.title")}">
          ${avatarHtml(u?.avatar, u?.display ?? "P", 42)}
          <span class="archive-top-profile-name">${u?.display ?? "기록수집가"}</span>
        </button>
        <button class="archive-top-control archive-top-currency" id="credits" title="${t("home.shop.title")}">
          <img class="archive-top-gem" src="/ui/shop-diamond.webp" alt="" aria-hidden="true"><b>${u?.credits ?? 0}</b>
        </button>
        <button class="archive-top-control archive-top-icon archive-top-friends" id="archiveFriendsButton" title="친구" aria-expanded="false" aria-controls="archiveFriendsPanel">
          <span class="archive-top-friends-icon" aria-hidden="true"></span><span class="archive-top-badge" id="friendBadge" hidden></span>
        </button>
        <button class="archive-top-control archive-top-icon archive-top-settings" id="settings" title="${t("settings.title")}">
          <span aria-hidden="true">⚙</span>
        </button>
      </header>
      <aside class="archive-message-panel archive-friends-panel" id="archiveFriendsPanel" hidden aria-label="친구">
        <div class="archive-message-panel-head"><b>친구</b><button id="archiveFriendsClose" aria-label="친구 닫기">×</button></div>
        <div class="archive-friends-list" id="archiveFriendsList"><p>친구 목록을 불러오는 중...</p></div>
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
              <h1 id="archiveModeTitle">랭크 대전</h1>
              <p id="archiveModeDesc">실력을 증명하고 더 높은 랭크를 향해 나아가세요.<br>당신의 전략이 역사의 한 페이지가 됩니다.</p>
            </div>
            <div class="archive-compass" aria-hidden="true"></div>
          </div>

          <div class="archive-paper-grid">
            <section class="archive-paper-panel archive-rank-panel">
              <h2><span id="archiveRankHeading">시즌 랭크</span> <small id="archiveRankSubhead">시즌 종료까지 18일 남음</small></h2>
              <div class="archive-rank-body">
                <img src="/icons/menu_ranked.png" alt="">
                <div class="archive-rank-details">
                  <b>다이아몬드 IV</b>
                  <span id="myTier"></span>
                  <div class="archive-progress"><i style="width:41%"></i></div>
                  <small>다음 랭크 : 다이아몬드 III</small>
                </div>
              </div>
              <div class="archive-stats">
                <span><b id="archiveWins">${u?.wins ?? 0}</b><small>승리</small></span>
                <span><b id="archiveLosses">${u?.losses ?? 0}</b><small>패배</small></span>
                <span><b id="archiveWinRate">0%</b><small>승률</small></span>
              </div>
            </section>

            <section class="archive-paper-panel archive-deck-panel">
              <h2>현재 덱</h2>
              <div class="archive-deck-title">망각의 서약</div>
              <div class="archive-card-strip">
                <img src="/icons/menu_cards.png" alt="">
                <span></span><span></span><span></span><span></span>
              </div>
              <div class="archive-deck-meta">
                <span>카드 수 <b>40 / 40</b></span>
                <button id="archiveDeck">${t("home.deck.title")}</button>
              </div>
              <button class="archive-start" id="archiveStart">랭크 대전 시작</button>
            </section>
          </div>

          <section class="archive-recent">
            <h2><span id="archiveRecordHeading">시즌 기록</span> <small id="archiveRecordSubhead">랭크 매치 기록</small></h2>
            <div class="archive-result-list">
              <span><b>승리</b><small>VS 어둠의 기사<br>2분 전</small></span>
              <span><b>승리</b><small>VS 그림자 마도사<br>12분 전</small></span>
              <span class="loss"><b>패배</b><small>VS 성전사<br>25분 전</small></span>
              <span><b>승리</b><small>VS 예언술사<br>1시간 전</small></span>
              <span><b>승리</b><small>VS 파멸의 군주<br>2시간 전</small></span>
            </div>
          </section>
        </section>
      </main>

      <section class="archive-cards-panel" aria-label="card archive">
        <header class="archive-cards-head">
          <div>
            <h1 aria-label="카드 리스트"></h1>
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

      <section class="archive-shop-panel" id="archiveLiveShop" aria-label="슬리브 상점">
        <header class="archive-shop-head">
          <div><h1>상점</h1><p>카드 슬리브</p></div>
          <span>💎 <b id="archiveShopCredits">${u?.credits ?? 0}</b></span>
        </header>
        <p class="archive-shop-desc">카드 뒷면을 꾸밀 슬리브를 구매하세요.</p>
        <div class="archive-shop-grid" id="archiveShopGrid"></div>
      </section>

      <section class="archive-deck-panel" id="archiveDeckPanel" aria-label="덱 빌더">
        <header class="archive-deck-head">
          <div><h1>덱</h1><p>덱 빌더</p></div>
        </header>
        <div class="archive-deck-tabs" id="archiveDeckTabs"></div>
        <div class="archive-deck-current-head">
          <span>현재 덱 <b id="archiveDeckCount"></b></span>
          <div class="archive-deck-current-actions">
            <button id="archiveDeckSave">덱 저장</button>
            <button id="archiveDeckUse"></button>
          </div>
        </div>
        <div class="archive-deck-current" id="archiveDeckCurrent"></div>
        <div class="archive-deck-pool-head">카드 풀 <small>카드를 눌러 덱에 추가</small></div>
        <div class="archive-deck-pool" id="archiveDeckPool"></div>
        <p class="archive-deck-message" id="archiveDeckMessage"></p>
      </section>

      <div class="archive-hotspots" aria-label="archive controls">
        <button class="archive-hotspot archive-hotspot-mode" data-mode="ranked" aria-label="랭크전"></button>
        <button class="archive-hotspot archive-hotspot-mode" data-mode="online" aria-label="일반전"></button>
        <button class="archive-hotspot archive-hotspot-mode" data-mode="bot" aria-label="봇전"></button>
        <button class="archive-hotspot archive-hotspot-menu" data-action="deck" aria-label="덱"></button>
        <button class="archive-hotspot archive-hotspot-menu" data-action="cards" aria-label="카드"></button>
        <button class="archive-hotspot archive-hotspot-menu" data-action="shop" aria-label="상점"></button>
        <button class="archive-hotspot archive-hotspot-menu" data-action="leaderboard" aria-label="리더보드"></button>
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
  const mobileLiveDeck = wrap.querySelector<HTMLElement>("#mobileLiveDeck");
  const mobileArchiveHome = wrap.querySelector<HTMLElement>(".mobile-archive-home");
  const mobileModeButtons = [...wrap.querySelectorAll<HTMLButtonElement>("[data-mobile-mode]")];
  const mobileDifficultyButtons = [...wrap.querySelectorAll<HTMLButtonElement>("[data-mobile-difficulty]")];
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
      title: "랭크 대전",
      desc: "실력을 증명하고 더 높은 랭크를 향해 나아가세요.<br>당신의 전략이 역사의 한 페이지가 됩니다.",
      icon: "/icons/menu_ranked.png",
      start: "랭크 대전 시작",
      deck: "망각의 서약",
      rank: "다이아몬드 IV",
      meta: "다음 랭크 : 다이아몬드 III",
      progress: "41%",
      rankHeading: "시즌 랭크",
      rankSubhead: "시즌 종료까지 18일 남음",
      recordHeading: "시즌 기록",
      recordSubhead: "랭크 매치 기록",
    },
    online: {
      title: "노말 대전",
      desc: "노말에서 다양할 전략을 구사하고 강화해 승리를 쟁취하세요",
      icon: "/icons/menu_online.png",
      start: "노말 대전 시작",
      deck: "망각의 서약",
      rank: "",
      meta: "",
      progress: "0%",
      rankHeading: "노말",
      rankSubhead: "",
      recordHeading: "노말 기록",
      recordSubhead: "노말 대전 기록",
      logoOnly: true,
    },
    bot: {
      title: "봇전",
      desc: "봇전은 쉬움, 보통, 어려움, 헬 을 상대로 전투해 승리를 쟁취하세요.",
      icon: "/icons/menu_bot.png",
      start: "봇전 시작",
      deck: "수련용 서약",
      rank: "난이도 선택",
      meta: "시작 후 난이도를 고릅니다",
      progress: "58%",
      rankHeading: "봇전",
      rankSubhead: "연습 모드",
      recordHeading: "봇전 기록",
      recordSubhead: "봇전 기록",
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
    const mobileSet = (id: string, value: string) => {
      const element = wrap.querySelector<HTMLElement>(`#${id}`);
      if (element) element.textContent = value;
    };
    mobileSet("mobileModeWins", String(record.w));
    mobileSet("mobileModeLosses", String(record.l));
    mobileSet("mobileModeWinRate", `${total ? Math.round(record.w / total * 100) : 0}%`);
  };

  const renderArchiveSeasonRank = (rating: RankInfo | null) => {
    const tiers = {
      iron: { label: "아이언", asset: "/art/tiers/iron.webp" },
      bronze: { label: "브론즈", asset: "/art/tiers/bronze.webp" },
      silver: { label: "실버", asset: "/art/tiers/silver.webp" },
      gold: { label: "골드", asset: "/art/tiers/gold.webp" },
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
      emblem.alt = `${tier.label} 티어`;
    }
    set("archiveSeasonTier", tier.label);
    set("archiveSeasonPoints", `${rating?.mmr ?? 0}점`);
    set("archiveSeasonPosition", rating?.rank ? `${rating.rank}위` : "-");
    set("archiveSeasonWins", String(wins));
    set("archiveSeasonLosses", String(losses));
    set("archiveSeasonWinRate", `${total ? Math.round(wins / total * 100) : 0}%`);
    const mobileEmblem = wrap.querySelector<HTMLImageElement>("#mobileRankEmblem");
    if (mobileEmblem) {
      mobileEmblem.src = tier.asset;
      mobileEmblem.alt = `${tier.label} 티어`;
    }
    set("mobileRankTier", tier.label);
    set("mobileRankPoints", String(rating?.mmr ?? 0));
    set("mobileRankPosition", rating?.rank ? `${rating.rank}위` : "-");
    if (selectedSection === "ranked") updateMatchRecord("ranked");
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
    { rank: 1, display: "기록수집가", tier: "gold", mmr: 3842, wins: 128, losses: 24 },
    { rank: 2, display: "그림자 사냥꾼", tier: "silver", mmr: 3671, wins: 112, losses: 31 },
    { rank: 3, display: "달빛 성기사", tier: "bronze", mmr: 3512, wins: 97, losses: 36 },
    { rank: 4, display: "침묵의 마도사", tier: "silver", mmr: 3386, wins: 89, losses: 40 },
    { rank: 5, display: "파멸의 군주", tier: "bronze", mmr: 3241, wins: 76, losses: 44 },
  ];
  const tierName = (tier: string): string => ({ iron: "아이언", bronze: "브론즈", silver: "실버", gold: "골드", platinum: "플래티넘", diamond: "다이아몬드", master: "마스터", gm: "그랜드마스터" }[tier.toLowerCase()] ?? tier);
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
  const renderArchiveLeaderboard = (entries: LbEntry[] = leaderboardFallback, season = "이번 시즌"): void => {
    if (!archiveLeaderboardHall || !archiveLeaderboardTable) return;
    if (archiveLeaderboardSeason) archiveLeaderboardSeason.textContent = season === "이번 시즌" ? season : `시즌 ${season}`;
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
      trophy.alt = `${entry.rank}등 트로피`;
      const player = document.createElement("div");
      player.className = "archive-leaderboard-honor-player";
      player.innerHTML = avatarHtml(entry.display === u?.display ? u?.avatar : null, entry.display, 22);
      const name = document.createElement("b");
      name.textContent = entry.display;
      player.appendChild(name);
      const score = document.createElement("strong");
      score.textContent = `${entry.mmr.toLocaleString()}점`;
      score.title = tierName(entry.tier);
      card.append(trophy, player, score);
      archiveLeaderboardHall.appendChild(card);
    });
    archiveLeaderboardTable.innerHTML = "";
    appendArchiveLeaderboardRows(entries);
  };
  // 서버의 최근 랭크전 기록 API가 연결되면 이 배열에 최신순으로 넣는다.
  // 첫 줄은 UI 확인용 예시이고, 실제 기록은 그 아래 최대 3건까지 표시한다.
  const recentRankMatches: RecentRankMatch[] = [];
  const recentOnlineMatches: RecentRankMatch[] = [];
  const previewRankMatch: RecentRankMatch = {
    result: "win",
    deck: 1,
    opponent: "아르카나",
    ratingBefore: 1218,
    ratingChange: 18,
  };
  const previewOnlineMatch: RecentRankMatch = {
    result: "win",
    deck: 2,
    opponent: "노바",
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
      row.setAttribute("aria-label", "내 프로필 열기");
      const result = document.createElement("b");
      result.textContent = match.result === "win" ? "승" : "패";
      const detail = document.createElement("div");
      detail.className = "archive-recent-match-detail";
      const name = document.createElement("span");
      name.textContent = `덱 ${match.deck} · VS ${match.opponent}`;
      const before = document.createElement("small");
      const ratingAfter = match.ratingBefore + match.ratingChange;
      before.textContent = mode === "ranked" ? `${match.ratingBefore.toLocaleString()}점 → ${ratingAfter.toLocaleString()}점` : "일반 대전";
      detail.append(name, before);
      const change = document.createElement("em");
      change.textContent = mode === "ranked" ? `${match.ratingChange > 0 ? "+" : ""}${match.ratingChange}점` : "";
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
    const ids = ["STARTER_MANA", ...deckStore.list[rankDeckPreview].cards].slice(0, 9);
    [archiveLiveDeck, mobileLiveDeck].forEach((container, containerIndex) => {
      if (!container) return;
      container.innerHTML = "";
      ids.slice(0, container === mobileLiveDeck ? 5 : 9).forEach((id, index) => {
        const def = STARTERS[id] ?? DB[id];
        if (!def) return;
        const card: CardInst = { ...structuredClone(def), uid: `archive_deck_${containerIndex}_${index}_${id}` };
        const element = cardEl(card, { size: "mkt" });
        element.title = "카드 상세 보기";
        element.onclick = () => zoomCard(card);
        container.appendChild(element);
      });
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
      tab.textContent = `덱 ${index + 1}`;
      tab.setAttribute("aria-pressed", String(isPreview));
      tab.setAttribute("aria-label", `덱 ${index + 1}${isApplied ? ", 현재 적용된 덱" : ""}`);
      tab.onclick = () => {
        rankDeckPreview = index;
        renderArchiveRankDeck();
        renderArchiveLiveDeck();
      };
      archiveRankDeckTabs.appendChild(tab);
    }
    archiveRankDeckName.textContent = `덱 ${rankDeckPreview + 1}${rankDeckPreview === deckStore.sel ? " · 적용됨" : ""}`;
    const mobileDeckName = wrap.querySelector<HTMLElement>("#mobileDeckName");
    if (mobileDeckName) mobileDeckName.textContent = `덱 ${rankDeckPreview + 1}${rankDeckPreview === deckStore.sel ? " · 적용됨" : ""}`;
    if (archiveChangeDeck) {
      archiveChangeDeck.disabled = rankDeckPreview === deckStore.sel;
      archiveChangeDeck.setAttribute("aria-label", rankDeckPreview === deckStore.sel ? "현재 덱이 이미 적용되어 있습니다" : `덱 ${rankDeckPreview + 1}을 현재 덱으로 적용`);
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
      tab.textContent = `덱 ${index + 1}`;
      tab.setAttribute("aria-label", `덱 ${index + 1}${index === deckStore.sel ? ", 현재 적용된 덱" : ""}`);
      tab.onclick = () => { editingDeck = index; renderArchiveDeck(); };
      archiveDeckTabs.appendChild(tab);
    }
    archiveDeckCount.textContent = `${deck.length + 1} / ${DECK_SIZE + 1}`;
    // 덱 탭의 금색 구체가 적용 상태를 표시한다. 이 버튼은 적용 후에도
    // 같은 실행 버튼 모양을 유지해, 회색의 "적용됨" 상태로 고정되지 않는다.
    archiveDeckUse.textContent = "현재 덱 적용";
    archiveDeckUse.setAttribute("aria-label", `덱 ${editingDeck + 1}을 현재 덱으로 적용`);
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
      card.title = "덱에서 제거";
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
    if (archiveDeckMessage) archiveDeckMessage.textContent = "저장 중...";
    try {
      const result = await api.saveDecks(deckStore);
      Object.assign(deckStore, result.decks);
      if (app.user) { app.user.decks = result.decks; app.user.deck = result.deck; }
      if (archiveDeckMessage) archiveDeckMessage.textContent = "저장되었습니다.";
      renderArchiveDeck();
      renderArchiveLiveDeck();
    } catch (error) {
      if (archiveDeckMessage) archiveDeckMessage.textContent = (error as Error).message || "저장에 실��했습니다.";
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
    const forSale = SLEEVE_LIST.filter((sleeve) => sleeve.price > 0);
    if (!forSale.length) {
      archiveShopGrid.innerHTML = `<p class="archive-shop-empty">현재 판매 중인 상품이 없습니다.</p>`;
      return;
    }
    archiveShopGrid.innerHTML = forSale.map((sleeve) => {
      const owned = ownedSleeves.has(sleeve.id);
      return `<article class="archive-shop-item ${owned ? "is-owned" : ""}">
        <div class="archive-sleeve-preview" style="background-image:url('${sleeve.url}')"></div>
        <strong>${sleeveName(sleeve.id)}</strong>
        ${owned
          ? `<button disabled>보유 중</button>`
          : `<button data-buy-sleeve="${sleeve.id}">구매 <span>💎 ${sleeve.price}</span></button>`}
      </article>`;
    }).join("");
    archiveShopGrid.querySelectorAll<HTMLButtonElement>("[data-buy-sleeve]").forEach((button) => {
      button.onclick = () => {
        const id = button.dataset.buySleeve!;
        const sleeve = SLEEVES[id];
        if (!sleeve || shopCredits < sleeve.price) { alert("크리스탈이 부족합니다."); return; }
        if (!confirm(`${sleeveName(id)} 슬리브를 💎 ${sleeve.price}에 구매할까요?`)) return;
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
          alert((error as Error).message || "구매에 실패했습니다.");
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
    if (archiveCardCount) archiveCardCount.textContent = `${list.length}장`;
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

  addCardTypeFilter("all", "전체");
  addCardTypeFilter("mon", "몬스터");
  addCardTypeFilter("spell", "마법");
  addCardTypeFilter("trap", "함정");
  addCardTypeFilter("starter", "스타트카드");
  addCardCostFilter(-1, "코스트 전체");
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
      wrap.dataset.botDifficulty = button.dataset.difficulty ?? "normal";
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
      "덱을 완성해주세요",
      `현재 덱은 ${deckStore.list[editingDeck].cards.length + 1}/${DECK_SIZE + 1}장입니다. 다른 메뉴로 이동하기 전에 덱을 9장으로 완성해주세요.`,
      "확인",
      () => {},
    );
    return false;
  };

  const syncMobileMode = (mode: ArchiveMode): void => {
    if (!mobileArchiveHome) return;
    const copy = modeCopy[mode];
    mobileArchiveHome.dataset.mobileMode = mode;
    mobileModeButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.mobileMode === mode));
    const set = (id: string, value: string) => {
      const element = wrap.querySelector<HTMLElement>(`#${id}`);
      if (element) element.textContent = value;
    };
    const icon = wrap.querySelector<HTMLImageElement>("#mobileModeIcon");
    const emblem = wrap.querySelector<HTMLImageElement>("#mobileRankEmblem");
    const desktopEmblem = wrap.querySelector<HTMLImageElement>("#archiveSeasonRankEmblem");
    if (icon) icon.src = copy.icon;
    set("mobileModeTitle", mode === "ranked" ? "랭크전" : mode === "online" ? "일반전" : "봇전");
    set("mobileModeDescription", mode === "ranked"
      ? "승리로 기록을 새기고 더 높은 등급에 도전하세요."
      : mode === "online"
        ? "랭크 부담 없이 현재 덱의 전략을 시험하세요."
        : "다양한 난이도의 상대와 카드 조합을 연습하세요.");
    set("mobileStartLabel", copy.start);
    set("mobileRankEyebrow", mode === "ranked" ? "시즌 랭크" : mode === "online" ? "일반전 기록" : "BOT TRAINING");
    if (mode === "ranked") {
      if (emblem && desktopEmblem) {
        emblem.src = desktopEmblem.src;
        emblem.alt = desktopEmblem.alt;
      }
      set("mobileRankTier", wrap.querySelector<HTMLElement>("#archiveSeasonTier")?.textContent ?? "아이언");
      set("mobileRankPoints", (wrap.querySelector<HTMLElement>("#archiveSeasonPoints")?.textContent ?? "0").replace("점", ""));
      set("mobileRankPosition", wrap.querySelector<HTMLElement>("#archiveSeasonPosition")?.textContent ?? "-");
    } else {
      if (emblem) {
        emblem.src = copy.icon;
        emblem.alt = "";
      }
      set("mobileRankTier", mode === "online" ? "자유 대전" : "연습 대전");
      set("mobileRankPoints", mode === "online" ? "FREE" : "PRACTICE");
      set("mobileRankPosition", "-");
    }
    updateMatchRecord(mode);
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
      ranked: { icon: "/icons/menu_ranked.png", title: "랭크전", description: "랭크전은 온라인 유저들과 매칭될 수 있는 점수제 매칭입니다.<br>여러분만의 덱을 사용하여 타 유저들과의 결투에서 승리하고 등급을 올려보세요." },
      online: { icon: "/icons/menu_online.png", title: "일반전", description: "일반전은 랭크 점수 부담 없이 온라인 유저들과 자유롭게 대전하는 모드입니다.<br>여러분만의 덱을 시험하고 다양한 전략을 펼쳐보세요." },
      bot: { icon: "/icons/menu_bot.png", title: "봇전", description: "봇전은 다양한 난이도의 상대와 자유롭게 전략을 시험할 수 있는 연습 모드입니다.<br>현재 덱을 선택한 뒤 원하는 난이도에 도전해보세요." },
      deck: { icon: "/icons/menu_cards.png", title: "덱 빌딩", description: "보유한 카드로 자신만의 덱을 구성하고, 현재 사용할 덱을 선택하세요." },
      cards: { icon: "/icons/menu_cards.png", title: "카드", description: "수집한 모든 카드를 살펴보고, 유형과 코스트에 따라 원하는 카드를 찾아보세요." },
      shop: { icon: "/icons/menu_shop.png", title: "상점", description: "카드 슬리브를 구매해 여러분만의 전장을 꾸며보세요." },
      leaderboard: { icon: "/icons/menu_leaderboard.png", title: "리더보드", description: "이번 시즌 최고의 기록수집가들과 그들의 랭크를 확인하세요." },
    };
    const archiveHeader = archiveHeaderCopy[section];
    if (battleHeaderTitle) battleHeaderTitle.textContent = archiveHeader.title;
    if (battleHeaderDescription) battleHeaderDescription.innerHTML = archiveHeader.description;
    if (section === "ranked" || section === "online" || section === "bot") {
      const isOnline = section === "online";
      syncMobileMode(section);
      if (recentMatchesTitle) recentMatchesTitle.textContent = "최근 전적";
      if (matchStart) matchStart.innerHTML = "<span>게임</span><span>시작</span>";
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
    "준비 중입니다",
    "최대한 빠르게 구현해서 돌아오겠습니다. 조금만 기다려 주십시오.",
    "확인",
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
    else if (selectedSection === "bot") app.botGame();
  };
  mobileModeButtons.forEach((button) => {
    button.onclick = () => selectSection(button.dataset.mobileMode as ArchiveMode);
  });
  mobileDifficultyButtons.forEach((button) => {
    button.onclick = () => {
      wrap.dataset.botDifficulty = button.dataset.mobileDifficulty ?? "normal";
      mobileDifficultyButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    };
  });
  (wrap.querySelector("#archiveStart") as HTMLElement).onclick = startSelectedMode;
  (wrap.querySelector("#archiveMatchStart") as HTMLElement).onclick = startSelectedMode;
  (wrap.querySelector("#mobileMatchStart") as HTMLElement).onclick = startSelectedMode;
  if (archiveChangeDeck) archiveChangeDeck.onclick = () => applyArchiveDeck(rankDeckPreview);
  (wrap.querySelector("#deck") as HTMLElement).onclick = () => selectSection("deck");
  (wrap.querySelector("#archiveDeck") as HTMLElement).onclick = () => selectSection("deck");
  (wrap.querySelector("#lb") as HTMLElement).onclick = () => selectSection("leaderboard");
  (wrap.querySelector("#invite") as HTMLElement).onclick = showComingSoon;
  wrap.querySelectorAll<HTMLButtonElement>("[data-mobile-route]").forEach((button) => {
    button.onclick = () => {
      const route = button.dataset.mobileRoute;
      if (route === "profile") app.profile();
      else if (route === "friends") app.friends();
      else if (route === "settings") app.settings();
      else if (route === "deck") app.deck();
      else if (route === "cards") app.cards();
      else if (route === "leaderboard") app.leaderboard();
      else if (route === "shop") app.shop();
      else if (route === "tutorial" || route === "invite") showComingSoon();
    };
  });
  const friendsButton = wrap.querySelector<HTMLButtonElement>("#archiveFriendsButton");
  const friendsPanel = wrap.querySelector<HTMLElement>("#archiveFriendsPanel");
  const friendsClose = wrap.querySelector<HTMLButtonElement>("#archiveFriendsClose");
  const friendsList = wrap.querySelector<HTMLElement>("#archiveFriendsList");
  const renderFriendsPopup = (friends: FriendEntry[]): void => {
    if (!friendsList) return;
    friendsList.replaceChildren();
    if (!friends.length) {
      const empty = document.createElement("p");
      empty.textContent = "아직 등록된 친구가 없습니다.";
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
      state.textContent = friend.online ? (friend.state === "online" || friend.state === "bot" ? "게임 중" : "온라인") : "오프라인";
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
    if (friendsList) friendsList.innerHTML = "<p>친구 목록을 불러오는 중...</p>";
    void api.friends().then((data) => renderFriendsPopup(data.friends)).catch(() => {
      if (friendsList) friendsList.innerHTML = "<p>친구 목록을 불러오지 못했습니다.</p>";
    });
  };
  friendsButton?.addEventListener("click", () => setFriendsPanel(friendsPanel?.hidden ?? true));
  friendsClose?.addEventListener("click", () => setFriendsPanel(false));
  syncMobileMode("ranked");

  // current season tier badge (async, best-effort)
  void api.rankMe().then((r) => {
    const el = wrap.querySelector("#myTier");
    if (el && r) el.innerHTML = tierChipHtml(r.tier, r.mmr);
    renderArchiveSeasonRank(r);
  }).catch(() => { /* not logged in / offline */ });
  void api.leaderboard().then(({ season, entries }) => {
    if (entries.length) {
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
    const mobileBadge = wrap.querySelector("#mobileFriendBadge") as HTMLElement | null;
    [b, mobileBadge].forEach((badge) => {
      if (!badge) return;
      badge.hidden = n === 0;
      badge.textContent = n > 0 ? String(n) : "";
    });
  });

  const unsub = onLangChange(() => app.home());
  return { destroy: () => { unsub(); unwatch(); } };
}
