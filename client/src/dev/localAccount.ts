import { DECK_POOL, SLEEVES, type DeckStore, sanitizeDecks } from "../shared/cards";

const LOCAL_DECKS_KEY = "lore_local_dev_decks";
export const LOCAL_GUEST_KEY = "lore_local_guest_login";
const LOCAL_GUEST_PROFILE_KEY = "lore_local_guest_profile";

export interface LocalGuestProfile {
  credits: number;
  sleeves: string[];
  sleeve: string;
}

export function canUseLocalGuest(): boolean {
  return ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
}

function sampleDeck(offset: number): string[] {
  return Array.from({ length: 8 }, (_, index) => DECK_POOL[(offset + index) % DECK_POOL.length]);
}

function seededDecks(): DeckStore {
  return sanitizeDecks({
    sel: 0,
    list: [
      { cards: sampleDeck(0), watch: ["M1", "S1", "T1"] },
      { cards: sampleDeck(4), watch: ["M5", "S4", "T4"] },
      { cards: sampleDeck(8), watch: ["M9", "S8", "T8"] },
      { cards: sampleDeck(12), watch: ["M12", "S11", "T11"] },
      { cards: sampleDeck(16), watch: ["M13", "S13", "T13"] },
    ],
  });
}

export function loadLocalDevDecks(): DeckStore {
  try {
    const saved = localStorage.getItem(LOCAL_DECKS_KEY);
    if (saved) return sanitizeDecks(JSON.parse(saved));
  } catch { /* fall back to the local test profile */ }
  const decks = seededDecks();
  saveLocalDevDecks(decks);
  return decks;
}

export function loadLocalGuestProfile(): LocalGuestProfile {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_GUEST_PROFILE_KEY) || "null") as Partial<LocalGuestProfile> | null;
    if (saved && Number.isFinite(saved.credits) && Array.isArray(saved.sleeves)) {
      return { credits: Math.max(0, Math.floor(saved.credits!)), sleeves: [...new Set(["default", ...saved.sleeves])], sleeve: saved.sleeve || "prism" };
    }
  } catch { /* create a fresh local profile */ }
  const profile = { credits: 12, sleeves: ["default", "prism"], sleeve: "prism" };
  saveLocalGuestProfile(profile);
  return profile;
}

export function saveLocalGuestProfile(profile: LocalGuestProfile): LocalGuestProfile {
  const saved = { credits: Math.max(0, Math.floor(profile.credits)), sleeves: [...new Set(["default", ...profile.sleeves])], sleeve: profile.sleeve || "default" };
  localStorage.setItem(LOCAL_GUEST_PROFILE_KEY, JSON.stringify(saved));
  return saved;
}

export function buyLocalGuestSleeve(id: string): { credits: number; sleeves: string[] } {
  const sleeve = SLEEVES[id];
  if (!sleeve || sleeve.price <= 0) throw new Error("구매할 수 없는 상품입니다.");
  const profile = loadLocalGuestProfile();
  if (profile.sleeves.includes(id)) return { credits: profile.credits, sleeves: profile.sleeves };
  if (profile.credits < sleeve.price) throw new Error("크리스탈이 부족합니다.");
  profile.credits -= sleeve.price;
  profile.sleeves.push(id);
  const saved = saveLocalGuestProfile(profile);
  return { credits: saved.credits, sleeves: saved.sleeves };
}

export function saveLocalDevDecks(raw: unknown): DeckStore {
  const decks = sanitizeDecks(raw);
  localStorage.setItem(LOCAL_DECKS_KEY, JSON.stringify(decks));
  return decks;
}

export function isLocalDevAccount(): boolean {
  return canUseLocalGuest() && localStorage.getItem(LOCAL_GUEST_KEY) === "1";
}
